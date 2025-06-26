import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import secrets
import string

from models import User, UserRole, Note, Pet, Visit
from auth import get_password_hash

logger = logging.getLogger(__name__)

class TeamService:
    def __init__(self):
        pass
    
    def create_team_member(
        self,
        admin_user_id: int,
        member_data: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Create a new team member (admin only)"""
        try:
            # Verify admin has appropriate role
            admin = db.query(User).filter(User.id == admin_user_id).first()
            if not admin or admin.role not in [UserRole.ADMIN, UserRole.PRACTICE_OWNER]:
                return {"success": False, "error": "Insufficient permissions"}
            
            # Check if email already exists
            existing = db.query(User).filter(User.email == member_data["email"]).first()
            if existing:
                return {"success": False, "error": "Email already registered"}
            
            # Generate temporary password
            temp_password = self._generate_temp_password()
            
            # Create new user
            new_member = User(
                email=member_data["email"],
                hashed_password=get_password_hash(temp_password),
                full_name=member_data["full_name"],
                veterinary_license=member_data.get("veterinary_license"),
                role=UserRole(member_data.get("role", UserRole.VETERINARIAN.value)),
                is_active=True,
                team_id=admin.team_id  # Same team as admin
            )
            
            db.add(new_member)
            db.commit()
            db.refresh(new_member)
            
            return {
                "success": True,
                "member": {
                    "id": new_member.id,
                    "email": new_member.email,
                    "full_name": new_member.full_name,
                    "role": new_member.role.value,
                    "temp_password": temp_password  # Send this via email
                },
                "message": "Team member created successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to create team member: {str(e)}")
            db.rollback()
            return {"success": False, "error": str(e)}
    
    def get_team_members(
        self,
        user_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Get all team members for a user's team"""
        try:
            # Get user's team
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Get all members of the same team
            team_members = db.query(User).filter(
                User.team_id == user.team_id,
                User.is_active == True
            ).order_by(User.role, User.full_name).all()
            
            members_data = []
            for member in team_members:
                # Get member statistics
                notes_count = db.query(Note).filter(Note.user_id == member.id).count()
                patients_seen = db.query(Note).filter(
                    Note.user_id == member.id
                ).distinct(Note.patient_id).count()
                
                members_data.append({
                    "id": member.id,
                    "email": member.email,
                    "full_name": member.full_name,
                    "role": member.role.value,
                    "veterinary_license": member.veterinary_license,
                    "is_active": member.is_active,
                    "created_at": member.created_at.isoformat() if member.created_at else None,
                    "last_login": member.last_login.isoformat() if member.last_login else None,
                    "stats": {
                        "notes_created": notes_count,
                        "patients_seen": patients_seen
                    },
                    "is_current_user": member.id == user_id
                })
            
            # Get team statistics
            team_stats = {
                "total_members": len(team_members),
                "active_members": len([m for m in team_members if m.is_active]),
                "roles": {
                    UserRole.PRACTICE_OWNER.value: len([m for m in team_members if m.role == UserRole.PRACTICE_OWNER]),
                    UserRole.ADMIN.value: len([m for m in team_members if m.role == UserRole.ADMIN]),
                    UserRole.VETERINARIAN.value: len([m for m in team_members if m.role == UserRole.VETERINARIAN]),
                    UserRole.TECHNICIAN.value: len([m for m in team_members if m.role == UserRole.TECHNICIAN])
                }
            }
            
            return {
                "success": True,
                "members": members_data,
                "team_stats": team_stats,
                "current_user_role": user.role.value
            }
            
        except Exception as e:
            logger.error(f"Failed to get team members: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def update_team_member(
        self,
        admin_user_id: int,
        member_id: int,
        update_data: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Update team member information (admin only)"""
        try:
            # Verify admin permissions
            admin = db.query(User).filter(User.id == admin_user_id).first()
            if not admin or admin.role not in [UserRole.ADMIN, UserRole.PRACTICE_OWNER]:
                return {"success": False, "error": "Insufficient permissions"}
            
            # Get member
            member = db.query(User).filter(
                User.id == member_id,
                User.team_id == admin.team_id
            ).first()
            
            if not member:
                return {"success": False, "error": "Team member not found"}
            
            # Prevent downgrading practice owner if they're the only one
            if member.role == UserRole.PRACTICE_OWNER and update_data.get("role") != UserRole.PRACTICE_OWNER.value:
                owner_count = db.query(User).filter(
                    User.team_id == admin.team_id,
                    User.role == UserRole.PRACTICE_OWNER,
                    User.is_active == True
                ).count()
                
                if owner_count <= 1:
                    return {"success": False, "error": "Cannot remove the last practice owner"}
            
            # Update allowed fields
            if "full_name" in update_data:
                member.full_name = update_data["full_name"]
            if "veterinary_license" in update_data:
                member.veterinary_license = update_data["veterinary_license"]
            if "role" in update_data and admin.role == UserRole.PRACTICE_OWNER:
                member.role = UserRole(update_data["role"])
            if "is_active" in update_data:
                member.is_active = update_data["is_active"]
            
            member.updated_at = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "message": "Team member updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to update team member: {str(e)}")
            db.rollback()
            return {"success": False, "error": str(e)}
    
    def remove_team_member(
        self,
        admin_user_id: int,
        member_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Remove team member (deactivate, not delete)"""
        try:
            # Verify admin permissions
            admin = db.query(User).filter(User.id == admin_user_id).first()
            if not admin or admin.role not in [UserRole.ADMIN, UserRole.PRACTICE_OWNER]:
                return {"success": False, "error": "Insufficient permissions"}
            
            # Prevent self-removal
            if admin_user_id == member_id:
                return {"success": False, "error": "Cannot remove yourself"}
            
            # Get member
            member = db.query(User).filter(
                User.id == member_id,
                User.team_id == admin.team_id
            ).first()
            
            if not member:
                return {"success": False, "error": "Team member not found"}
            
            # Deactivate member
            member.is_active = False
            member.updated_at = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "message": "Team member removed successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to remove team member: {str(e)}")
            db.rollback()
            return {"success": False, "error": str(e)}
    
    def get_team_activity(
        self,
        user_id: int,
        db: Session,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get recent team activity"""
        try:
            # Get user's team
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Get team members
            team_members = db.query(User).filter(
                User.team_id == user.team_id,
                User.is_active == True
            ).all()
            
            team_member_ids = [m.id for m in team_members]
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Get recent notes
            recent_notes = db.query(Note).filter(
                Note.user_id.in_(team_member_ids),
                Note.created_at >= cutoff_date
            ).order_by(Note.created_at.desc()).limit(50).all()
            
            # Get recent visits
            recent_visits = db.query(Visit).filter(
                Visit.veterinarian_id.in_(team_member_ids),
                Visit.created_at >= cutoff_date
            ).order_by(Visit.created_at.desc()).limit(50).all()
            
            # Format activity
            activity = []
            
            for note in recent_notes:
                author = next((m for m in team_members if m.id == note.user_id), None)
                if author and note.patient:
                    activity.append({
                        "type": "note",
                        "id": note.id,
                        "timestamp": note.created_at.isoformat(),
                        "author": author.full_name,
                        "author_id": author.id,
                        "description": f"Created note for {note.patient.name}",
                        "patient_name": note.patient.name,
                        "patient_id": note.patient_id
                    })
            
            for visit in recent_visits:
                vet = next((m for m in team_members if m.id == visit.veterinarian_id), None)
                if vet and visit.pet:
                    activity.append({
                        "type": "visit",
                        "id": visit.id,
                        "timestamp": visit.created_at.isoformat(),
                        "author": vet.full_name,
                        "author_id": vet.id,
                        "description": f"Completed visit for {visit.pet.name}",
                        "patient_name": visit.pet.name,
                        "patient_id": visit.pet_id
                    })
            
            # Sort by timestamp
            activity.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return {
                "success": True,
                "activity": activity[:50],  # Limit to 50 most recent
                "team_size": len(team_members)
            }
            
        except Exception as e:
            logger.error(f"Failed to get team activity: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _generate_temp_password(self, length: int = 12) -> str:
        """Generate a secure temporary password"""
        characters = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(characters) for _ in range(length))

# Global instance
team_service = TeamService()