from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import enum

Base = declarative_base()

# Enums
class UserRole(str, enum.Enum):
    PRACTICE_OWNER = "practice_owner"
    ADMIN = "admin"
    VETERINARIAN = "veterinarian"
    TECHNICIAN = "technician"
    TRIAL = "trial"

class NoteStatus(str, enum.Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    AVAILABLE_FOR_REVIEW = "available_for_review"
    READY_TO_EXPORT = "ready_to_export"
    EXPORTED = "exported"

class TranscriptionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ExportType(str, enum.Enum):
    PDF = "pdf"
    EMAIL = "email"
    PRINT = "print"

class ExportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    veterinary_license = Column(String)
    role = Column(String, default="trial")
    team_id = Column(String, nullable=True, index=True)  # UUID for team identification
    is_active = Column(Boolean, default=True)
    trial_expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=14))
    subscription_plan = Column(String, default="trial")
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    visits = relationship("Visit", back_populates="veterinarian")
    audio_files = relationship("AudioFile", back_populates="user")
    notes = relationship("Note", back_populates="user")
    templates = relationship("Template", back_populates="created_by_user")

class Owner(Base):
    __tablename__ = "owners"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    phone = Column(String)
    address_line1 = Column(String)
    address_line2 = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pets = relationship("Pet", back_populates="owner")
    is_active = Column(Boolean, default=True)

class Pet(Base):
    __tablename__ = "pets"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    species = Column(String)
    breed = Column(String)
    age = Column(Integer)
    weight = Column(Float)
    sex = Column(String)
    color = Column(String)
    microchip_id = Column(String)
    owner_id = Column(Integer, ForeignKey("owners.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("Owner", back_populates="pets")
    visits = relationship("Visit", back_populates="pet")
    notes = relationship("Note", back_populates="patient")
    is_active = Column(Boolean, default=True)

class Visit(Base):
    __tablename__ = "visits"
    
    id = Column(Integer, primary_key=True, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id"))
    veterinarian_id = Column(Integer, ForeignKey("users.id"))
    visit_date = Column(DateTime, default=datetime.utcnow)
    visit_type = Column(String)  # wellness, injury, dental, etc.
    chief_complaint = Column(Text)
    
    # SOAP Notes
    subjective = Column(Text)
    objective = Column(Text)
    assessment = Column(Text)
    plan = Column(Text)
    
    # Original clinical notes (what the vet dictated/typed)
    original_notes = Column(Text)
    
    # Generated summaries
    client_summary = Column(Text)  # Plain language for pet owner
    
    # Compliance and validation
    completeness_score = Column(Float)
    missing_elements = Column(Text)  # JSON string of missing elements
    
    # Billing
    diagnostic_codes = Column(Text)  # JSON string of suggested codes
    treatment_codes = Column(Text)  # JSON string of suggested codes
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    pet = relationship("Pet", back_populates="visits")
    veterinarian = relationship("User", back_populates="visits")
    notes = relationship("Note", back_populates="visit")

class AudioFile(Base):
    __tablename__ = "audio_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)  # in bytes
    duration = Column(Float)  # in seconds
    mime_type = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audio_files")
    transcription_jobs = relationship("TranscriptionJob", back_populates="audio_file")

class TranscriptionJob(Base):
    __tablename__ = "transcription_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    audio_file_id = Column(Integer, ForeignKey("audio_files.id"))
    status = Column(Enum(TranscriptionStatus), default=TranscriptionStatus.PENDING)
    transcript = Column(Text)
    confidence_score = Column(Float)
    error_message = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    audio_file = relationship("AudioFile", back_populates="transcription_jobs")
    notes = relationship("Note", back_populates="transcription_job")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    patient_id = Column(Integer, ForeignKey("pets.id"))
    transcription_job_id = Column(Integer, ForeignKey("transcription_jobs.id"))
    visit_id = Column(Integer, ForeignKey("visits.id"), nullable=True)
    
    title = Column(String)
    note_type = Column(String, default="soap")  # soap, callback, dental, etc.
    status = Column(Enum(NoteStatus), default=NoteStatus.DRAFT)
    
    # Original content
    original_transcript = Column(Text)
    
    # Generated content
    generated_content = Column(Text)  # JSON with structured content
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    exported_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="notes")
    patient = relationship("Pet", back_populates="notes")
    transcription_job = relationship("TranscriptionJob", back_populates="notes")
    visit = relationship("Visit", back_populates="notes")
    soap_sections = relationship("SOAPSection", back_populates="note", cascade="all, delete-orphan")

class SOAPSection(Base):
    __tablename__ = "soap_sections"
    
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    section_type = Column(String)  # subjective, objective, assessment, plan
    content = Column(Text)
    order_index = Column(Integer)
    
    # For objective section - vital signs
    temperature = Column(Float)
    heart_rate = Column(Integer)
    respiratory_rate = Column(Integer)
    weight = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    note = relationship("Note", back_populates="soap_sections")

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    template_type = Column(String)  # soap, dental, callback, etc.
    category = Column(String)  # medical, surgical, wellness, etc.
    template_content = Column(Text)  # JSON string with template structure
    is_default = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by_user = relationship("User", back_populates="templates")

class ExportHistory(Base):
    __tablename__ = "export_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    export_type = Column(Enum(ExportType))
    status = Column(Enum(ExportStatus), default=ExportStatus.PENDING)
    
    # Notes being exported
    note_ids = Column(Text)  # JSON array of note IDs
    notes_count = Column(Integer)
    
    # Export details
    export_format = Column(String, default="pdf")  # pdf, docx, etc.
    file_path = Column(String)  # Path to generated file
    file_size = Column(Integer)  # File size in bytes
    
    # Email details (if export_type is EMAIL)
    recipient_email = Column(String)
    recipient_name = Column(String)
    email_subject = Column(String)
    email_sent_at = Column(DateTime)
    
    # Metadata
    export_options = Column(Text)  # JSON with export options
    error_message = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User")