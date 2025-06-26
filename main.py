from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import json
from typing import List, Optional
import os
import shutil
from pathlib import Path
from dotenv import load_dotenv
import logging
import asyncio
import uuid

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Import our modules
from database import get_db, create_database
from models import User, Owner, Pet, Visit, Template, AudioFile, TranscriptionJob, Note, UserRole, SOAPSection, ExportHistory, ExportType, ExportStatus
from schemas import (
    UserCreate, UserLogin, User as UserSchema, Token,
    OwnerCreate, Owner as OwnerSchema,
    PetCreate, Pet as PetSchema,
    VisitCreate, Visit as VisitSchema,
    ChartGenerationRequest, ChartGenerationResponse,
    Template as TemplateSchema, TemplateCreate,
    ValidationResult, MedicalCoding,
    RefreshTokenRequest, AudioFile as AudioFileSchema,
    AudioFileUploadResponse, TranscriptionJob as TranscriptionJobSchema,
    Note as NoteSchema, NoteCreate, NoteStatus
)
from auth import (
    authenticate_user, create_access_token, get_current_active_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES,
    create_refresh_token, verify_refresh_token, get_user_by_email
)
from gemini_service import GeminiService
from transcription_service import transcription_service
from background_tasks import task_manager
from template_service import template_service
from soap_generation_service import soap_generation_service
from pdf_export_service import pdf_export_service
from email_service import email_service
from analytics_service import analytics_service
from team_service import team_service

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Pawscribed - Veterinary Documentation Assistant",
    description="HIPAA-compliant veterinary documentation system with AI assistance",
    version="1.0.0"
)

# CORS configuration - use environment variables for production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Initialize services
gemini_service = GeminiService()
security = HTTPBearer()

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_database()
    # Start background task processing
    await task_manager.start()

@app.on_event("shutdown")
async def shutdown_event():
    # Stop background task processing
    await task_manager.stop()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Pawscribed API"}

# Test endpoint for debugging
@app.get("/test-gemini")
async def test_gemini():
    """Test endpoint to verify Gemini is working"""
    try:
        test_data = {
            "age": 5,
            "species": "cat",
            "sex": "female",
            "weight": 4.5,
            "chief_complaint": "Sneezing",
            "symptoms": "Frequent sneezing, watery eyes",
            "physical_exam": "Normal vitals, clear nasal discharge",
            "diagnostic_findings": "None",
            "clinical_notes": "Cat has been sneezing for 2 days"
        }
        
        result = await gemini_service.generate_soap_note(test_data, "detailed")
        return {
            "test": "Gemini API Test",
            "success": result["success"],
            "soap": result.get("soap", {}),
            "error": result.get("error")
        }
    except Exception as e:
        return {"test": "Gemini API Test", "success": False, "error": str(e)}

# Authentication endpoints
@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    # Force lowercase trial role - FIXED VERSION
    user_role = "trial"  # Hardcoded lowercase to fix enum issue
    logger.debug(f"Creating user with role: {user_role}")
    
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        veterinary_license=user.veterinary_license,
        role=user_role,  # Use the hardcoded lowercase variable
        team_id=str(uuid.uuid4())  # Generate unique team ID
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": db_user.email})
    refresh_token = create_refresh_token(data={"sub": db_user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": db_user
    }

@app.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@app.get("/auth/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/auth/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    token_data = verify_refresh_token(request.refresh_token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = get_user_by_email(db, token_data["email"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Create new tokens
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

# Owner endpoints
@app.post("/owners", response_model=OwnerSchema)
async def create_owner(
    owner: OwnerCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_owner = Owner(**owner.dict())
    db.add(db_owner)
    db.commit()
    db.refresh(db_owner)
    return db_owner

@app.get("/owners", response_model=List[OwnerSchema])
async def read_owners(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    owners = db.query(Owner).offset(skip).limit(limit).all()
    return owners

@app.get("/owners/{owner_id}", response_model=OwnerSchema)
async def read_owner(
    owner_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    owner = db.query(Owner).filter(Owner.id == owner_id).first()
    if owner is None:
        raise HTTPException(status_code=404, detail="Owner not found")
    return owner

# Pet endpoints (Enhanced with search and filtering)
@app.post("/pets", response_model=PetSchema)
async def create_pet(
    pet: PetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify owner exists
    owner = db.query(Owner).filter(Owner.id == pet.owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    db_pet = Pet(**pet.dict())
    db.add(db_pet)
    db.commit()
    db.refresh(db_pet)
    # Load owner relationship
    db_pet.owner = owner
    return db_pet

@app.get("/pets", response_model=List[PetSchema])
async def read_pets(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    owner_id: int = None,
    species: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Pet).filter(Pet.is_active == True)
    
    # Search by name
    if search:
        query = query.filter(Pet.name.ilike(f"%{search}%"))
    
    # Filter by owner
    if owner_id:
        query = query.filter(Pet.owner_id == owner_id)
    
    # Filter by species
    if species:
        query = query.filter(Pet.species == species)
    
    pets = query.offset(skip).limit(limit).all()
    return pets

@app.get("/pets/{pet_id}", response_model=PetSchema)
async def read_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.is_active == True).first()
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet

@app.put("/pets/{pet_id}", response_model=PetSchema)
async def update_pet(
    pet_id: int,
    pet_update: PetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_pet = db.query(Pet).filter(Pet.id == pet_id, Pet.is_active == True).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Update fields
    for field, value in pet_update.dict(exclude_unset=True).items():
        setattr(db_pet, field, value)
    
    db.commit()
    db.refresh(db_pet)
    return db_pet

@app.delete("/pets/{pet_id}")
async def delete_pet(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_pet = db.query(Pet).filter(Pet.id == pet_id).first()
    if not db_pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    # Soft delete
    db_pet.is_active = False
    db.commit()
    return {"message": "Pet deleted successfully"}

# Visit endpoints
@app.post("/visits", response_model=VisitSchema)
async def create_visit(
    visit: VisitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_visit = Visit(**visit.dict(), veterinarian_id=current_user.id)
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit

@app.get("/visits", response_model=List[VisitSchema])
async def read_visits(
    skip: int = 0,
    limit: int = 100,
    pet_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Visit).filter(Visit.veterinarian_id == current_user.id)
    
    if pet_id:
        query = query.filter(Visit.pet_id == pet_id)
    
    visits = query.offset(skip).limit(limit).all()
    return visits

@app.get("/visits/{visit_id}", response_model=VisitSchema)
async def read_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.veterinarian_id == current_user.id
    ).first()
    if visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit

# Core AI-powered chart generation endpoint
@app.post("/generate-chart", response_model=ChartGenerationResponse)
async def generate_chart(
    request: ChartGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        logger.debug(f"Received chart generation request: {request}")
        
        # Verify pet exists and user has access
        pet = db.query(Pet).filter(Pet.id == request.pet_id).first()
        if not pet:
            logger.error(f"Pet not found with ID: {request.pet_id}")
            raise HTTPException(status_code=404, detail="Pet not found")
        
        logger.debug(f"Found pet: {pet.name}, species: {pet.species}, age: {pet.age}")
        
        # Prepare clinical data for AI processing
        clinical_data = {
            "age": pet.age,
            "species": pet.species,
            "sex": pet.sex,
            "weight": pet.weight,
            "chief_complaint": request.chief_complaint,
            "symptoms": request.symptoms,
            "physical_exam": request.physical_exam,
            "diagnostic_findings": request.diagnostic_findings,
            "clinical_notes": request.clinical_notes
        }
        
        # Generate SOAP note using Gemini (PII-protected)
        soap_result = await gemini_service.generate_soap_note(clinical_data, request.style or "detailed")
        
        logger.debug(f"SOAP generation result: success={soap_result['success']}")
        
        if not soap_result["success"]:
            logger.error(f"SOAP generation failed: {soap_result['error']}")
            return ChartGenerationResponse(
                success=False,
                error=soap_result["error"],
                soap={
                    "subjective": "Error generating SOAP note. Please try again.",
                    "objective": "",
                    "assessment": "",
                    "plan": ""
                }
            )
        
        soap_data = soap_result["soap"]
        logger.debug(f"Generated SOAP sections: {list(soap_data.keys())}")
        
        # Create visit record in database
        db_visit = Visit(
            pet_id=request.pet_id,
            veterinarian_id=current_user.id,
            visit_type=request.visit_type,
            chief_complaint=request.chief_complaint,
            subjective=soap_data.get("subjective"),
            objective=soap_data.get("objective"),
            assessment=soap_data.get("assessment"),
            plan=soap_data.get("plan"),
            original_notes=request.clinical_notes
        )
        
        db.add(db_visit)
        db.commit()
        db.refresh(db_visit)
        
        # Generate client summary
        logger.debug(f"Generating client summary for pet: {pet.name}")
        client_summary_result = await gemini_service.generate_client_summary(
            soap_data, pet.name
        )
        
        if client_summary_result["success"]:
            db_visit.client_summary = client_summary_result["summary"]
            logger.debug("Client summary generated successfully")
        else:
            logger.warning(f"Client summary generation failed: {client_summary_result['error']}")
            # Provide a default summary
            db_visit.client_summary = f"Visit summary for {pet.name}: {soap_data.get('assessment', 'Assessment pending')}. Please see the detailed SOAP note for complete information."
        
        # Validate completeness
        validation_result = await gemini_service.validate_completeness(soap_data)
        
        if validation_result["success"]:
            validation_data = validation_result["validation"]
            db_visit.completeness_score = validation_data.get("completeness_score")
            db_visit.missing_elements = json.dumps(validation_data.get("missing_elements", []))
        
        db.commit()
        
        # Ensure we always return valid data
        response_data = ChartGenerationResponse(
            success=True,
            visit_id=db_visit.id,
            soap=soap_data,
            client_summary=db_visit.client_summary or client_summary_result.get("summary", ""),
            validation=validation_result.get("validation", {
                "completeness_score": 0.8,
                "missing_elements": [],
                "suggestions": []
            })
        )
        
        logger.debug(f"Returning response with SOAP sections: {list(soap_data.keys())}")
        logger.debug(f"Client summary length: {len(response_data.client_summary)}")
        
        return response_data
        
    except Exception as e:
        logger.error(f"Exception in generate_chart: {str(e)}", exc_info=True)
        return ChartGenerationResponse(
            success=False,
            error=str(e),
            soap={
                "subjective": "",
                "objective": "",
                "assessment": "",
                "plan": ""
            }
        )

# Template endpoints
@app.get("/templates")
async def get_templates(
    template_type: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get available templates for the user"""
    templates = template_service.get_user_templates(current_user.id, db)
    
    # Filter by type if specified
    if template_type:
        templates = [t for t in templates if t["template_type"] == template_type]
    
    # Filter by category if specified
    if category:
        templates = [t for t in templates if t["category"] == category]
    
    return {"templates": templates}

@app.get("/templates/{template_id}")
async def get_template_structure(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the complete structure of a template"""
    # Check if it's a built-in template
    if not template_id.isdigit():
        template_structure = template_service.get_template_structure(template_id)
        if template_structure:
            return template_structure
        else:
            raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if it's a custom template
    template = db.query(Template).filter(
        Template.id == int(template_id),
        Template.created_by == current_user.id,
        Template.is_active == True
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    import json
    return json.loads(template.template_content)

@app.post("/templates")
async def create_custom_template(
    template_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a custom template"""
    # Validate template structure
    errors = template_service.validate_template_data(template_data)
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    try:
        template = template_service.create_custom_template(
            template_data, current_user.id, db
        )
        return {
            "id": template.id,
            "message": "Template created successfully",
            "template": {
                "id": str(template.id),
                "name": template.name,
                "template_type": template.template_type
            }
        }
    except Exception as e:
        logger.error(f"Failed to create template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create template")

# Validation endpoint
@app.post("/validate-chart/{visit_id}", response_model=ValidationResult)  
async def validate_chart(
    visit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.veterinarian_id == current_user.id
    ).first()
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    soap_data = {
        "subjective": visit.subjective or "",
        "objective": visit.objective or "",
        "assessment": visit.assessment or "",
        "plan": visit.plan or ""
    }
    
    validation_result = await gemini_service.validate_completeness(soap_data)
    
    if not validation_result["success"]:
        raise HTTPException(status_code=500, detail="Validation failed")
    
    return validation_result["validation"]

# Audio file endpoints
@app.post("/audio/upload", response_model=AudioFileUploadResponse)
async def upload_audio(
    file: UploadFile = File(...),
    patient_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Validate file type
    allowed_types = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/m4a", "audio/x-m4a"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (100MB limit)
    file_size = 0
    contents = await file.read()
    file_size = len(contents)
    await file.seek(0)  # Reset file pointer
    
    if file_size > 100 * 1024 * 1024:  # 100MB
        raise HTTPException(status_code=400, detail="File size exceeds 100MB limit")
    
    # Create upload directory if it doesn't exist
    upload_dir = Path("uploads/audio")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{current_user.id}_{timestamp}_{file.filename}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, 'wb') as f:
        f.write(contents)
    
    # Create database record
    db_audio = AudioFile(
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=file.content_type
    )
    db.add(db_audio)
    db.commit()
    db.refresh(db_audio)
    
    # Create transcription job
    db_job = TranscriptionJob(
        audio_file_id=db_audio.id,
        status="pending"
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Transcription will be processed by background task manager
    logger.info(f"Created transcription job {db_job.id} for audio file {db_audio.id}")
    
    return {
        "audio_file_id": db_audio.id,
        "transcription_job_id": db_job.id,
        "message": "Audio file uploaded successfully. Transcription started."
    }

@app.get("/audio/files", response_model=List[AudioFileSchema])
async def list_audio_files(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    files = db.query(AudioFile).filter(
        AudioFile.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return files

# Transcription endpoints
@app.get("/transcriptions/{job_id}", response_model=TranscriptionJobSchema)
async def get_transcription_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    job = db.query(TranscriptionJob).join(AudioFile).filter(
        TranscriptionJob.id == job_id,
        AudioFile.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Transcription job not found")
    
    return job

# Note management endpoints
@app.post("/notes", response_model=NoteSchema)
async def create_note(
    note: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify patient exists if provided
    if note.patient_id:
        patient = db.query(Pet).filter(Pet.id == note.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
    
    db_note = Note(
        **note.dict(),
        user_id=current_user.id,
        status=NoteStatus.DRAFT
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

@app.get("/notes", response_model=List[NoteSchema])
async def list_notes(
    skip: int = 0,
    limit: int = 100,
    status: Optional[NoteStatus] = None,
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Note).filter(Note.user_id == current_user.id)
    
    if status:
        query = query.filter(Note.status == status)
    
    if patient_id:
        query = query.filter(Note.patient_id == patient_id)
    
    notes = query.order_by(Note.created_at.desc()).offset(skip).limit(limit).all()
    return notes

@app.get("/notes/{note_id}", response_model=NoteSchema)
async def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return note

@app.put("/notes/{note_id}/status")
async def update_note_status(
    note_id: int,
    status: NoteStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.status = status
    note.updated_at = datetime.utcnow()
    
    if status == NoteStatus.EXPORTED:
        note.exported_at = datetime.utcnow()
    
    db.commit()
    return {"message": f"Note status updated to {status}"}

# SOAP Note Generation endpoints
@app.post("/notes/generate-from-transcription")
async def generate_soap_from_transcription(
    transcription_job_id: int,
    patient_id: int,
    template_type: str = "soap_standard",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate a SOAP note from a transcription job"""
    try:
        result = await soap_generation_service.generate_soap_from_transcription(
            transcription_job_id=transcription_job_id,
            patient_id=patient_id,
            template_type=template_type,
            user_id=current_user.id,
            db=db
        )
        
        if result["success"]:
            return {
                "success": True,
                "note_id": result["note_id"],
                "message": "SOAP note generated successfully",
                "confidence_score": result.get("confidence_score"),
                "sections_created": result.get("sections_created")
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except Exception as e:
        logger.error(f"SOAP generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate SOAP note")

@app.get("/notes/{note_id}/complete")
async def get_complete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a complete note with all SOAP sections"""
    # Verify note belongs to user
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    result = soap_generation_service.get_note_with_sections(note_id, db)
    
    if result["success"]:
        return result
    else:
        raise HTTPException(status_code=500, detail=result["error"])

@app.put("/notes/{note_id}/sections/{section_id}")
async def update_soap_section(
    note_id: int,
    section_id: int,
    section_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a specific SOAP section"""
    # Verify note belongs to user
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Get the section
    section = db.query(SOAPSection).filter(
        SOAPSection.id == section_id,
        SOAPSection.note_id == note_id
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    # Update section fields
    if "content" in section_update:
        section.content = section_update["content"]
    
    if "vitals" in section_update and section.section_type == "objective":
        vitals = section_update["vitals"]
        section.temperature = vitals.get("temperature")
        section.heart_rate = vitals.get("heart_rate")
        section.respiratory_rate = vitals.get("respiratory_rate")
        section.weight = vitals.get("weight")
    
    section.updated_at = datetime.utcnow()
    note.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Section updated successfully"}

# Workflow statistics endpoint
@app.get("/workflow/stats")
async def get_workflow_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    stats = {}
    for status in NoteStatus:
        count = db.query(Note).filter(
            Note.user_id == current_user.id,
            Note.status == status
        ).count()
        stats[status.value] = count
    
    return stats

# Batch operations endpoints
@app.post("/notes/batch/status")
async def batch_update_note_status(
    note_ids: List[int],
    status: NoteStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update status for multiple notes"""
    notes = db.query(Note).filter(
        Note.id.in_(note_ids),
        Note.user_id == current_user.id
    ).all()
    
    if len(notes) != len(note_ids):
        raise HTTPException(status_code=404, detail="Some notes not found")
    
    updated_count = 0
    for note in notes:
        note.status = status
        note.updated_at = datetime.utcnow()
        
        if status == NoteStatus.EXPORTED:
            note.exported_at = datetime.utcnow()
        
        updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Updated {updated_count} notes to {status.value}",
        "updated_count": updated_count
    }

@app.delete("/notes/batch")
async def batch_delete_notes(
    note_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete multiple notes"""
    # Verify all notes belong to user
    notes = db.query(Note).filter(
        Note.id.in_(note_ids),
        Note.user_id == current_user.id
    ).all()
    
    if len(notes) != len(note_ids):
        raise HTTPException(status_code=404, detail="Some notes not found")
    
    # Delete associated SOAP sections first
    for note in notes:
        db.query(SOAPSection).filter(SOAPSection.note_id == note.id).delete()
    
    # Delete notes
    deleted_count = db.query(Note).filter(
        Note.id.in_(note_ids),
        Note.user_id == current_user.id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {
        "message": f"Deleted {deleted_count} notes",
        "deleted_count": deleted_count
    }

@app.post("/notes/batch/export")
async def batch_export_notes(
    note_ids: List[int],
    export_format: str = "pdf",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export multiple notes (placeholder for future PDF/email implementation)"""
    notes = db.query(Note).filter(
        Note.id.in_(note_ids),
        Note.user_id == current_user.id
    ).all()
    
    if len(notes) != len(note_ids):
        raise HTTPException(status_code=404, detail="Some notes not found")
    
    # For now, just update their status to ready_to_export
    exported_count = 0
    for note in notes:
        note.status = NoteStatus.READY_TO_EXPORT
        note.updated_at = datetime.utcnow()
        exported_count += 1
    
    db.commit()
    
    return {
        "message": f"Prepared {exported_count} notes for export",
        "exported_count": exported_count,
        "format": export_format,
        "status": "Export system will be implemented in next phase"
    }

# Export system endpoints
@app.post("/export/pdf/{note_id}")
async def export_note_pdf(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export a single note as PDF"""
    try:
        # Create export history record
        export_record = ExportHistory(
            user_id=current_user.id,
            export_type=ExportType.PDF,
            status=ExportStatus.PROCESSING,
            note_ids=json.dumps([note_id]),
            notes_count=1,
            export_format="pdf"
        )
        db.add(export_record)
        db.commit()
        db.refresh(export_record)
        
        # Generate PDF
        clinic_info = {
            "name": os.getenv("CLINIC_NAME", "Veterinary Clinic"),
            "address": os.getenv("CLINIC_ADDRESS", ""),
            "phone": os.getenv("CLINIC_PHONE", ""),
            "email": os.getenv("CLINIC_EMAIL", "")
        }
        
        result = await pdf_export_service.generate_note_pdf(note_id, db, clinic_info)
        
        if result["success"]:
            # Update export record
            export_record.status = ExportStatus.COMPLETED
            export_record.file_path = result["pdf_path"]
            export_record.file_size = result["file_size"]
            export_record.completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "export_id": export_record.id,
                "pdf_filename": result["pdf_filename"],
                "download_url": f"/export/download/{export_record.id}"
            }
        else:
            # Update export record with error
            export_record.status = ExportStatus.FAILED
            export_record.error_message = result["error"]
            db.commit()
            
            raise HTTPException(status_code=500, detail=result["error"])
            
    except Exception as e:
        logger.error(f"PDF export failed for note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="PDF export failed")

@app.post("/export/pdf/batch")
async def export_batch_pdf(
    note_ids: List[int],
    combine_notes: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export multiple notes as PDF"""
    try:
        # Create export history record
        export_record = ExportHistory(
            user_id=current_user.id,
            export_type=ExportType.PDF,
            status=ExportStatus.PROCESSING,
            note_ids=json.dumps(note_ids),
            notes_count=len(note_ids),
            export_format="pdf",
            export_options=json.dumps({"combine_notes": combine_notes})
        )
        db.add(export_record)
        db.commit()
        db.refresh(export_record)
        
        # Generate PDF
        clinic_info = {
            "name": os.getenv("CLINIC_NAME", "Veterinary Clinic"),
            "address": os.getenv("CLINIC_ADDRESS", ""),
            "phone": os.getenv("CLINIC_PHONE", ""),
            "email": os.getenv("CLINIC_EMAIL", "")
        }
        
        result = await pdf_export_service.generate_batch_pdf(
            note_ids, db, clinic_info, combine_notes
        )
        
        if result["success"]:
            # Update export record
            export_record.status = ExportStatus.COMPLETED
            if combine_notes:
                export_record.file_path = result["pdf_path"]
                export_record.file_size = result["file_size"]
            export_record.completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "export_id": export_record.id,
                "notes_count": len(note_ids),
                "combine_notes": combine_notes,
                "download_url": f"/export/download/{export_record.id}" if combine_notes else None,
                "result": result
            }
        else:
            # Update export record with error
            export_record.status = ExportStatus.FAILED
            export_record.error_message = result["error"]
            db.commit()
            
            raise HTTPException(status_code=500, detail=result["error"])
            
    except Exception as e:
        logger.error(f"Batch PDF export failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Batch PDF export failed")

@app.post("/export/email/{note_id}")
async def email_note_pdf(
    note_id: int,
    recipient_email: str,
    recipient_name: str,
    custom_message: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Email a note as PDF attachment"""
    try:
        # Create export history record
        export_record = ExportHistory(
            user_id=current_user.id,
            export_type=ExportType.EMAIL,
            status=ExportStatus.PROCESSING,
            note_ids=json.dumps([note_id]),
            notes_count=1,
            export_format="pdf",
            recipient_email=recipient_email,
            recipient_name=recipient_name
        )
        db.add(export_record)
        db.commit()
        db.refresh(export_record)
        
        # Generate PDF first
        clinic_info = {
            "name": os.getenv("CLINIC_NAME", "Veterinary Clinic"),
            "address": os.getenv("CLINIC_ADDRESS", ""),
            "phone": os.getenv("CLINIC_PHONE", ""),
            "email": os.getenv("CLINIC_EMAIL", "")
        }
        
        pdf_result = await pdf_export_service.generate_note_pdf(note_id, db, clinic_info)
        
        if not pdf_result["success"]:
            export_record.status = ExportStatus.FAILED
            export_record.error_message = pdf_result["error"]
            db.commit()
            raise HTTPException(status_code=500, detail=pdf_result["error"])
        
        # Send email with PDF
        email_result = await email_service.send_note_pdf(
            note_id,
            pdf_result["pdf_data"],
            pdf_result["pdf_filename"],
            recipient_email,
            recipient_name,
            db,
            custom_message
        )
        
        if email_result["success"]:
            # Update export record
            export_record.status = ExportStatus.COMPLETED
            export_record.email_subject = email_result.get("subject")
            export_record.email_sent_at = datetime.utcnow()
            export_record.completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "export_id": export_record.id,
                "message": email_result["message"],
                "recipient": recipient_email
            }
        else:
            # Update export record with error
            export_record.status = ExportStatus.FAILED
            export_record.error_message = email_result["error"]
            db.commit()
            
            raise HTTPException(status_code=500, detail=email_result["error"])
            
    except Exception as e:
        logger.error(f"Email export failed for note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Email export failed")

@app.post("/export/email/batch")
async def email_batch_notes(
    note_ids: List[int],
    recipient_email: str,
    recipient_name: str,
    custom_message: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Email multiple notes as PDF attachments"""
    try:
        # Create export history record
        export_record = ExportHistory(
            user_id=current_user.id,
            export_type=ExportType.EMAIL,
            status=ExportStatus.PROCESSING,
            note_ids=json.dumps(note_ids),
            notes_count=len(note_ids),
            export_format="pdf",
            recipient_email=recipient_email,
            recipient_name=recipient_name
        )
        db.add(export_record)
        db.commit()
        db.refresh(export_record)
        
        # Generate PDFs for all notes
        clinic_info = {
            "name": os.getenv("CLINIC_NAME", "Veterinary Clinic"),
            "address": os.getenv("CLINIC_ADDRESS", ""),
            "phone": os.getenv("CLINIC_PHONE", ""),
            "email": os.getenv("CLINIC_EMAIL", "")
        }
        
        pdf_files = []
        for note_id in note_ids:
            pdf_result = await pdf_export_service.generate_note_pdf(note_id, db, clinic_info)
            if pdf_result["success"]:
                pdf_files.append(pdf_result)
        
        if not pdf_files:
            export_record.status = ExportStatus.FAILED
            export_record.error_message = "No PDFs could be generated"
            db.commit()
            raise HTTPException(status_code=500, detail="No PDFs could be generated")
        
        # Send batch email
        email_result = await email_service.send_batch_notes(
            note_ids,
            pdf_files,
            recipient_email,
            recipient_name,
            db,
            custom_message
        )
        
        if email_result["success"]:
            # Update export record
            export_record.status = ExportStatus.COMPLETED
            export_record.email_subject = email_result.get("subject")
            export_record.email_sent_at = datetime.utcnow()
            export_record.completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "export_id": export_record.id,
                "message": email_result["message"],
                "recipient": recipient_email,
                "attachments_sent": len(pdf_files)
            }
        else:
            # Update export record with error
            export_record.status = ExportStatus.FAILED
            export_record.error_message = email_result["error"]
            db.commit()
            
            raise HTTPException(status_code=500, detail=email_result["error"])
            
    except Exception as e:
        logger.error(f"Batch email export failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Batch email export failed")

@app.get("/export/download/{export_id}")
async def download_export(
    export_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Download an exported file"""
    export_record = db.query(ExportHistory).filter(
        ExportHistory.id == export_id,
        ExportHistory.user_id == current_user.id
    ).first()
    
    if not export_record:
        raise HTTPException(status_code=404, detail="Export not found")
    
    if export_record.status != ExportStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Export not completed")
    
    if not export_record.file_path or not os.path.exists(export_record.file_path):
        raise HTTPException(status_code=404, detail="Export file not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        export_record.file_path,
        filename=os.path.basename(export_record.file_path),
        media_type="application/pdf"
    )

@app.get("/export/history")
async def get_export_history(
    skip: int = 0,
    limit: int = 50,
    export_type: Optional[ExportType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get export history for the current user"""
    query = db.query(ExportHistory).filter(ExportHistory.user_id == current_user.id)
    
    if export_type:
        query = query.filter(ExportHistory.export_type == export_type)
    
    exports = query.order_by(ExportHistory.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": export.id,
            "export_type": export.export_type.value,
            "status": export.status.value,
            "notes_count": export.notes_count,
            "export_format": export.export_format,
            "recipient_email": export.recipient_email,
            "created_at": export.created_at.isoformat(),
            "completed_at": export.completed_at.isoformat() if export.completed_at else None,
            "error_message": export.error_message
        }
        for export in exports
    ]

@app.get("/export/test-email")
async def test_email_connection(
    current_user: User = Depends(get_current_active_user)
):
    """Test email configuration"""
    result = email_service.test_connection()
    return result

# Analytics endpoints
@app.get("/analytics/workflow")
async def get_workflow_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive workflow analytics"""
    try:
        # Parse dates if provided
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        result = await analytics_service.get_workflow_analytics(
            user_id=current_user.id,
            db=db,
            start_date=start_date_obj,
            end_date=end_date_obj
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Analytics request failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")

@app.get("/analytics/performance")
async def get_performance_summary(
    period: str = "week",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get performance summary for different time periods"""
    try:
        if period not in ["week", "month", "quarter"]:
            raise HTTPException(status_code=400, detail="Invalid period. Use: week, month, quarter")
        
        result = await analytics_service.get_performance_summary(
            user_id=current_user.id,
            db=db,
            period=period
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Performance summary request failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve performance summary")

# Team Management endpoints
@app.post("/team/members")
async def create_team_member(
    member_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new team member (admin only)"""
    result = team_service.create_team_member(current_user.id, member_data, db)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.get("/team/members")
async def get_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all team members"""
    result = team_service.get_team_members(current_user.id, db)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.put("/team/members/{member_id}")
async def update_team_member(
    member_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update team member (admin only)"""
    result = team_service.update_team_member(current_user.id, member_id, update_data, db)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.delete("/team/members/{member_id}")
async def remove_team_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove team member (admin only)"""
    result = team_service.remove_team_member(current_user.id, member_id, db)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

@app.get("/team/activity")
async def get_team_activity(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent team activity"""
    result = team_service.get_team_activity(current_user.id, db, days)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)