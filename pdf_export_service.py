import io
import os
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from sqlalchemy.orm import Session

from models import Note, SOAPSection, Pet, Owner, User

logger = logging.getLogger(__name__)

class PDFExportService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom PDF styles"""
        # Header style
        self.styles.add(ParagraphStyle(
            name='VetHeader',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2563eb')  # Blue color
        ))
        
        # Clinic info style
        self.styles.add(ParagraphStyle(
            name='ClinicInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#6b7280')  # Gray color
        ))
        
        # SOAP section header
        self.styles.add(ParagraphStyle(
            name='SOAPHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            spaceBefore=15,
            textColor=colors.HexColor('#1f2937'),  # Dark gray
            backColor=colors.HexColor('#f3f4f6'),  # Light gray background
            leftIndent=10,
            rightIndent=10,
            borderWidth=1,
            borderColor=colors.HexColor('#d1d5db')
        ))
        
        # Patient info style
        self.styles.add(ParagraphStyle(
            name='PatientInfo',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=5,
            leftIndent=10
        ))
        
        # Content style
        self.styles.add(ParagraphStyle(
            name='SOAPContent',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=10,
            leftIndent=15,
            rightIndent=15,
            leading=14
        ))
        
        # Footer style
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#9ca3af')
        ))
    
    async def generate_note_pdf(
        self,
        note_id: int,
        db: Session,
        clinic_info: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Generate PDF for a single SOAP note"""
        try:
            # Get note with all sections
            note = db.query(Note).filter(Note.id == note_id).first()
            if not note:
                return {"success": False, "error": "Note not found"}
            
            # Get patient and owner info
            patient = db.query(Pet).filter(Pet.id == note.patient_id).first()
            owner = db.query(Owner).filter(Owner.id == patient.owner_id).first() if patient else None
            user = db.query(User).filter(User.id == note.user_id).first()
            
            # Get SOAP sections
            sections = db.query(SOAPSection).filter(
                SOAPSection.note_id == note_id
            ).order_by(SOAPSection.order_index).all()
            
            # Generate PDF
            pdf_buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                pdf_buffer,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Build PDF content
            story = []
            
            # Header
            story.append(Paragraph("Pawscribed Veterinary SOAP Note", self.styles['VetHeader']))
            
            # Clinic information
            if clinic_info:
                clinic_text = f"""
                {clinic_info.get('name', 'Veterinary Clinic')}<br/>
                {clinic_info.get('address', '')}<br/>
                {clinic_info.get('phone', '')} | {clinic_info.get('email', '')}
                """
                story.append(Paragraph(clinic_text, self.styles['ClinicInfo']))
            
            story.append(Spacer(1, 20))
            
            # Patient and visit information
            patient_data = [
                ['Patient Information', 'Visit Information'],
                [
                    f"<b>Name:</b> {patient.name if patient else 'Unknown'}<br/>"
                    f"<b>Species:</b> {patient.species if patient else 'Unknown'}<br/>"
                    f"<b>Breed:</b> {patient.breed or 'Unknown'}<br/>"
                    f"<b>Age:</b> {patient.age or 'Unknown'} years<br/>"
                    f"<b>Sex:</b> {patient.sex or 'Unknown'}<br/>"
                    f"<b>Weight:</b> {patient.weight or 'Unknown'} lbs",
                    
                    f"<b>Date:</b> {note.created_at.strftime('%B %d, %Y')}<br/>"
                    f"<b>Time:</b> {note.created_at.strftime('%I:%M %p')}<br/>"
                    f"<b>Veterinarian:</b> {user.full_name if user else 'Unknown'}<br/>"
                    f"<b>Note Type:</b> {note.note_type.replace('_', ' ').title()}<br/>"
                    f"<b>Status:</b> {note.status.value.replace('_', ' ').title()}"
                ]
            ]
            
            if owner:
                patient_data[1][0] += f"<br/><b>Owner:</b> {owner.first_name} {owner.last_name}"
                if owner.phone:
                    patient_data[1][0] += f"<br/><b>Phone:</b> {owner.phone}"
            
            patient_table = Table(patient_data, colWidths=[3*inch, 3*inch])
            patient_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            story.append(patient_table)
            story.append(Spacer(1, 20))
            
            # SOAP sections
            for section in sections:
                # Section header
                section_title = section.section_type.upper().replace('_', ' ')
                story.append(Paragraph(section_title, self.styles['SOAPHeader']))
                
                # Section content
                content = section.content.replace('\n', '<br/>')
                story.append(Paragraph(content, self.styles['SOAPContent']))
                
                # Add vitals if this is objective section and vitals exist
                if section.section_type == 'objective' and any([
                    section.temperature, section.heart_rate, 
                    section.respiratory_rate, section.weight
                ]):
                    vitals_data = [['Vital Signs', '']]
                    
                    if section.temperature:
                        vitals_data.append(['Temperature:', f"{section.temperature}°F"])
                    if section.heart_rate:
                        vitals_data.append(['Heart Rate:', f"{section.heart_rate} bpm"])
                    if section.respiratory_rate:
                        vitals_data.append(['Respiratory Rate:', f"{section.respiratory_rate} rpm"])
                    if section.weight:
                        vitals_data.append(['Weight:', f"{section.weight} lbs"])
                    
                    vitals_table = Table(vitals_data, colWidths=[1.5*inch, 1.5*inch])
                    vitals_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#93c5fd')),
                    ]))
                    
                    story.append(Spacer(1, 10))
                    story.append(vitals_table)
                
                story.append(Spacer(1, 10))
            
            # Footer
            story.append(Spacer(1, 30))
            footer_text = f"""
            Generated by Pawscribed on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
            This document contains confidential veterinary medical information.
            """
            story.append(Paragraph(footer_text, self.styles['Footer']))
            
            # Build PDF
            doc.build(story)
            
            # Get PDF data
            pdf_data = pdf_buffer.getvalue()
            pdf_buffer.close()
            
            # Save to file
            pdf_filename = f"soap_note_{note.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_dir = "exports/pdf"
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_path = os.path.join(pdf_dir, pdf_filename)
            
            with open(pdf_path, 'wb') as f:
                f.write(pdf_data)
            
            logger.info(f"Generated PDF for note {note_id}: {pdf_path}")
            
            return {
                "success": True,
                "pdf_filename": pdf_filename,
                "pdf_path": pdf_path,
                "pdf_data": pdf_data,
                "file_size": len(pdf_data)
            }
            
        except Exception as e:
            logger.error(f"PDF generation failed for note {note_id}: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def generate_batch_pdf(
        self,
        note_ids: List[int],
        db: Session,
        clinic_info: Optional[Dict[str, str]] = None,
        combine_notes: bool = True
    ) -> Dict[str, Any]:
        """Generate PDF for multiple notes (combined or separate)"""
        try:
            if combine_notes:
                return await self._generate_combined_pdf(note_ids, db, clinic_info)
            else:
                return await self._generate_separate_pdfs(note_ids, db, clinic_info)
                
        except Exception as e:
            logger.error(f"Batch PDF generation failed: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _generate_combined_pdf(
        self,
        note_ids: List[int],
        db: Session,
        clinic_info: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Generate a single PDF with multiple notes"""
        try:
            pdf_buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                pdf_buffer,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            story = []
            
            # Main header
            story.append(Paragraph("Pawscribed Veterinary SOAP Notes", self.styles['VetHeader']))
            
            if clinic_info:
                clinic_text = f"""
                {clinic_info.get('name', 'Veterinary Clinic')}<br/>
                {clinic_info.get('address', '')}<br/>
                {clinic_info.get('phone', '')} | {clinic_info.get('email', '')}
                """
                story.append(Paragraph(clinic_text, self.styles['ClinicInfo']))
            
            story.append(Spacer(1, 20))
            
            # Generate each note
            for i, note_id in enumerate(note_ids):
                if i > 0:
                    story.append(PageBreak())
                
                # Generate individual note content
                note_result = await self.generate_note_pdf(note_id, db, clinic_info)
                if not note_result["success"]:
                    continue
                
                # Add note content to combined PDF (this is a simplified approach)
                # In a real implementation, you'd extract the story elements
                story.append(Paragraph(f"SOAP Note #{note_id}", self.styles['SOAPHeader']))
            
            # Build combined PDF
            doc.build(story)
            
            pdf_data = pdf_buffer.getvalue()
            pdf_buffer.close()
            
            # Save combined PDF
            pdf_filename = f"combined_soap_notes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_dir = "exports/pdf"
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_path = os.path.join(pdf_dir, pdf_filename)
            
            with open(pdf_path, 'wb') as f:
                f.write(pdf_data)
            
            return {
                "success": True,
                "pdf_filename": pdf_filename,
                "pdf_path": pdf_path,
                "pdf_data": pdf_data,
                "file_size": len(pdf_data),
                "notes_count": len(note_ids)
            }
            
        except Exception as e:
            logger.error(f"Combined PDF generation failed: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _generate_separate_pdfs(
        self,
        note_ids: List[int],
        db: Session,
        clinic_info: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Generate separate PDFs for each note"""
        results = []
        
        for note_id in note_ids:
            result = await self.generate_note_pdf(note_id, db, clinic_info)
            results.append({
                "note_id": note_id,
                "success": result["success"],
                "pdf_filename": result.get("pdf_filename"),
                "error": result.get("error")
            })
        
        successful_exports = [r for r in results if r["success"]]
        
        return {
            "success": len(successful_exports) > 0,
            "total_notes": len(note_ids),
            "successful_exports": len(successful_exports),
            "failed_exports": len(note_ids) - len(successful_exports),
            "results": results
        }

# Global instance
pdf_export_service = PDFExportService()