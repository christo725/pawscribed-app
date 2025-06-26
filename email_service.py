import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from models import Note, Pet, Owner, User

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.from_name = os.getenv('FROM_NAME', 'Pawscribed Veterinary System')
    
    async def send_note_pdf(
        self,
        note_id: int,
        pdf_data: bytes,
        pdf_filename: str,
        recipient_email: str,
        recipient_name: str,
        db: Session,
        custom_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a SOAP note PDF via email"""
        try:
            # Get note and patient information
            note = db.query(Note).filter(Note.id == note_id).first()
            if not note:
                return {"success": False, "error": "Note not found"}
            
            patient = db.query(Pet).filter(Pet.id == note.patient_id).first()
            owner = db.query(Owner).filter(Owner.id == patient.owner_id).first() if patient else None
            user = db.query(User).filter(User.id == note.user_id).first()
            
            # Create email
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = recipient_email
            msg['Subject'] = f"Veterinary Report for {patient.name if patient else 'Patient'}"
            
            # Email body
            if custom_message:
                body = custom_message
            else:
                body = self._create_default_email_body(note, patient, owner, user)
            
            msg.attach(MIMEText(body, 'html'))
            
            # Attach PDF
            pdf_attachment = MIMEApplication(pdf_data, _subtype='pdf')
            pdf_attachment.add_header(
                'Content-Disposition', 
                'attachment', 
                filename=pdf_filename
            )
            msg.attach(pdf_attachment)
            
            # Send email
            if not self.smtp_username or not self.smtp_password:
                logger.warning("SMTP credentials not configured, simulating email send")
                return {
                    "success": True,
                    "message": "Email simulated (SMTP not configured)",
                    "recipient": recipient_email,
                    "subject": msg['Subject']
                }
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {recipient_email} for note {note_id}")
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "recipient": recipient_email,
                "subject": msg['Subject'],
                "sent_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Email sending failed for note {note_id}: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def send_batch_notes(
        self,
        note_ids: List[int],
        pdf_files: List[Dict[str, Any]],
        recipient_email: str,
        recipient_name: str,
        db: Session,
        custom_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send multiple SOAP notes in a single email"""
        try:
            # Get patient names for subject
            patient_names = []
            for note_id in note_ids:
                note = db.query(Note).filter(Note.id == note_id).first()
                if note:
                    patient = db.query(Pet).filter(Pet.id == note.patient_id).first()
                    if patient:
                        patient_names.append(patient.name)
            
            # Create email
            msg = MIMEMultipart()
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = recipient_email
            
            if len(patient_names) == 1:
                msg['Subject'] = f"Veterinary Reports for {patient_names[0]}"
            else:
                msg['Subject'] = f"Veterinary Reports for {len(patient_names)} Patients"
            
            # Email body
            if custom_message:
                body = custom_message
            else:
                body = self._create_batch_email_body(patient_names, len(note_ids))
            
            msg.attach(MIMEText(body, 'html'))
            
            # Attach all PDFs
            for pdf_file in pdf_files:
                if pdf_file.get('pdf_data'):
                    pdf_attachment = MIMEApplication(pdf_file['pdf_data'], _subtype='pdf')
                    pdf_attachment.add_header(
                        'Content-Disposition', 
                        'attachment', 
                        filename=pdf_file.get('pdf_filename', 'report.pdf')
                    )
                    msg.attach(pdf_attachment)
            
            # Send email
            if not self.smtp_username or not self.smtp_password:
                logger.warning("SMTP credentials not configured, simulating batch email send")
                return {
                    "success": True,
                    "message": "Batch email simulated (SMTP not configured)",
                    "recipient": recipient_email,
                    "subject": msg['Subject'],
                    "attachments_count": len(pdf_files)
                }
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Batch email sent successfully to {recipient_email} with {len(pdf_files)} attachments")
            
            return {
                "success": True,
                "message": "Batch email sent successfully",
                "recipient": recipient_email,
                "subject": msg['Subject'],
                "attachments_count": len(pdf_files),
                "sent_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Batch email sending failed: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _create_default_email_body(
        self, 
        note: Note, 
        patient: Optional[Pet], 
        owner: Optional[Owner], 
        user: Optional[User]
    ) -> str:
        """Create default email body for single note"""
        patient_name = patient.name if patient else "Patient"
        vet_name = user.full_name if user else "Veterinarian"
        clinic_name = os.getenv('CLINIC_NAME', 'Veterinary Clinic')
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    Veterinary Report for {patient_name}
                </h2>
                
                <p>Dear {owner.first_name if owner else 'Pet Owner'},</p>
                
                <p>Please find attached the veterinary report for <strong>{patient_name}</strong> 
                from your recent visit on {note.created_at.strftime('%B %d, %Y')}.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">Visit Summary:</h3>
                    <ul style="margin-bottom: 0;">
                        <li><strong>Date:</strong> {note.created_at.strftime('%B %d, %Y')}</li>
                        <li><strong>Veterinarian:</strong> {vet_name}</li>
                        <li><strong>Note Type:</strong> {note.note_type.replace('_', ' ').title()}</li>
                    </ul>
                </div>
                
                <p>The attached PDF contains the complete SOAP note with examination findings, 
                assessment, and treatment plan. Please review it carefully and contact us if you 
                have any questions.</p>
                
                <p>If you need to schedule a follow-up appointment or have any concerns about 
                {patient_name}'s care, please don't hesitate to contact our clinic.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="margin-bottom: 5px;"><strong>{clinic_name}</strong></p>
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        This email was generated by Pawscribed Veterinary System<br/>
                        Please keep this report for your records.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_batch_email_body(self, patient_names: List[str], notes_count: int) -> str:
        """Create email body for batch notes"""
        clinic_name = os.getenv('CLINIC_NAME', 'Veterinary Clinic')
        
        if len(patient_names) == 1:
            patients_text = patient_names[0]
        elif len(patient_names) <= 3:
            patients_text = ", ".join(patient_names[:-1]) + f" and {patient_names[-1]}"
        else:
            patients_text = f"{len(patient_names)} patients"
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                    Veterinary Reports for {patients_text}
                </h2>
                
                <p>Dear Pet Owner,</p>
                
                <p>Please find attached {notes_count} veterinary report{'s' if notes_count > 1 else ''} 
                for your recent visit{'s' if notes_count > 1 else ''}.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">Attached Reports:</h3>
                    <ul style="margin-bottom: 0;">
                        <li><strong>Number of Reports:</strong> {notes_count}</li>
                        <li><strong>Generated:</strong> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</li>
                    </ul>
                </div>
                
                <p>Each attached PDF contains a complete SOAP note with examination findings, 
                assessment, and treatment plan. Please review them carefully and contact us if you 
                have any questions.</p>
                
                <p>If you need to schedule follow-up appointments or have any concerns about 
                your pet's care, please don't hesitate to contact our clinic.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="margin-bottom: 5px;"><strong>{clinic_name}</strong></p>
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        This email was generated by Pawscribed Veterinary System<br/>
                        Please keep these reports for your records.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def test_connection(self) -> Dict[str, Any]:
        """Test SMTP connection"""
        try:
            if not self.smtp_username or not self.smtp_password:
                return {
                    "success": False,
                    "error": "SMTP credentials not configured",
                    "configured": False
                }
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
            
            return {
                "success": True,
                "message": "SMTP connection successful",
                "configured": True,
                "server": self.smtp_server,
                "port": self.smtp_port
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "configured": True
            }

# Global instance
email_service = EmailService()