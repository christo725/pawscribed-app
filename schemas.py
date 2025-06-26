from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    VET = "vet"
    STAFF = "staff"
    TRIAL = "trial"

class NoteStatus(str, Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    AVAILABLE_FOR_REVIEW = "available_for_review"
    READY_TO_EXPORT = "ready_to_export"
    EXPORTED = "exported"

class TranscriptionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    veterinary_license: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    role: UserRole
    is_active: bool
    trial_expires_at: Optional[datetime] = None
    subscription_plan: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    expires_in: int
    user: User

# Owner schemas
class OwnerBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

class OwnerCreate(OwnerBase):
    pass

class Owner(OwnerBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Pet schemas
class PetBase(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    sex: Optional[str] = None
    color: Optional[str] = None
    microchip_id: Optional[str] = None

class PetCreate(PetBase):
    owner_id: int

class Pet(PetBase):
    id: int
    owner_id: int
    created_at: datetime
    owner: Optional[Owner] = None
    
    class Config:
        from_attributes = True

# Visit schemas
class VisitBase(BaseModel):
    visit_type: str
    chief_complaint: Optional[str] = None

class VisitCreate(VisitBase):
    pet_id: int

class SOAPNote(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None

class Visit(VisitBase):
    id: int
    pet_id: int
    veterinarian_id: int
    visit_date: datetime
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    original_notes: Optional[str] = None
    client_summary: Optional[str] = None
    completeness_score: Optional[float] = None
    missing_elements: Optional[str] = None
    diagnostic_codes: Optional[str] = None
    treatment_codes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    pet: Optional[Pet] = None
    
    class Config:
        from_attributes = True

# Chart generation schemas
class ChartGenerationRequest(BaseModel):
    pet_id: int
    visit_type: str
    clinical_notes: str
    chief_complaint: Optional[str] = None
    symptoms: Optional[str] = None
    physical_exam: Optional[str] = None
    diagnostic_findings: Optional[str] = None
    style: Optional[str] = "detailed"  # concise, detailed, legal-ready

class ChartGenerationResponse(BaseModel):
    success: bool
    visit_id: Optional[int] = None
    soap: Optional[SOAPNote] = None
    client_summary: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Audio File schemas
class AudioFileBase(BaseModel):
    filename: str
    file_size: int
    duration: Optional[float] = None
    mime_type: str

class AudioFileCreate(AudioFileBase):
    pass

class AudioFile(AudioFileBase):
    id: int
    user_id: int
    file_path: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

class AudioFileUploadResponse(BaseModel):
    audio_file_id: int
    transcription_job_id: int
    message: str

# Transcription schemas
class TranscriptionJobBase(BaseModel):
    audio_file_id: int

class TranscriptionJobCreate(TranscriptionJobBase):
    pass

class TranscriptionJob(TranscriptionJobBase):
    id: int
    status: TranscriptionStatus
    transcript: Optional[str] = None
    confidence_score: Optional[float] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Note schemas
class NoteBase(BaseModel):
    title: str
    note_type: str = "soap"
    patient_id: Optional[int] = None

class NoteCreate(NoteBase):
    transcription_job_id: Optional[int] = None
    original_transcript: Optional[str] = None

class Note(NoteBase):
    id: int
    user_id: int
    status: NoteStatus
    original_transcript: Optional[str] = None
    generated_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    exported_at: Optional[datetime] = None
    patient: Optional[Pet] = None
    
    class Config:
        from_attributes = True

# SOAP Section schemas
class SOAPSectionBase(BaseModel):
    section_type: str  # subjective, objective, assessment, plan
    content: str
    order_index: int = 0
    # Vital signs (for objective section)
    temperature: Optional[float] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    weight: Optional[float] = None

class SOAPSectionCreate(SOAPSectionBase):
    note_id: int

class SOAPSection(SOAPSectionBase):
    id: int
    note_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Template schemas
class TemplateBase(BaseModel):
    name: str
    visit_type: str
    template_content: str

class TemplateCreate(TemplateBase):
    pass

class Template(TemplateBase):
    id: int
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Auth schemas
class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserUpdateProfile(BaseModel):
    full_name: Optional[str] = None
    veterinary_license: Optional[str] = None

# Voice input schema
class VoiceInputRequest(BaseModel):
    audio_data: str  # base64 encoded audio
    pet_id: int
    visit_type: str

# Validation schemas
class ValidationResult(BaseModel):
    completeness_score: float
    missing_elements: List[str]
    suggestions: List[str]

# Medical coding schemas
class MedicalCoding(BaseModel):
    diagnostic_codes: List[Dict[str, str]]
    treatment_codes: List[Dict[str, str]]
    billing_opportunities: List[str]