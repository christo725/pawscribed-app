import json
import os
from typing import Dict, Any
from dotenv import load_dotenv
import logging

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        
        # Initialize Vertex AI once
        import vertexai
        vertexai.init(project=self.project_id, location=self.location)
        
    def sanitize_clinical_data(self, data: Dict[str, Any]) -> str:
        """
        Remove PII/PHI and create a sanitized clinical summary for Gemini.
        Only clinical information is sent to the AI model.
        """
        logger.debug(f"Sanitizing clinical data: {data}")
        
        # Extract only clinical information, removing all identifying data
        clinical_info = []
        
        # Pet information (anonymized)
        if data.get("age"):
            clinical_info.append(f"{data['age']}-year-old")
        if data.get("species"):
            clinical_info.append(data["species"])
        if data.get("sex"):
            clinical_info.append(data["sex"])
        if data.get("weight"):
            clinical_info.append(f"weighing {data['weight']} kg")
            
        # Clinical presentation
        if data.get("chief_complaint") and data["chief_complaint"].strip():
            clinical_info.append(f"Chief complaint: {data['chief_complaint'].strip()}")
        if data.get("symptoms") and data["symptoms"].strip():
            clinical_info.append(f"Symptoms: {data['symptoms'].strip()}")
        if data.get("physical_exam") and data["physical_exam"].strip():
            clinical_info.append(f"Physical examination: {data['physical_exam'].strip()}")
        if data.get("diagnostic_findings") and data["diagnostic_findings"].strip():
            clinical_info.append(f"Diagnostic findings: {data['diagnostic_findings'].strip()}")
        if data.get("clinical_notes") and data["clinical_notes"].strip():
            clinical_info.append(f"Clinical notes: {data['clinical_notes'].strip()}")
        
        sanitized_data = " ".join(clinical_info)
        logger.debug(f"Sanitized clinical info: '{sanitized_data}'")
        return sanitized_data
    
    async def generate_soap_note(self, clinical_data: Dict[str, Any], style: str = "detailed") -> Dict[str, Any]:
        """
        Generate a structured SOAP note from clinical data.
        Only anonymized clinical information is sent to Gemini.
        """
        try:
            logger.debug(f"Generating SOAP note with clinical data: {clinical_data}")
            logger.debug(f"Style: {style}")
            
            # Sanitize data - remove all PII/PHI
            sanitized_clinical_info = self.sanitize_clinical_data(clinical_data)
            logger.debug(f"Sanitized clinical info: {sanitized_clinical_info}")
            
            # Create style-specific prompt
            style_instructions = {
                "concise": "Generate a concise, bullet-point style SOAP note.",
                "detailed": "Generate a detailed, comprehensive SOAP note.",
                "legal-ready": "Generate a detailed SOAP note suitable for legal documentation with precise medical terminology."
            }
            
            # Check if we have enough clinical information
            if not sanitized_clinical_info or len(sanitized_clinical_info.strip()) < 10:
                logger.error(f"Insufficient clinical data provided: '{sanitized_clinical_info}'")
                return {
                    "success": False,
                    "error": "Insufficient clinical information provided. Please fill in clinical notes and other relevant fields.",
                    "soap": {
                        "subjective": "Insufficient clinical information provided.",
                        "objective": "No examination findings documented.", 
                        "assessment": "Unable to assess without clinical information.",
                        "plan": "Please provide complete clinical information."
                    }
                }

            prompt = f"""
You are a veterinary assistant helping to structure clinical notes into a professional SOAP format.

Clinical Information: {sanitized_clinical_info}

{style_instructions.get(style, style_instructions["detailed"])}

IMPORTANT CONSTRAINTS:
1. ONLY use information explicitly provided in the clinical information above
2. DO NOT add, infer, or assume any information not directly stated
3. If information for a section is missing, state "Not documented" or "No information provided"
4. Do not make up symptoms, findings, or treatments

Please structure ONLY the provided information into a SOAP note with the following format:

SUBJECTIVE: (What the owner reported, clinical history - only from provided information)
OBJECTIVE: (Physical examination findings, vital signs, diagnostic results - only from provided information) 
ASSESSMENT: (Clinical diagnosis or differential diagnoses - only based on provided findings)
PLAN: (Treatment plan, medications, follow-up recommendations - only from provided information)

Respond with a JSON object containing the four SOAP sections as separate fields:
{{
    "subjective": "...",
    "objective": "...",
    "assessment": "...",
    "plan": "..."
}}
"""

            # Call Vertex AI Gemini 2.5 Flash
            from vertexai import generative_models
            
            # Use Gemini 2.5 Flash model
            model = generative_models.GenerativeModel("gemini-2.5-flash")
            
            # Generate content
            logger.debug(f"Sending prompt to Gemini: {prompt[:200]}...")  # Log first 200 chars
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "top_p": 0.8,
                    "top_k": 40,
                    "max_output_tokens": 2048,
                }
            )
            
            response_text = response.text
            logger.debug(f"Received response from Gemini: {response_text[:200]}...")  # Log first 200 chars
            
            # Parse the response
            try:
                # Clean response text - remove markdown code blocks if present
                clean_text = response_text.strip()
                if clean_text.startswith('```json'):
                    # Remove ```json at start and ``` at end
                    clean_text = clean_text[7:]  # Remove ```json
                    if clean_text.endswith('```'):
                        clean_text = clean_text[:-3]  # Remove ending ```
                    clean_text = clean_text.strip()
                elif clean_text.startswith('```'):
                    # Remove generic code blocks
                    clean_text = clean_text[3:]
                    if clean_text.endswith('```'):
                        clean_text = clean_text[:-3]
                    clean_text = clean_text.strip()
                
                soap_data = json.loads(clean_text)
                
                # Validate that we have actual content in the SOAP sections
                if not any(soap_data.get(section, '').strip() for section in ['subjective', 'objective', 'assessment', 'plan']):
                    logger.error("Generated SOAP note has empty sections")
                    return self._parse_soap_from_text(response_text, style)
                
                logger.debug(f"Successfully parsed SOAP data: {list(soap_data.keys())}")
                return {
                    "success": True,
                    "soap": soap_data,
                    "style": style
                }
            except json.JSONDecodeError as e:
                # Fallback: try to extract SOAP sections from text
                return self._parse_soap_from_text(response_text, style)
                
        except Exception as e:
            logger.error(f"Error generating SOAP note: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "soap": None
            }
    
    async def generate_soap_from_transcript(self, transcript: str, patient_info: Dict[str, Any], template: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate SOAP note from transcription using template structure
        """
        try:
            from vertexai.generative_models import GenerativeModel
            
            # Create specialized prompt for transcription-based SOAP generation
            prompt = f"""
You are a veterinary AI assistant. Create a structured SOAP note from this voice transcription.

PATIENT: {patient_info.get('species', 'Unknown')} ({patient_info.get('breed', 'Mixed')}, {patient_info.get('age', 'Unknown')} years, {patient_info.get('sex', 'Unknown')}, {patient_info.get('weight', 'Unknown')} lbs)

TRANSCRIPT:
{transcript}

INSTRUCTIONS:
1. Extract information ONLY from the transcript
2. If information is not mentioned, write "Not enough data provided"
3. Do NOT hallucinate or infer information
4. Use proper veterinary terminology
5. Structure according to SOAP format

Return ONLY a JSON object with this structure:
{{
  "subjective": "Patient history and owner observations from transcript...",
  "objective": "Physical examination findings from transcript...", 
  "assessment": "Clinical assessment and diagnosis from transcript...",
  "plan": "Treatment plan and follow-up from transcript..."
}}
"""
            
            model = GenerativeModel("gemini-2.5-flash-002")
            response = model.generate_content(prompt)
            response_text = response.text
            
            logger.debug(f"Gemini transcript SOAP response: {response_text}")
            
            # Parse JSON response
            try:
                # Clean response text
                clean_text = response_text.strip()
                if clean_text.startswith('```json'):
                    clean_text = clean_text[7:]
                    if clean_text.endswith('```'):
                        clean_text = clean_text[:-3]
                    clean_text = clean_text.strip()
                elif clean_text.startswith('```'):
                    clean_text = clean_text[3:]
                    if clean_text.endswith('```'):
                        clean_text = clean_text[:-3]
                    clean_text = clean_text.strip()
                
                soap_data = json.loads(clean_text)
                
                return {
                    "success": True,
                    "soap_content": soap_data
                }
                
            except json.JSONDecodeError:
                # Fallback to text parsing
                return {
                    "success": True,
                    "soap_content": response_text
                }
                
        except Exception as e:
            logger.error(f"Error generating SOAP from transcript: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def _parse_soap_from_text(self, text: str, style: str) -> Dict[str, Any]:
        """
        Fallback method to parse SOAP sections from text response.
        """
        sections = {"subjective": "", "objective": "", "assessment": "", "plan": ""}
        current_section = None
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line.upper().startswith('SUBJECTIVE'):
                current_section = 'subjective'
                sections[current_section] = line.replace('SUBJECTIVE:', '').strip()
            elif line.upper().startswith('OBJECTIVE'):
                current_section = 'objective'
                sections[current_section] = line.replace('OBJECTIVE:', '').strip()
            elif line.upper().startswith('ASSESSMENT'):
                current_section = 'assessment'
                sections[current_section] = line.replace('ASSESSMENT:', '').strip()
            elif line.upper().startswith('PLAN'):
                current_section = 'plan'
                sections[current_section] = line.replace('PLAN:', '').strip()
            elif current_section and line:
                sections[current_section] += " " + line
        
        return {
            "success": True,
            "soap": sections,
            "style": style
        }
    
    async def generate_client_summary(self, soap_data: Dict[str, str], pet_name: str = "your pet") -> Dict[str, Any]:
        """
        Generate a plain-language summary for pet owners.
        Pet name is added back after AI processing.
        """
        try:
            logger.debug(f"Generating client summary for SOAP data: {soap_data}")
            logger.debug(f"Pet name: {pet_name}")
            # Check if SOAP data has actual content
            soap_content = ' '.join([soap_data.get(k, '') for k in ['subjective', 'objective', 'assessment', 'plan']]).strip()
            if not soap_content or len(soap_content) < 20:
                logger.warning("SOAP data is empty or insufficient for client summary")
                return {
                    "success": True,
                    "summary": f"We examined {pet_name} today. Please contact us to discuss the visit details and any follow-up care needed."
                }

            prompt = f"""
Convert this veterinary SOAP note into a friendly, easy-to-understand summary for a pet owner.
Use simple language and focus on what the owner needs to know.

SOAP Note:
- Subjective: {soap_data.get('subjective', '')}
- Objective: {soap_data.get('objective', '')}
- Assessment: {soap_data.get('assessment', '')}
- Plan: {soap_data.get('plan', '')}

IMPORTANT CONSTRAINTS:
1. ONLY use information from the SOAP note above
2. DO NOT add, infer, or make up any details not in the SOAP note
3. If the SOAP note says "Not documented" or similar, acknowledge the limitation
4. Do not create fictional symptoms, treatments, or outcomes
5. Stick strictly to the facts provided

Generate a summary that:
1. Explains what was found during the visit (only from SOAP note)
2. Describes the diagnosis in simple terms (only from SOAP note)
3. Outlines the treatment plan and next steps (only from SOAP note)
4. Uses a warm, professional tone
5. If information is incomplete, acknowledge this appropriately

Do not include the pet's name in your response - it will be added later.
"""

            from vertexai import generative_models
            
            # Use Gemini 2.5 Flash model
            model = generative_models.GenerativeModel("gemini-2.5-flash")
            
            # Generate content
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "top_k": 40,
                    "max_output_tokens": 2048,  # Increased from 1024
                }
            )
            
            response_text = response.text
            logger.debug(f"Client summary response: {response_text[:200]}...")
            
            # Add pet name back to the summary
            summary = response_text.replace("your pet", pet_name).replace("the pet", pet_name)
            
            return {
                "success": True,
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"Error generating client summary: {str(e)}", exc_info=True)
            
            # Check if it's a token limit issue
            if "MAX_TOKENS" in str(e) or "finish_reason" in str(e):
                # Provide a fallback summary
                logger.warning("Hit token limit, providing fallback summary")
                fallback_summary = f"During today's visit, we examined {pet_name} and found the following:\n\n"
                
                if soap_data.get('assessment'):
                    fallback_summary += f"Diagnosis: {soap_data['assessment']}\n\n"
                
                if soap_data.get('plan'):
                    fallback_summary += f"Treatment Plan: {soap_data['plan']}\n\n"
                
                fallback_summary += "Please follow the treatment plan as discussed. Contact us if you have any questions or if symptoms worsen."
                
                return {
                    "success": True,
                    "summary": fallback_summary
                }
            
            return {
                "success": False,
                "error": str(e),
                "summary": None
            }
    
    async def validate_completeness(self, soap_data: Dict[str, str]) -> Dict[str, Any]:
        """
        Check if SOAP note is complete and suggest missing elements.
        """
        try:
            prompt = f"""
Review this veterinary SOAP note for completeness and clinical quality:

SUBJECTIVE: {soap_data.get('subjective', '')}
OBJECTIVE: {soap_data.get('objective', '')}  
ASSESSMENT: {soap_data.get('assessment', '')}
PLAN: {soap_data.get('plan', '')}

Identify any missing or incomplete elements that should typically be included in a comprehensive veterinary record:

1. Are vital signs mentioned in the objective section?
2. Is there a clear diagnosis or differential diagnosis?
3. Is there a treatment plan with specific medications/dosages?
4. Are follow-up instructions included?
5. Is the owner communication documented?

Respond with a JSON object:
{{
    "completeness_score": 0.85,
    "missing_elements": ["vital signs", "medication dosages"],
    "suggestions": ["Consider adding weight and temperature", "Specify medication dosages and frequency"]
}}
"""

            from vertexai import generative_models
            
            # Use Gemini 2.5 Flash model
            model = generative_models.GenerativeModel("gemini-2.5-flash")
            
            # Generate content
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,
                    "top_p": 0.8,
                    "top_k": 40,
                    "max_output_tokens": 1024,
                }
            )
            
            response_text = response.text
            
            try:
                validation_data = json.loads(response_text)
                return {
                    "success": True,
                    "validation": validation_data
                }
            except json.JSONDecodeError:
                # Fallback validation
                return {
                    "success": True,
                    "validation": {
                        "completeness_score": 0.8,
                        "missing_elements": [],
                        "suggestions": ["Manual review recommended"]
                    }
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "validation": None
            }