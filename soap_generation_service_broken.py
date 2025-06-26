"""
SOAP Note Generation Service
Uses Vertex AI to intelligently generate structured SOAP notes from transcriptions
"""

import logging
import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models import Note, SOAPSection, TranscriptionJob, Pet, User, NoteStatus
from template_service import template_service
from gemini_service import GeminiService

logger = logging.getLogger(__name__)

class SOAPGenerationService:
    def __init__(self):
        self.gemini_service = GeminiService()
        
    async def generate_soap_from_transcription(
        self, 
        transcription_job_id: int, 
        patient_id: int,
        template_type: str = "soap_standard",
        user_id: int = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Generate a structured SOAP note from a transcription
        """
        try:
            # Get transcription
            transcription_job = db.query(TranscriptionJob).filter(
                TranscriptionJob.id == transcription_job_id
            ).first()
            
            if not transcription_job or not transcription_job.transcript:
                return {"success": False, "error": "Transcription not found or incomplete"}
            
            # Get patient information
            patient = db.query(Pet).filter(Pet.id == patient_id).first()
            if not patient:
                return {"success": False, "error": "Patient not found"}
            
            # Get template structure
            template = template_service.get_template_structure(template_type)
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
                    # Add vital signs if present in objective section
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
    
    def _create_soap_generation_prompt(self, context: Dict[str, Any]) -> str:\n        \"\"\"Create a specialized prompt for SOAP note generation\"\"\"\n        patient = context[\"patient\"]\n        template = context[\"template\"]\n        transcript = context[\"transcript\"]\n        \n        prompt = f\"\"\"\nYou are a veterinary AI assistant specializing in creating structured SOAP notes from voice transcriptions.\n\nPATIENT INFORMATION:\n- Name: {patient[\"name\"]}\n- Species: {patient[\"species\"]}\n- Breed: {patient.get(\"breed\", \"Unknown\")}\n- Age: {patient.get(\"age\", \"Unknown\")} years\n- Sex: {patient.get(\"sex\", \"Unknown\")}\n- Weight: {patient.get(\"weight\", \"Unknown\")} lbs\n\nTRANSCRIPT TO ANALYZE:\n{transcript}\n\nTEMPLATE STRUCTURE:\nCreate a SOAP note following this structure:\n\"\"\"\n        \n        # Add template sections to prompt\n        for section in template[\"sections\"]:\n            prompt += f\"\\n\\n{section['title'].upper()} ({section['type']}):\"\n            prompt += f\"\\n{section.get('description', '')}\"\n            \n            # Add expected fields\n            if \"fields\" in section:\n                prompt += \"\\nExpected information:\"\n                for field in section[\"fields\"]:\n                    if field.get(\"required\", False):\n                        prompt += f\"\\n- {field['label']} (REQUIRED)\"\n                    else:\n                        prompt += f\"\\n- {field['label']} (optional)\"\n        \n        prompt += \"\"\"\n\nIMPORTANT INSTRUCTIONS:\n1. Extract ONLY information that is clearly stated in the transcript\n2. If information is not provided, write \"Not enough data provided\" or \"Not mentioned\"\n3. DO NOT hallucinate or infer information not present in the transcript\n4. Use proper veterinary terminology\n5. Organize information logically within each SOAP section\n6. Include vital signs in the Objective section if mentioned\n7. Be concise but comprehensive\n8. Maintain professional medical language\n\nReturn the SOAP note in this JSON format:\n{\n  \"sections\": [\n    {\n      \"type\": \"subjective\",\n      \"title\": \"Subjective\",\n      \"content\": \"Patient history and owner observations...\",\n      \"order\": 1\n    },\n    {\n      \"type\": \"objective\",\n      \"title\": \"Objective\",\n      \"content\": \"Physical examination findings...\",\n      \"order\": 2,\n      \"vitals\": {\n        \"temperature\": 101.5,\n        \"heart_rate\": 120,\n        \"respiratory_rate\": 24,\n        \"weight\": 45.2\n      }\n    },\n    {\n      \"type\": \"assessment\",\n      \"title\": \"Assessment\",\n      \"content\": \"Clinical assessment and diagnosis...\",\n      \"order\": 3\n    },\n    {\n      \"type\": \"plan\",\n      \"title\": \"Plan\",\n      \"content\": \"Treatment plan and follow-up...\",\n      \"order\": 4\n    }\n  ],\n  \"summary\": \"Brief summary of the case\",\n  \"completeness_score\": 0.85\n}\n\"\"\"\n        \n        return prompt\n    \n    def _parse_ai_soap_response(self, ai_response: str, template: Dict[str, Any]) -> Dict[str, Any]:\n        \"\"\"Parse AI response into structured SOAP data\"\"\"\n        try:\n            # Try to extract JSON from response\n            json_match = re.search(r'{.*}', ai_response, re.DOTALL)\n            if json_match:\n                soap_data = json.loads(json_match.group())\n                return soap_data\n            \n            # Fallback: parse structured text\n            return self._parse_structured_text_response(ai_response, template)\n            \n        except json.JSONDecodeError:\n            logger.warning(\"Failed to parse JSON response, using text parsing\")\n            return self._parse_structured_text_response(ai_response, template)\n    \n    def _parse_structured_text_response(self, response: str, template: Dict[str, Any]) -> Dict[str, Any]:\n        \"\"\"Parse structured text response into SOAP sections\"\"\"\n        sections = []\n        \n        # Common section headers to look for\n        section_patterns = {\n            \"subjective\": [\"SUBJECTIVE\", \"S:\", \"History\", \"Chief Complaint\"],\n            \"objective\": [\"OBJECTIVE\", \"O:\", \"Physical Exam\", \"Examination\"],\n            \"assessment\": [\"ASSESSMENT\", \"A:\", \"Diagnosis\", \"Assessment\"],\n            \"plan\": [\"PLAN\", \"P:\", \"Treatment\", \"Recommendations\"]\n        }\n        \n        current_section = None\n        current_content = []\n        \n        lines = response.split('\\n')\n        \n        for line in lines:\n            line = line.strip()\n            if not line:\n                continue\n            \n            # Check if line is a section header\n            section_found = None\n            for section_type, patterns in section_patterns.items():\n                for pattern in patterns:\n                    if pattern.lower() in line.lower():\n                        section_found = section_type\n                        break\n                if section_found:\n                    break\n            \n            if section_found:\n                # Save previous section\n                if current_section and current_content:\n                    sections.append({\n                        \"type\": current_section,\n                        \"title\": current_section.title(),\n                        \"content\": \"\\n\".join(current_content).strip(),\n                        \"order\": len(sections) + 1\n                    })\n                \n                # Start new section\n                current_section = section_found\n                current_content = []\n            else:\n                # Add to current section content\n                if current_section:\n                    current_content.append(line)\n        \n        # Don't forget the last section\n        if current_section and current_content:\n            sections.append({\n                \"type\": current_section,\n                \"title\": current_section.title(),\n                \"content\": \"\\n\".join(current_content).strip(),\n                \"order\": len(sections) + 1\n            })\n        \n        # Extract vital signs from objective section\n        for section in sections:\n            if section[\"type\"] == \"objective\":\n                vitals = self._extract_vitals_from_text(section[\"content\"])\n                if vitals:\n                    section[\"vitals\"] = vitals\n        \n        return {\n            \"sections\": sections,\n            \"summary\": \"SOAP note generated from transcription\",\n            \"completeness_score\": len(sections) / 4.0  # Simple completeness based on sections\n        }\n    \n    def _extract_vitals_from_text(self, text: str) -> Dict[str, float]:\n        \"\"\"Extract vital signs from text using regex patterns\"\"\"\n        vitals = {}\n        \n        # Temperature patterns\n        temp_patterns = [\n            r'temperature[^\\d]*([\\d.]+)(?:\\s*[°f])',\n            r'temp[^\\d]*([\\d.]+)(?:\\s*[°f])',\n            r'([\\d.]+)\\s*[°f]'\n        ]\n        \n        for pattern in temp_patterns:\n            match = re.search(pattern, text.lower())\n            if match:\n                try:\n                    vitals[\"temperature\"] = float(match.group(1))\n                    break\n                except ValueError:\n                    continue\n        \n        # Heart rate patterns\n        hr_patterns = [\n            r'heart\\s+rate[^\\d]*([\\d]+)',\n            r'hr[^\\d]*([\\d]+)',\n            r'pulse[^\\d]*([\\d]+)'\n        ]\n        \n        for pattern in hr_patterns:\n            match = re.search(pattern, text.lower())\n            if match:\n                try:\n                    vitals[\"heart_rate\"] = int(match.group(1))\n                    break\n                except ValueError:\n                    continue\n        \n        # Respiratory rate patterns\n        rr_patterns = [\n            r'respiratory\\s+rate[^\\d]*([\\d]+)',\n            r'respiration[^\\d]*([\\d]+)',\n            r'rr[^\\d]*([\\d]+)',\n            r'breathing[^\\d]*([\\d]+)'\n        ]\n        \n        for pattern in rr_patterns:\n            match = re.search(pattern, text.lower())\n            if match:\n                try:\n                    vitals[\"respiratory_rate\"] = int(match.group(1))\n                    break\n                except ValueError:\n                    continue\n        \n        # Weight patterns\n        weight_patterns = [\n            r'weight[^\\d]*([\\d.]+)(?:\\s*(?:lbs?|pounds?))?',\n            r'weighs[^\\d]*([\\d.]+)(?:\\s*(?:lbs?|pounds?))?',\n            r'([\\d.]+)\\s*(?:lbs?|pounds?)'\n        ]\n        \n        for pattern in weight_patterns:\n            match = re.search(pattern, text.lower())\n            if match:\n                try:\n                    vitals[\"weight\"] = float(match.group(1))\n                    break\n                except ValueError:\n                    continue\n        \n        return vitals\n    \n    def _validate_soap_content(self, soap_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:\n        \"\"\"Validate generated SOAP content\"\"\"\n        validation = {\n            \"completeness_score\": 0.0,\n            \"missing_sections\": [],\n            \"quality_issues\": [],\n            \"suggestions\": []\n        }\n        \n        required_sections = [\"subjective\", \"objective\", \"assessment\", \"plan\"]\n        found_sections = [s[\"type\"] for s in soap_data.get(\"sections\", [])]\n        \n        # Check for missing sections\n        for section in required_sections:\n            if section not in found_sections:\n                validation[\"missing_sections\"].append(section)\n        \n        # Calculate completeness score\n        section_score = len(found_sections) / len(required_sections)\n        \n        # Check content quality\n        total_content_length = 0\n        for section in soap_data.get(\"sections\", []):\n            content = section.get(\"content\", \"\")\n            total_content_length += len(content)\n            \n            # Check for placeholder text\n            if \"not enough data\" in content.lower() or \"not mentioned\" in content.lower():\n                validation[\"quality_issues\"].append(f\"Limited information in {section['type']} section\")\n        \n        # Content quality score based on length and completeness\n        content_score = min(1.0, total_content_length / 500)  # Expect at least 500 chars total\n        \n        validation[\"completeness_score\"] = (section_score + content_score) / 2\n        \n        # Add suggestions\n        if validation[\"completeness_score\"] < 0.7:\n            validation[\"suggestions\"].append(\"Consider recording additional clinical information\")\n        \n        if \"objective\" in found_sections:\n            obj_section = next(s for s in soap_data[\"sections\"] if s[\"type\"] == \"objective\")\n            if not obj_section.get(\"vitals\"):\n                validation[\"suggestions\"].append(\"Include vital signs in the objective section\")\n        \n        return validation\n    \n    def get_note_with_sections(self, note_id: int, db: Session) -> Dict[str, Any]:\n        \"\"\"Get a complete note with all its SOAP sections\"\"\"\n        note = db.query(Note).filter(Note.id == note_id).first()\n        if not note:\n            return {\"success\": False, \"error\": \"Note not found\"}\n        \n        sections = db.query(SOAPSection).filter(\n            SOAPSection.note_id == note_id\n        ).order_by(SOAPSection.order_index).all()\n        \n        return {\n            \"success\": True,\n            \"note\": {\n                \"id\": note.id,\n                \"title\": note.title,\n                \"note_type\": note.note_type,\n                \"status\": note.status.value,\n                \"created_at\": note.created_at.isoformat(),\n                \"updated_at\": note.updated_at.isoformat()\n            },\n            \"sections\": [\n                {\n                    \"id\": section.id,\n                    \"type\": section.section_type,\n                    \"content\": section.content,\n                    \"order\": section.order_index,\n                    \"vitals\": {\n                        \"temperature\": section.temperature,\n                        \"heart_rate\": section.heart_rate,\n                        \"respiratory_rate\": section.respiratory_rate,\n                        \"weight\": section.weight\n                    } if any([section.temperature, section.heart_rate, section.respiratory_rate, section.weight]) else None\n                }\n                for section in sections\n            ]\n        }\n\n# Global instance\nsoap_generation_service = SOAPGenerationService()