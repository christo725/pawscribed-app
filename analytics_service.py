import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from models import Note, NoteStatus, Pet, User, ExportHistory, ExportType, TranscriptionJob, SOAPSection

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self):
        pass
    
    async def get_workflow_analytics(
        self,
        user_id: int,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get comprehensive workflow analytics"""
        try:
            # Default to last 30 days if no dates provided
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            analytics = {
                "overview": await self._get_overview_metrics(user_id, db, start_date, end_date),
                "workflow_distribution": await self._get_workflow_distribution(user_id, db, start_date, end_date),
                "productivity_trends": await self._get_productivity_trends(user_id, db, start_date, end_date),
                "completion_times": await self._get_completion_times(user_id, db, start_date, end_date),
                "export_activity": await self._get_export_activity(user_id, db, start_date, end_date),
                "patient_insights": await self._get_patient_insights(user_id, db, start_date, end_date),
                "quality_metrics": await self._get_quality_metrics(user_id, db, start_date, end_date),
                "date_range": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
            }
            
            return {"success": True, "analytics": analytics}
            
        except Exception as e:
            logger.error(f"Analytics generation failed: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _get_overview_metrics(
        self,
        user_id: int,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get high-level overview metrics"""
        
        # Total notes in date range
        total_notes = db.query(Note).filter(
            Note.user_id == user_id,
            Note.created_at >= start_date,
            Note.created_at <= end_date
        ).count()
        
        # Notes by status
        status_counts = {}
        for status in NoteStatus:
            count = db.query(Note).filter(
                Note.user_id == user_id,
                Note.status == status,
                Note.created_at >= start_date,
                Note.created_at <= end_date
            ).count()
            status_counts[status.value] = count
        
        # Completed notes (exported)
        completed_notes = status_counts.get("exported", 0)
        completion_rate = (completed_notes / total_notes * 100) if total_notes > 0 else 0
        
        # Average notes per day
        days_in_range = (end_date - start_date).days + 1
        avg_notes_per_day = total_notes / days_in_range if days_in_range > 0 else 0
        
        # Export activity
        total_exports = db.query(ExportHistory).filter(
            ExportHistory.user_id == user_id,
            ExportHistory.created_at >= start_date,
            ExportHistory.created_at <= end_date
        ).count()
        
        return {
            "total_notes": total_notes,
            "completed_notes": completed_notes,
            "completion_rate": round(completion_rate, 1),
            "avg_notes_per_day": round(avg_notes_per_day, 1),
            "total_exports": total_exports,
            "status_distribution": status_counts
        }
    
    async def _get_workflow_distribution(
        self,
        user_id: int,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get distribution of notes across workflow stages"""
        
        # Current distribution (all notes, not just date range)
        current_distribution = {}
        for status in NoteStatus:
            count = db.query(Note).filter(
                Note.user_id == user_id,
                Note.status == status
            ).count()
            current_distribution[status.value] = count
        
        # Historical flow (notes that moved through stages in date range)
        flow_data = []
        for status in NoteStatus:
            count = db.query(Note).filter(
                Note.user_id == user_id,
                Note.status == status,
                Note.updated_at >= start_date,
                Note.updated_at <= end_date
            ).count()
            flow_data.append({
                "stage": status.value.replace("_", " ").title(),
                "count": count
            })
        
        return {
            "current_distribution": current_distribution,
            "workflow_flow": flow_data
        }
    
    async def _get_productivity_trends(
        self,
        user_id: int,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get productivity trends over time"""
        
        # Daily note creation
        daily_notes = []
        current_date = start_date.date()
        end_date_only = end_date.date()
        
        while current_date <= end_date_only:
            day_start = datetime.combine(current_date, datetime.min.time())
            day_end = datetime.combine(current_date, datetime.max.time())
            
            notes_count = db.query(Note).filter(
                Note.user_id == user_id,
                Note.created_at >= day_start,
                Note.created_at <= day_end
            ).count()
            
            exports_count = db.query(ExportHistory).filter(
                ExportHistory.user_id == user_id,
                ExportHistory.created_at >= day_start,
                ExportHistory.created_at <= day_end
            ).count()
            
            daily_notes.append({
                "date": current_date.isoformat(),
                "notes_created": notes_count,
                "exports": exports_count
            })
            
            current_date += timedelta(days=1)
        
        # Weekly summary
        weekly_avg = sum(day["notes_created"] for day in daily_notes) / len(daily_notes) if daily_notes else 0
        
        return {
            "daily_trends": daily_notes,
            "weekly_average": round(weekly_avg, 1)
        }
    
    async def _get_completion_times(
        self,
        user_id: int,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get average completion times for workflow stages"""
        
        # Get notes that were completed in the date range
        completed_notes = db.query(Note).filter(
            Note.user_id == user_id,
            Note.status == NoteStatus.EXPORTED,
            Note.exported_at >= start_date,
            Note.exported_at <= end_date,
            Note.exported_at.isnot(None)
        ).all()
        
        if not completed_notes:
            return {
                "avg_total_time": 0,
                "avg_time_by_stage": {},
                "completion_distribution": []
            }
        
        # Calculate average total completion time
        total_times = []
        for note in completed_notes:
            if note.exported_at and note.created_at:
                total_time = (note.exported_at - note.created_at).total_seconds() / 3600  # hours
                total_times.append(total_time)
        
        avg_total_time = sum(total_times) / len(total_times) if total_times else 0
        
        # Completion time distribution
        completion_distribution = []
        time_buckets = [
            ("< 1 hour", 0, 1),
            ("1-4 hours", 1, 4),
            ("4-24 hours", 4, 24),
            ("1-3 days", 24, 72),
            ("> 3 days", 72, float('inf'))
        ]
        
        for bucket_name, min_hours, max_hours in time_buckets:
            count = sum(1 for time in total_times if min_hours <= time < max_hours)
            completion_distribution.append({
                "range": bucket_name,
                "count": count,
                "percentage": round(count / len(total_times) * 100, 1) if total_times else 0
            })
        
        return {
            "avg_total_time": round(avg_total_time, 1),
            "total_completed": len(completed_notes),
            "completion_distribution": completion_distribution
        }
    
    async def _get_export_activity(
        self,
        user_id: int,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get export activity metrics"""
        
        # Export types distribution
        export_types = {}
        for export_type in ExportType:
            count = db.query(ExportHistory).filter(
                ExportHistory.user_id == user_id,
                ExportHistory.export_type == export_type,
                ExportHistory.created_at >= start_date,
                ExportHistory.created_at <= end_date
            ).count()
            export_types[export_type.value] = count
        
        # Success rate
        total_exports = db.query(ExportHistory).filter(
            ExportHistory.user_id == user_id,
            ExportHistory.created_at >= start_date,
            ExportHistory.created_at <= end_date
        ).count()
        
        successful_exports = db.query(ExportHistory).filter(
            ExportHistory.user_id == user_id,
            ExportHistory.created_at >= start_date,
            ExportHistory.created_at <= end_date,
            ExportHistory.completed_at.isnot(None)
        ).count()
        
        success_rate = (successful_exports / total_exports * 100) if total_exports > 0 else 0
        
        # Most common recipients (for email exports)
        top_recipients = db.query(
            ExportHistory.recipient_email,
            func.count(ExportHistory.id).label('count')
        ).filter(
            ExportHistory.user_id == user_id,
            ExportHistory.export_type == ExportType.EMAIL,
            ExportHistory.created_at >= start_date,
            ExportHistory.created_at <= end_date,
            ExportHistory.recipient_email.isnot(None)
        ).group_by(ExportHistory.recipient_email).order_by(
            func.count(ExportHistory.id).desc()
        ).limit(5).all()
        
        return {
            "total_exports": total_exports,
            "success_rate": round(success_rate, 1),
            "export_types": export_types,
            "top_recipients": [
                {"email": email, "count": count} 
                for email, count in top_recipients
            ]
        }
    
    async def _get_patient_insights(
        self,
        user_id: int,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get patient-related insights"""
        
        # Most documented patients
        top_patients = db.query(
            Pet.name,
            Pet.species,
            func.count(Note.id).label('note_count')
        ).join(Note, Pet.id == Note.patient_id).filter(
            Note.user_id == user_id,
            Note.created_at >= start_date,
            Note.created_at <= end_date
        ).group_by(Pet.id, Pet.name, Pet.species).order_by(
            func.count(Note.id).desc()
        ).limit(5).all()
        
        # Species distribution
        species_distribution = db.query(
            Pet.species,
            func.count(Note.id).label('note_count')
        ).join(Note, Pet.id == Note.patient_id).filter(
            Note.user_id == user_id,
            Note.created_at >= start_date,
            Note.created_at <= end_date
        ).group_by(Pet.species).order_by(
            func.count(Note.id).desc()
        ).all()
        
        # Note types distribution
        note_types = db.query(
            Note.note_type,
            func.count(Note.id).label('count')
        ).filter(
            Note.user_id == user_id,
            Note.created_at >= start_date,
            Note.created_at <= end_date
        ).group_by(Note.note_type).order_by(
            func.count(Note.id).desc()
        ).all()
        
        return {
            "top_patients": [
                {
                    "name": name,
                    "species": species,
                    "note_count": count
                }
                for name, species, count in top_patients
            ],
            "species_distribution": [
                {"species": species, "count": count}
                for species, count in species_distribution
            ],
            "note_types": [
                {"type": note_type.replace("_", " ").title(), "count": count}
                for note_type, count in note_types
            ]
        }
    
    async def _get_quality_metrics(
        self,
        user_id: int,
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get quality and completeness metrics"""
        
        # Get transcription jobs for the user's notes
        transcription_stats = db.query(
            func.avg(TranscriptionJob.confidence_score).label('avg_confidence'),
            func.count(TranscriptionJob.id).label('total_transcriptions')
        ).join(Note, TranscriptionJob.id == Note.transcription_job_id).filter(
            Note.user_id == user_id,
            Note.created_at >= start_date,
            Note.created_at <= end_date,
            TranscriptionJob.confidence_score.isnot(None)
        ).first()
        
        avg_confidence = transcription_stats.avg_confidence or 0
        total_transcriptions = transcription_stats.total_transcriptions or 0
        
        # SOAP section completeness
        notes_with_sections = db.query(Note).filter(
            Note.user_id == user_id,
            Note.created_at >= start_date,
            Note.created_at <= end_date
        ).all()
        
        section_completeness = []
        for section_type in ["subjective", "objective", "assessment", "plan"]:
            notes_with_section = db.query(Note).join(SOAPSection).filter(
                Note.user_id == user_id,
                Note.created_at >= start_date,
                Note.created_at <= end_date,
                SOAPSection.section_type == section_type
            ).count()
            
            completeness_rate = (notes_with_section / len(notes_with_sections) * 100) if notes_with_sections else 0
            
            section_completeness.append({
                "section": section_type.title(),
                "completion_rate": round(completeness_rate, 1)
            })
        
        return {
            "avg_transcription_confidence": round(avg_confidence * 100, 1) if avg_confidence else 0,
            "total_transcriptions": total_transcriptions,
            "section_completeness": section_completeness,
            "total_notes_analyzed": len(notes_with_sections)
        }
    
    async def get_performance_summary(
        self,
        user_id: int,
        db: Session,
        period: str = "week"  # week, month, quarter
    ) -> Dict[str, Any]:
        """Get performance summary for different time periods"""
        try:
            now = datetime.utcnow()
            
            if period == "week":
                start_date = now - timedelta(days=7)
                prev_start = start_date - timedelta(days=7)
            elif period == "month":
                start_date = now - timedelta(days=30)
                prev_start = start_date - timedelta(days=30)
            elif period == "quarter":
                start_date = now - timedelta(days=90)
                prev_start = start_date - timedelta(days=90)
            else:
                start_date = now - timedelta(days=7)
                prev_start = start_date - timedelta(days=7)
            
            # Current period metrics
            current_metrics = await self._get_overview_metrics(user_id, db, start_date, now)
            
            # Previous period metrics for comparison
            prev_metrics = await self._get_overview_metrics(user_id, db, prev_start, start_date)
            
            # Calculate percentage changes
            def calc_change(current, previous):
                if previous == 0:
                    return 100 if current > 0 else 0
                return round((current - previous) / previous * 100, 1)
            
            changes = {
                "notes_change": calc_change(current_metrics["total_notes"], prev_metrics["total_notes"]),
                "completion_rate_change": calc_change(current_metrics["completion_rate"], prev_metrics["completion_rate"]),
                "exports_change": calc_change(current_metrics["total_exports"], prev_metrics["total_exports"])
            }
            
            return {
                "success": True,
                "period": period,
                "current_metrics": current_metrics,
                "previous_metrics": prev_metrics,
                "changes": changes
            }
            
        except Exception as e:
            logger.error(f"Performance summary failed: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}

# Global instance
analytics_service = AnalyticsService()