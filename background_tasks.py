"""
Background task processing for Pawscribed
Handles transcription queue processing and other async tasks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from database import engine
from transcription_service import transcription_service

logger = logging.getLogger(__name__)

class BackgroundTaskManager:
    def __init__(self):
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.running = False
        self.tasks = []
    
    async def start(self):
        """Start background task processing"""
        if self.running:
            return
        
        self.running = True
        logger.info("Starting background task manager")
        
        # Start transcription queue processor
        transcription_task = asyncio.create_task(self._transcription_processor())
        self.tasks.append(transcription_task)
        
        # Start cleanup task
        cleanup_task = asyncio.create_task(self._cleanup_processor())
        self.tasks.append(cleanup_task)
        
        logger.info(f"Started {len(self.tasks)} background tasks")
    
    async def stop(self):
        """Stop background task processing"""
        if not self.running:
            return
        
        logger.info("Stopping background task manager")
        self.running = False
        
        # Cancel all tasks
        for task in self.tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)
        
        self.tasks.clear()
        logger.info("Background task manager stopped")
    
    async def _transcription_processor(self):
        """Process transcription queue every 10 seconds"""
        while self.running:
            try:
                db = self.SessionLocal()
                try:
                    await transcription_service.process_transcription_queue(db)
                finally:
                    db.close()
                
                # Wait 10 seconds before next check
                await asyncio.sleep(10)
                
            except asyncio.CancelledError:
                logger.info("Transcription processor cancelled")
                break
            except Exception as e:
                logger.error(f"Error in transcription processor: {str(e)}", exc_info=True)
                await asyncio.sleep(30)  # Wait longer on error
    
    async def _cleanup_processor(self):
        """Clean up old files and data every hour"""
        while self.running:
            try:
                await self._cleanup_old_files()
                
                # Wait 1 hour before next cleanup
                await asyncio.sleep(3600)
                
            except asyncio.CancelledError:
                logger.info("Cleanup processor cancelled")
                break
            except Exception as e:
                logger.error(f"Error in cleanup processor: {str(e)}", exc_info=True)
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def _cleanup_old_files(self):
        """Clean up old audio files and completed transcription jobs"""
        try:
            from models import AudioFile, TranscriptionJob, TranscriptionStatus
            import os
            
            db = self.SessionLocal()
            try:
                # Delete audio files older than 7 days
                cutoff_date = datetime.utcnow() - timedelta(days=7)
                
                old_files = db.query(AudioFile).filter(
                    AudioFile.uploaded_at < cutoff_date
                ).all()
                
                files_deleted = 0
                for audio_file in old_files:
                    try:
                        # Delete physical file
                        if os.path.exists(audio_file.file_path):
                            os.remove(audio_file.file_path)
                        
                        # Delete database record
                        db.delete(audio_file)
                        files_deleted += 1
                        
                    except Exception as e:
                        logger.error(f"Failed to delete audio file {audio_file.id}: {str(e)}")
                
                # Clean up old completed transcription jobs (keep for 30 days)
                old_job_cutoff = datetime.utcnow() - timedelta(days=30)
                
                old_jobs = db.query(TranscriptionJob).filter(
                    TranscriptionJob.completed_at < old_job_cutoff,
                    TranscriptionJob.status.in_([TranscriptionStatus.COMPLETED, TranscriptionStatus.FAILED])
                ).all()
                
                jobs_deleted = 0
                for job in old_jobs:
                    db.delete(job)
                    jobs_deleted += 1
                
                db.commit()
                
                if files_deleted > 0 or jobs_deleted > 0:
                    logger.info(f"Cleanup completed: {files_deleted} files, {jobs_deleted} jobs deleted")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Cleanup failed: {str(e)}", exc_info=True)

# Global instance
task_manager = BackgroundTaskManager()