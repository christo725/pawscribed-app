import json
import re
import logging
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from models import Note, SOAPSection, Pet, TranscriptionJob, NoteStatus, Template
from gemini_service import GeminiService
from template_service import template_service

logger = logging.getLogger(__name__)

class SOAPGenerationService:
    def __init__(self):
        self.gemini_service = GeminiService()
    
    async def generate_soap_from_transcription(
        self,
        transcription_job_id: int,
        patient_id: int,
        template_type: str,
        user_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Generate a complete SOAP note from a transcription job"""
        try:
            # Get transcription job
            transcription_job = db.query(TranscriptionJob).filter(
                TranscriptionJob.id == transcription_job_id
            ).first()
            
            if not transcription_job:
                return {"success": False, "error": "Transcription job not found"}
            
            if transcription_job.status != "completed":
                return {"success": False, "error": "Transcription not completed yet"}
            
            # Get patient information
            patient = db.query(Pet).filter(Pet.id == patient_id).first()
            if not patient:
                return {"success": False, "error": "Patient not found"}
            
            # Get template
            template = template_service.get_template(template_type)
            if not template:
                return {"success": False, "error": f"Template '{template_type}' not found"}
            
            logger.info(f"Generating SOAP note for patient {patient.name} using template {template_type}")
            
            # Prepare context for AI generation
            context = {
                "transcript": transcription_job.transcript,
                "patient": {
                    "name": patient.name,
                    "species": patient.species,
                    "breed": patient.breed,
                    "age": patient.age,
                    "sex": patient.sex,
                    "weight": patient.weight
                },
                "template": template,
                "confidence_score": transcription_job.confidence_score
            }
            
            # Generate SOAP sections using AI
            soap_result = await self._generate_soap_with_ai(context)
            
            if not soap_result["success"]:
                return soap_result
            
            # Create note record
            note = Note(
                user_id=user_id,
                patient_id=patient_id,
                transcription_job_id=transcription_job_id,
                title=f"SOAP Note - {patient.name} - {datetime.utcnow().strftime('%Y-%m-%d')}",
                note_type=template_type,
                status=NoteStatus.AVAILABLE_FOR_REVIEW,
                original_transcript=transcription_job.transcript,
                generated_content=json.dumps(soap_result["soap_data"])
            )
            
            db.add(note)
            db.commit()
            db.refresh(note)
            
            # Create SOAP section records
            sections_created = []
            for section_data in soap_result["soap_data"]["sections"]:
                soap_section = SOAPSection(
                    note_id=note.id,
                    section_type=section_data["type"],
                    content=section_data["content"],
                    order_index=section_data["order"],
                    temperature=section_data.get("vitals", {}).get("temperature"),
                    heart_rate=section_data.get("vitals", {}).get("heart_rate"),
                    respiratory_rate=section_data.get("vitals", {}).get("respiratory_rate"),
                    weight=section_data.get("vitals", {}).get("weight")
                )
                
                db.add(soap_section)
                sections_created.append(soap_section)
            
            db.commit()
            
            # Refresh sections to get IDs
            for section in sections_created:
                db.refresh(section)
            
            logger.info(f"Created SOAP note {note.id} with {len(sections_created)} sections")
            
            return {
                "success": True,
                "note_id": note.id,
                "soap_data": soap_result["soap_data"],
                "confidence_score": transcription_job.confidence_score,
                "sections_created": len(sections_created)
            }
            
        except Exception as e:
            logger.error(f"SOAP generation failed: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    async def _generate_soap_with_ai(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Use AI to generate structured SOAP content"""
        try:
            # Create specialized prompt for SOAP generation
            prompt = self._create_soap_generation_prompt(context)
            
            # Call Gemini API
            response = await self.gemini_service.generate_soap_from_transcript(
                context["transcript"],
                context["patient"],
                context["template"]
            )
            
            if not response["success"]:
                return response
            
            # Parse and structure the AI response
            soap_data = self._parse_ai_soap_response(
                response["soap_content"],
                context["template"]
            )
            
            # Validate generated content
            validation_result = self._validate_soap_content(soap_data, context)
            
            return {
                "success": True,
                "soap_data": soap_data,
                "validation": validation_result
            }
            
        except Exception as e:
            logger.error(f"AI SOAP generation failed: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _create_soap_generation_prompt(self, context: Dict[str, Any]) -> str:
        """Create a specialized prompt for SOAP note generation"""
        patient = context["patient"]
        template = context["template"]
        transcript = context["transcript"]
        
        prompt = f"""
You are a veterinary AI assistant specializing in creating structured SOAP notes from voice transcriptions.

PATIENT INFORMATION:
- Name: {patient["name"]}
- Species: {patient["species"]}
- Breed: {patient.get("breed", "Unknown")}
- Age: {patient.get("age", "Unknown")} years
- Sex: {patient.get("sex", "Unknown")}
- Weight: {patient.get("weight", "Unknown")} lbs

TRANSCRIPT TO ANALYZE:
{transcript}

TEMPLATE STRUCTURE:
Create a SOAP note following this structure:
"""
        
        # Add template sections to prompt
        for section in template["sections"]:
            prompt += f"\n\n{section['title'].upper()} ({section['type']}):"
            prompt += f"\n{section.get('description', '')}"
            
            # Add expected fields
            if "fields" in section:
                prompt += "\nExpected information:"
                for field in section["fields"]:
                    if field.get("required", False):
                        prompt += f"\n- {field['label']} (REQUIRED)"
                    else:
                        prompt += f"\n- {field['label']} (optional)"
        
        prompt += """

IMPORTANT INSTRUCTIONS:
1. Extract ONLY information that is clearly stated in the transcript
2. If information is not provided, write "Not enough data provided" or "Not mentioned"
3. DO NOT hallucinate or infer information not present in the transcript
4. Use proper veterinary terminology
5. Organize information logically within each SOAP section
6. Include vital signs in the Objective section if mentioned
7. Be concise but comprehensive
8. Maintain professional medical language

Return the SOAP note in this JSON format:
{
  "sections": [
    {
      "type": "subjective",
      "title": "Subjective",
      "content": "Patient history and owner observations...",
      "order": 1
    },
    {
      "type": "objective",
      "title": "Objective",
      "content": "Physical examination findings...",
      "order": 2,
      "vitals": {
        "temperature": 101.5,
        "heart_rate": 120,
        "respiratory_rate": 24,
        "weight": 45.2
      }
    },
    {
      "type": "assessment",
      "title": "Assessment",
      "content": "Clinical assessment and diagnosis...",
      "order": 3
    },
    {
      "type": "plan",
      "title": "Plan",
      "content": "Treatment plan and follow-up...",
      "order": 4
    }
  ],
  "summary": "Brief summary of the case",
  "completeness_score": 0.85
}
"""
        
        return prompt
    
    def _parse_ai_soap_response(self, ai_response: str, template: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AI response into structured SOAP data"""
        try:
            # Try to extract JSON from response
            json_match = re.search(r'{.*}', ai_response, re.DOTALL)
            if json_match:
                soap_data = json.loads(json_match.group())
                return soap_data
            
            # Fallback: parse structured text
            return self._parse_structured_text_response(ai_response, template)
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON response, using text parsing")
            return self._parse_structured_text_response(ai_response, template)
    
    def _parse_structured_text_response(self, response: str, template: Dict[str, Any]) -> Dict[str, Any]:
        """Parse structured text response into SOAP sections"""
        sections = []
        
        # Common section headers to look for
        section_patterns = {
            "subjective": ["SUBJECTIVE", "S:", "History", "Chief Complaint"],
            "objective": ["OBJECTIVE", "O:", "Physical Exam", "Examination"],
            "assessment": ["ASSESSMENT", "A:", "Diagnosis", "Assessment"],
            "plan": ["PLAN", "P:", "Treatment", "Recommendations"]
        }
        
        current_section = None
        current_content = []
        
        lines = response.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line is a section header
            section_found = None
            for section_type, patterns in section_patterns.items():
                for pattern in patterns:
                    if pattern.lower() in line.lower():
                        section_found = section_type
                        break
                if section_found:
                    break
            
            if section_found:
                # Save previous section
                if current_section and current_content:
                    sections.append({
                        "type": current_section,
                        "title": current_section.title(),
                        "content": "\n".join(current_content).strip(),
                        "order": len(sections) + 1
                    })
                
                # Start new section
                current_section = section_found
                current_content = []
            else:
                # Add to current section content
                if current_section:
                    current_content.append(line)
        
        # Don't forget the last section
        if current_section and current_content:
            sections.append({
                "type": current_section,
                "title": current_section.title(),
                "content": "\n".join(current_content).strip(),
                "order": len(sections) + 1
            })
        
        # Extract vital signs from objective section
        for section in sections:
            if section["type"] == "objective":
                vitals = self._extract_vitals_from_text(section["content"])
                if vitals:
                    section["vitals"] = vitals
        
        return {
            "sections": sections,
            "summary": "SOAP note generated from transcription",
            "completeness_score": len(sections) / 4.0  # Simple completeness based on sections
        }
    
    def _extract_vitals_from_text(self, text: str) -> Dict[str, float]:
        """Extract vital signs from text using regex patterns"""
        vitals = {}
        
        # Temperature patterns
        temp_patterns = [
            r'temperature[^\d]*([0-9.]+)(?:\s*[°f])',
            r'temp[^\d]*([0-9.]+)(?:\s*[°f])',
            r'([0-9.]+)\s*[°f]'
        ]
        
        for pattern in temp_patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    vitals["temperature"] = float(match.group(1))
                    break
                except ValueError:
                    continue
        
        # Heart rate patterns
        hr_patterns = [
            r'heart\s+rate[^\d]*([0-9]+)',
            r'hr[^\d]*([0-9]+)',
            r'pulse[^\d]*([0-9]+)'
        ]
        
        for pattern in hr_patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    vitals["heart_rate"] = int(match.group(1))
                    break
                except ValueError:
                    continue
        
        # Respiratory rate patterns
        rr_patterns = [
            r'respiratory\s+rate[^\d]*([0-9]+)',
            r'respiration[^\d]*([0-9]+)',
            r'rr[^\d]*([0-9]+)',
            r'breathing[^\d]*([0-9]+)'
        ]
        
        for pattern in rr_patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    vitals["respiratory_rate"] = int(match.group(1))
                    break
                except ValueError:
                    continue
        
        # Weight patterns
        weight_patterns = [
            r'weight[^\d]*([0-9.]+)(?:\s*(?:lbs?|pounds?))?',
            r'weighs[^\d]*([0-9.]+)(?:\s*(?:lbs?|pounds?))?',
            r'([0-9.]+)\s*(?:lbs?|pounds?)'
        ]
        
        for pattern in weight_patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    vitals["weight"] = float(match.group(1))
                    break
                except ValueError:
                    continue
        
        return vitals
    
    def _validate_soap_content(self, soap_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate generated SOAP content"""
        validation = {
            "completeness_score": 0.0,
            "missing_sections": [],
            "quality_issues": [],
            "suggestions": []
        }
        
        required_sections = ["subjective", "objective", "assessment", "plan"]
        found_sections = [s["type"] for s in soap_data.get("sections", [])]
        
        # Check for missing sections
        for section in required_sections:
            if section not in found_sections:
                validation["missing_sections"].append(section)
        
        # Calculate completeness score
        section_score = len(found_sections) / len(required_sections)
        
        # Check content quality
        total_content_length = 0
        for section in soap_data.get("sections", []):
            content = section.get("content", "")
            total_content_length += len(content)
            
            # Check for placeholder text
            if "not enough data" in content.lower() or "not mentioned" in content.lower():
                validation["quality_issues"].append(f"Limited information in {section['type']} section")
        
        # Content quality score based on length and completeness
        content_score = min(1.0, total_content_length / 500)  # Expect at least 500 chars total
        
        validation["completeness_score"] = (section_score + content_score) / 2
        
        # Add suggestions
        if validation["completeness_score"] < 0.7:
            validation["suggestions"].append("Consider recording additional clinical information")
        
        if "objective" in found_sections:
            obj_section = next(s for s in soap_data["sections"] if s["type"] == "objective")
            if not obj_section.get("vitals"):
                validation["suggestions"].append("Include vital signs in the objective section")
        
        return validation
    
    def get_note_with_sections(self, note_id: int, db: Session) -> Dict[str, Any]:
        """Get a complete note with all its SOAP sections"""
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            return {"success": False, "error": "Note not found"}
        
        sections = db.query(SOAPSection).filter(
            SOAPSection.note_id == note_id
        ).order_by(SOAPSection.order_index).all()
        
        return {
            "success": True,
            "note": {
                "id": note.id,
                "title": note.title,
                "note_type": note.note_type,
                "status": note.status.value,
                "created_at": note.created_at.isoformat(),
                "updated_at": note.updated_at.isoformat()
            },
            "sections": [
                {
                    "id": section.id,
                    "type": section.section_type,
                    "content": section.content,
                    "order": section.order_index,
                    "vitals": {
                        "temperature": section.temperature,
                        "heart_rate": section.heart_rate,
                        "respiratory_rate": section.respiratory_rate,
                        "weight": section.weight
                    } if any([section.temperature, section.heart_rate, section.respiratory_rate, section.weight]) else None
                }
                for section in sections
            ]
        }

# Global instance
soap_generation_service = SOAPGenerationService()