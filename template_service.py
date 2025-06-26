"""
Template service for managing SOAP note templates and structures
Handles built-in and custom templates for veterinary documentation
"""

import json
import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from models import Template, User

logger = logging.getLogger(__name__)

class TemplateService:
    def __init__(self):
        self.builtin_templates = self._initialize_builtin_templates()
    
    def _initialize_builtin_templates(self) -> Dict[str, Dict[str, Any]]:
        """Initialize built-in medical templates"""
        return {
            "soap_standard": {
                "name": "Standard SOAP Note",
                "description": "Comprehensive veterinary SOAP note format",
                "category": "medical",
                "template_type": "soap",
                "sections": [
                    {
                        "type": "subjective",
                        "title": "Subjective",
                        "order": 1,
                        "description": "Patient history and owner observations",
                        "fields": [
                            {"name": "chief_complaint", "type": "text", "label": "Chief Complaint", "required": True},
                            {"name": "history", "type": "textarea", "label": "History of Present Illness", "required": True},
                            {"name": "previous_treatments", "type": "textarea", "label": "Previous Treatments", "required": False},
                            {"name": "diet_exercise", "type": "text", "label": "Diet & Exercise", "required": False},
                            {"name": "owner_observations", "type": "textarea", "label": "Owner Observations", "required": False}
                        ]
                    },
                    {
                        "type": "objective",
                        "title": "Objective", 
                        "order": 2,
                        "description": "Physical examination findings and vital signs",
                        "fields": [
                            {"name": "temperature", "type": "number", "label": "Temperature (°F)", "required": False, "unit": "°F"},
                            {"name": "heart_rate", "type": "number", "label": "Heart Rate (bpm)", "required": False, "unit": "bpm"},
                            {"name": "respiratory_rate", "type": "number", "label": "Respiratory Rate (rpm)", "required": False, "unit": "rpm"},
                            {"name": "weight", "type": "number", "label": "Weight (lbs)", "required": False, "unit": "lbs"},
                            {"name": "body_condition", "type": "select", "label": "Body Condition Score", "required": False, 
                             "options": ["1/9 - Emaciated", "2/9 - Very Thin", "3/9 - Thin", "4/9 - Underweight", "5/9 - Ideal", 
                                        "6/9 - Overweight", "7/9 - Heavy", "8/9 - Obese", "9/9 - Grossly Obese"]},
                            {"name": "general_appearance", "type": "textarea", "label": "General Appearance & Attitude", "required": True},
                            {"name": "mucous_membranes", "type": "text", "label": "Mucous Membranes", "required": False},
                            {"name": "capillary_refill", "type": "text", "label": "Capillary Refill Time", "required": False},
                            {"name": "lymph_nodes", "type": "text", "label": "Lymph Nodes", "required": False},
                            {"name": "skin_coat", "type": "textarea", "label": "Skin & Coat", "required": False},
                            {"name": "eyes_ears", "type": "textarea", "label": "Eyes & Ears", "required": False},
                            {"name": "cardiovascular", "type": "textarea", "label": "Cardiovascular", "required": False},
                            {"name": "respiratory", "type": "textarea", "label": "Respiratory", "required": False},
                            {"name": "gastrointestinal", "type": "textarea", "label": "Gastrointestinal", "required": False},
                            {"name": "genitourinary", "type": "textarea", "label": "Genitourinary", "required": False},
                            {"name": "musculoskeletal", "type": "textarea", "label": "Musculoskeletal", "required": False},
                            {"name": "neurological", "type": "textarea", "label": "Neurological", "required": False}
                        ]
                    },
                    {
                        "type": "assessment",
                        "title": "Assessment",
                        "order": 3,
                        "description": "Diagnosis and clinical interpretation",
                        "fields": [
                            {"name": "primary_diagnosis", "type": "text", "label": "Primary Diagnosis", "required": True},
                            {"name": "differential_diagnoses", "type": "textarea", "label": "Differential Diagnoses", "required": False},
                            {"name": "diagnostic_results", "type": "textarea", "label": "Diagnostic Test Results", "required": False},
                            {"name": "prognosis", "type": "select", "label": "Prognosis", "required": False,
                             "options": ["Excellent", "Good", "Fair", "Guarded", "Poor", "Grave"]},
                            {"name": "clinical_notes", "type": "textarea", "label": "Clinical Notes", "required": False}
                        ]
                    },
                    {
                        "type": "plan",
                        "title": "Plan",
                        "order": 4,
                        "description": "Treatment plan and follow-up recommendations",
                        "fields": [
                            {"name": "treatment_plan", "type": "textarea", "label": "Treatment Plan", "required": True},
                            {"name": "medications", "type": "textarea", "label": "Medications & Dosages", "required": False},
                            {"name": "diagnostics_ordered", "type": "textarea", "label": "Additional Diagnostics", "required": False},
                            {"name": "follow_up", "type": "text", "label": "Follow-up Instructions", "required": False},
                            {"name": "client_education", "type": "textarea", "label": "Client Education", "required": False},
                            {"name": "recheck_date", "type": "date", "label": "Recheck Date", "required": False}
                        ]
                    }
                ]
            },
            
            "soap_callback": {
                "name": "Callback SOAP Note",
                "description": "Shortened format for follow-up consultations",
                "category": "medical",
                "template_type": "callback",
                "sections": [
                    {
                        "type": "subjective",
                        "title": "Subjective",
                        "order": 1,
                        "fields": [
                            {"name": "progress_since_last_visit", "type": "textarea", "label": "Progress Since Last Visit", "required": True},
                            {"name": "current_concerns", "type": "textarea", "label": "Current Concerns", "required": False},
                            {"name": "medication_compliance", "type": "text", "label": "Medication Compliance", "required": False}
                        ]
                    },
                    {
                        "type": "objective",
                        "title": "Objective",
                        "order": 2,
                        "fields": [
                            {"name": "weight", "type": "number", "label": "Weight (lbs)", "required": False, "unit": "lbs"},
                            {"name": "general_appearance", "type": "textarea", "label": "General Appearance", "required": True},
                            {"name": "focused_exam", "type": "textarea", "label": "Focused Physical Exam", "required": True}
                        ]
                    },
                    {
                        "type": "assessment", 
                        "title": "Assessment",
                        "order": 3,
                        "fields": [
                            {"name": "progress_assessment", "type": "textarea", "label": "Progress Assessment", "required": True},
                            {"name": "response_to_treatment", "type": "select", "label": "Response to Treatment", 
                             "options": ["Excellent", "Good", "Fair", "Poor", "No Response"], "required": False}
                        ]
                    },
                    {
                        "type": "plan",
                        "title": "Plan", 
                        "order": 4,
                        "fields": [
                            {"name": "continue_current_plan", "type": "checkbox", "label": "Continue Current Treatment Plan", "required": False},
                            {"name": "plan_modifications", "type": "textarea", "label": "Plan Modifications", "required": False},
                            {"name": "next_follow_up", "type": "text", "label": "Next Follow-up", "required": False}
                        ]
                    }
                ]
            },
            
            "dental_record": {
                "name": "Dental Record",
                "description": "Comprehensive dental examination and treatment record",
                "category": "dental",
                "template_type": "dental",
                "sections": [
                    {
                        "type": "subjective",
                        "title": "Subjective",
                        "order": 1,
                        "fields": [
                            {"name": "dental_history", "type": "textarea", "label": "Dental History", "required": True},
                            {"name": "oral_symptoms", "type": "textarea", "label": "Oral Symptoms", "required": False},
                            {"name": "eating_habits", "type": "text", "label": "Eating Habits Changes", "required": False}
                        ]
                    },
                    {
                        "type": "objective",
                        "title": "Oral Examination",
                        "order": 2,
                        "fields": [
                            {"name": "oral_exam_awake", "type": "textarea", "label": "Conscious Oral Exam", "required": True},
                            {"name": "halitosis", "type": "select", "label": "Halitosis Grade", 
                             "options": ["0 - None", "1 - Mild", "2 - Moderate", "3 - Severe"], "required": False},
                            {"name": "tartar_grade", "type": "select", "label": "Tartar Grade",
                             "options": ["0 - None", "1 - Mild", "2 - Moderate", "3 - Severe"], "required": False},
                            {"name": "gingivitis_grade", "type": "select", "label": "Gingivitis Grade",
                             "options": ["0 - None", "1 - Mild", "2 - Moderate", "3 - Severe"], "required": False},
                            {"name": "dental_chart", "type": "textarea", "label": "Detailed Dental Chart", "required": False},
                            {"name": "periodontal_pockets", "type": "textarea", "label": "Periodontal Pocket Depths", "required": False},
                            {"name": "oral_masses", "type": "textarea", "label": "Oral Masses/Lesions", "required": False}
                        ]
                    },
                    {
                        "type": "assessment",
                        "title": "Dental Assessment",
                        "order": 3,
                        "fields": [
                            {"name": "dental_grade", "type": "select", "label": "Overall Dental Disease Grade",
                             "options": ["Grade 0 - Normal", "Grade 1 - Mild", "Grade 2 - Moderate", 
                                        "Grade 3 - Severe", "Grade 4 - Extreme"], "required": True},
                            {"name": "periodontal_stage", "type": "select", "label": "Periodontal Disease Stage",
                             "options": ["Stage 0 - Normal", "Stage 1 - Gingivitis", "Stage 2 - Early Periodontitis",
                                        "Stage 3 - Moderate Periodontitis", "Stage 4 - Advanced Periodontitis"], "required": False},
                            {"name": "treatment_needs", "type": "textarea", "label": "Treatment Needs Assessment", "required": True}
                        ]
                    },
                    {
                        "type": "plan",
                        "title": "Treatment Plan",
                        "order": 4,
                        "fields": [
                            {"name": "anesthesia_plan", "type": "textarea", "label": "Anesthesia Plan", "required": False},
                            {"name": "scaling_polishing", "type": "checkbox", "label": "Scaling & Polishing", "required": False},
                            {"name": "extractions_planned", "type": "textarea", "label": "Planned Extractions", "required": False},
                            {"name": "dental_radiographs", "type": "checkbox", "label": "Dental Radiographs", "required": False},
                            {"name": "home_care", "type": "textarea", "label": "Home Care Instructions", "required": False},
                            {"name": "recheck_schedule", "type": "text", "label": "Recheck Schedule", "required": False}
                        ]
                    }
                ]
            },

            "ultrasound_abdomen": {
                "name": "Abdominal Ultrasound",
                "description": "Systematic abdominal ultrasound examination",
                "category": "diagnostic",
                "template_type": "ultrasound",
                "sections": [
                    {
                        "type": "subjective",
                        "title": "Clinical Indication",
                        "order": 1,
                        "fields": [
                            {"name": "clinical_signs", "type": "textarea", "label": "Clinical Signs", "required": True},
                            {"name": "indication", "type": "text", "label": "Indication for Ultrasound", "required": True},
                            {"name": "previous_imaging", "type": "textarea", "label": "Previous Imaging", "required": False}
                        ]
                    },
                    {
                        "type": "objective",
                        "title": "Ultrasound Findings",
                        "order": 2,
                        "fields": [
                            {"name": "liver", "type": "textarea", "label": "Liver", "required": True},
                            {"name": "gallbladder", "type": "textarea", "label": "Gallbladder", "required": True},
                            {"name": "pancreas", "type": "textarea", "label": "Pancreas", "required": True},
                            {"name": "spleen", "type": "textarea", "label": "Spleen", "required": True},
                            {"name": "kidneys", "type": "textarea", "label": "Kidneys", "required": True},
                            {"name": "adrenals", "type": "textarea", "label": "Adrenal Glands", "required": True},
                            {"name": "bladder", "type": "textarea", "label": "Urinary Bladder", "required": True},
                            {"name": "stomach", "type": "textarea", "label": "Stomach", "required": True},
                            {"name": "intestines", "type": "textarea", "label": "Small & Large Intestines", "required": True},
                            {"name": "reproductive", "type": "textarea", "label": "Reproductive Organs", "required": False},
                            {"name": "lymph_nodes", "type": "textarea", "label": "Abdominal Lymph Nodes", "required": False},
                            {"name": "free_fluid", "type": "text", "label": "Free Abdominal Fluid", "required": False}
                        ]
                    },
                    {
                        "type": "assessment",
                        "title": "Ultrasound Interpretation",
                        "order": 3,
                        "fields": [
                            {"name": "normal_structures", "type": "textarea", "label": "Normal Structures", "required": False},
                            {"name": "abnormal_findings", "type": "textarea", "label": "Abnormal Findings", "required": True},
                            {"name": "differential_diagnoses", "type": "textarea", "label": "Differential Diagnoses", "required": True}
                        ]
                    },
                    {
                        "type": "plan",
                        "title": "Recommendations",
                        "order": 4,
                        "fields": [
                            {"name": "additional_imaging", "type": "textarea", "label": "Additional Imaging", "required": False},
                            {"name": "laboratory_tests", "type": "textarea", "label": "Recommended Laboratory Tests", "required": False},
                            {"name": "follow_up_ultrasound", "type": "text", "label": "Follow-up Ultrasound", "required": False},
                            {"name": "clinical_correlation", "type": "textarea", "label": "Clinical Correlation Needed", "required": False}
                        ]
                    }
                ]
            }
        }
    
    def get_builtin_templates(self) -> List[Dict[str, Any]]:
        """Get all built-in templates"""
        templates = []
        for template_id, template_data in self.builtin_templates.items():
            templates.append({
                "id": template_id,
                "name": template_data["name"],
                "description": template_data["description"],
                "category": template_data["category"],
                "template_type": template_data["template_type"],
                "is_builtin": True
            })
        return templates
    
    def get_template_structure(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get the complete structure of a template"""
        if template_id in self.builtin_templates:
            return self.builtin_templates[template_id]
        return None
    
    def create_custom_template(self, template_data: Dict[str, Any], user_id: int, db: Session) -> Template:
        """Create a custom template"""
        template = Template(
            name=template_data["name"],
            template_type=template_data.get("template_type", "custom"),
            category=template_data.get("category", "custom"),
            template_content=json.dumps(template_data),
            created_by=user_id,
            is_default=False
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        logger.info(f"Created custom template '{template.name}' for user {user_id}")
        return template
    
    def get_user_templates(self, user_id: int, db: Session) -> List[Dict[str, Any]]:
        """Get templates available to a user (built-in + custom)"""
        templates = self.get_builtin_templates()
        
        # Add custom templates
        custom_templates = db.query(Template).filter(
            Template.created_by == user_id,
            Template.is_active == True
        ).all()
        
        for template in custom_templates:
            template_data = json.loads(template.template_content)
            templates.append({
                "id": str(template.id),
                "name": template.name,
                "description": template_data.get("description", ""),
                "category": template_data.get("category", "custom"),
                "template_type": template.template_type,
                "is_builtin": False,
                "created_at": template.created_at.isoformat()
            })
        
        return templates
    
    def get_template_by_type(self, template_type: str) -> Optional[Dict[str, Any]]:
        """Get a template by its type (for default selection)"""
        for template_id, template_data in self.builtin_templates.items():
            if template_data["template_type"] == template_type:
                return template_data
        return None
    
    def validate_template_data(self, template_data: Dict[str, Any]) -> List[str]:
        """Validate template structure and return any errors"""
        errors = []
        
        required_fields = ["name", "sections"]
        for field in required_fields:
            if field not in template_data:
                errors.append(f"Missing required field: {field}")
        
        if "sections" in template_data:
            if not isinstance(template_data["sections"], list):
                errors.append("Sections must be a list")
            else:
                for i, section in enumerate(template_data["sections"]):
                    if not isinstance(section, dict):
                        errors.append(f"Section {i} must be an object")
                        continue
                    
                    if "type" not in section:
                        errors.append(f"Section {i} missing type")
                    if "title" not in section:
                        errors.append(f"Section {i} missing title")
                    if "fields" not in section:
                        errors.append(f"Section {i} missing fields")
                    elif not isinstance(section["fields"], list):
                        errors.append(f"Section {i} fields must be a list")
        
        return errors

# Global instance
template_service = TemplateService()