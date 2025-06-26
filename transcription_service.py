"""
Vertex AI Speech-to-Text transcription service
Handles audio file transcription using Google Cloud Vertex AI
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any
from pathlib import Path
from datetime import datetime
from google.cloud import speech
from google.oauth2 import service_account
from sqlalchemy.orm import Session
from models import TranscriptionJob, AudioFile, TranscriptionStatus
import json

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
        
        # Initialize Google Cloud Speech client
        if self.credentials_path and os.path.exists(self.credentials_path):
            credentials = service_account.Credentials.from_service_account_file(
                self.credentials_path
            )
            self.client = speech.SpeechClient(credentials=credentials)
        else:
            logger.warning("Google Cloud credentials not found. Using default credentials.")
            self.client = speech.SpeechClient()
    
    async def transcribe_audio(self, audio_file_path: str, job_id: int, db: Session) -> Dict[str, Any]:
        """
        Transcribe audio file using Google Cloud Speech-to-Text
        """
        try:
            # Update job status to processing
            job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
            if not job:
                return {"success": False, "error": "Transcription job not found"}
            
            job.status = TranscriptionStatus.PROCESSING
            job.started_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Starting transcription for job {job_id}: {audio_file_path}")
            
            # Read audio file
            if not os.path.exists(audio_file_path):
                error_msg = f"Audio file not found: {audio_file_path}"
                logger.error(error_msg)
                job.status = TranscriptionStatus.FAILED
                job.error_message = error_msg
                job.completed_at = datetime.utcnow()
                db.commit()
                return {"success": False, "error": error_msg}
            
            with open(audio_file_path, "rb") as audio_file:
                content = audio_file.read()
            
            # Configure audio settings
            audio = speech.RecognitionAudio(content=content)
            
            # Determine audio encoding from file extension
            file_extension = Path(audio_file_path).suffix.lower()
            if file_extension in ['.wav']:
                encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
            elif file_extension in ['.mp3']:
                encoding = speech.RecognitionConfig.AudioEncoding.MP3
            elif file_extension in ['.webm']:
                encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
            elif file_extension in ['.m4a']:
                encoding = speech.RecognitionConfig.AudioEncoding.MP3  # Fallback
            else:
                encoding = speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
            
            # Configure recognition settings optimized for veterinary speech
            config = speech.RecognitionConfig(
                encoding=encoding,
                sample_rate_hertz=16000,  # Standard rate
                language_code="en-US",
                enable_automatic_punctuation=True,
                enable_word_confidence=True,
                enable_spoken_punctuation=True,
                enable_spoken_numbers=True,
                model="medical_conversation",  # Use medical model if available
                use_enhanced=True,
                # Add medical terminology hints
                speech_contexts=[
                    speech.SpeechContext(
                        phrases=[
                            # Common veterinary terms
                            "SOAP", "subjective", "objective", "assessment", "plan",
                            "temperature", "heart rate", "respiratory rate", "weight",
                            "vaccination", "spay", "neuter", "anesthesia",
                            "CBC", "chemistry panel", "radiograph", "ultrasound",
                            "prescription", "medication", "dosage", "treatment",
                            "examination", "palpation", "auscultation",
                            "canine", "feline", "dog", "cat", "puppy", "kitten",
                            "abdomen", "thorax", "lymph nodes", "mucous membranes",
                            "capillary refill time", "body condition score"
                        ]
                    )
                ]
            )
            
            # Perform transcription
            logger.info(f"Sending audio to Google Cloud Speech API for job {job_id}")
            response = self.client.recognize(config=config, audio=audio)
            
            # Process results
            if not response.results:
                logger.warning(f"No transcription results for job {job_id}")
                job.status = TranscriptionStatus.FAILED
                job.error_message = "No speech detected in audio file"
                job.completed_at = datetime.utcnow()
                db.commit()
                return {"success": False, "error": "No speech detected in audio file"}
            
            # Combine all transcription results
            transcript_parts = []
            total_confidence = 0
            confidence_count = 0
            
            for result in response.results:
                if result.alternatives:
                    alternative = result.alternatives[0]
                    transcript_parts.append(alternative.transcript)
                    
                    # Calculate average confidence
                    if hasattr(alternative, 'confidence'):
                        total_confidence += alternative.confidence
                        confidence_count += 1
            
            # Combine transcript
            full_transcript = " ".join(transcript_parts).strip()
            
            # Calculate average confidence
            average_confidence = total_confidence / confidence_count if confidence_count > 0 else 0.0
            
            logger.info(f"Transcription completed for job {job_id}. Length: {len(full_transcript)} chars")
            
            # Update job with results
            job.status = TranscriptionStatus.COMPLETED
            job.transcript = full_transcript
            job.confidence_score = average_confidence
            job.completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "success": True,
                "transcript": full_transcript,
                "confidence": average_confidence,
                "job_id": job_id
            }
            
        except Exception as e:
            logger.error(f"Transcription failed for job {job_id}: {str(e)}", exc_info=True)
            
            # Update job with error
            job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
            if job:
                job.status = TranscriptionStatus.FAILED
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
                db.commit()
            
            return {"success": False, "error": str(e)}
    
    async def process_transcription_queue(self, db: Session) -> None:
        """
        Process pending transcription jobs
        """
        try:
            # Get pending jobs
            pending_jobs = db.query(TranscriptionJob).filter(
                TranscriptionJob.status == TranscriptionStatus.PENDING
            ).order_by(TranscriptionJob.created_at.asc()).limit(5).all()
            
            if not pending_jobs:
                return
            
            logger.info(f"Processing {len(pending_jobs)} pending transcription jobs")
            
            # Process jobs concurrently (but limit to avoid API rate limits)
            tasks = []
            for job in pending_jobs:
                # Get audio file path
                audio_file = db.query(AudioFile).filter(
                    AudioFile.id == job.audio_file_id
                ).first()
                
                if audio_file and os.path.exists(audio_file.file_path):
                    task = self.transcribe_audio(audio_file.file_path, job.id, db)
                    tasks.append(task)
                else:
                    # Mark job as failed if audio file is missing
                    job.status = TranscriptionStatus.FAILED
                    job.error_message = "Audio file not found"
                    job.completed_at = datetime.utcnow()
                    db.commit()
            
            # Wait for all transcriptions to complete
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                logger.info(f"Completed {len(results)} transcription tasks")
                
        except Exception as e:
            logger.error(f"Error processing transcription queue: {str(e)}", exc_info=True)
    
    def create_transcription_job(self, audio_file_id: int, db: Session) -> TranscriptionJob:
        """
        Create a new transcription job
        """
        job = TranscriptionJob(
            audio_file_id=audio_file_id,
            status=TranscriptionStatus.PENDING
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        
        logger.info(f"Created transcription job {job.id} for audio file {audio_file_id}")
        return job
    
    def get_job_status(self, job_id: int, db: Session) -> Optional[TranscriptionJob]:
        """
        Get transcription job status
        """
        return db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()

# Global instance
transcription_service = TranscriptionService()