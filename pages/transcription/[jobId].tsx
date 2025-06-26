import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { audioAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface TranscriptionJob {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcript?: string;
  confidence_score?: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export default function TranscriptionStatusPage() {
  const router = useRouter();
  const { jobId } = router.query;
  const { isAuthenticated } = useAuth();
  const [job, setJob] = useState<TranscriptionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch transcription status
  const fetchTranscriptionStatus = async () => {
    if (!jobId || Array.isArray(jobId)) return;

    try {
      const jobData = await audioAPI.getTranscriptionStatus(parseInt(jobId));
      setJob(jobData);
      
      // Stop polling if job is complete or failed
      if (jobData.status === 'completed' || jobData.status === 'failed') {
        setPolling(false);
      }
    } catch (error) {
      console.error('Failed to fetch transcription status:', error);
      toast.error('Failed to load transcription status');
      setPolling(false);
    } finally {\n      setLoading(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    if (jobId && isAuthenticated) {
      fetchTranscriptionStatus();
    }
  }, [jobId, isAuthenticated]);

  // Polling effect
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      fetchTranscriptionStatus();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [polling, jobId]);

  // Auto-redirect when completed
  useEffect(() => {
    if (job?.status === 'completed' && job.transcript) {
      // Wait 2 seconds then redirect to note creation
      setTimeout(() => {
        router.push(`/notes/create?transcription_job_id=${job.id}`);
      }, 2000);
    }
  }, [job, router]);

  const getStatusMessage = () => {
    if (!job) return 'Loading...';

    switch (job.status) {
      case 'pending':
        return 'Waiting to process...';
      case 'processing':
        return 'Transcribing audio...';
      case 'completed':
        return 'Transcription complete!';
      case 'failed':
        return 'Transcription failed';
      default:
        return 'Unknown status';
    }
  };

  const getStatusIcon = () => {
    if (!job) {
      return (
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      );
    }

    switch (job.status) {
      case 'pending':
        return (
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'processing':
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );
      case 'completed':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getPawsitiveMessage = () => {
    const messages = [
      "Feeling pawsitive vibes! 🐾",
      "Hang tight! We're working our magic! ✨", 
      "Processing your audio with care! 🎵",
      "Almost there! Good things take time! ⏰",
      "Our AI is hard at work! 🤖",
      "Transcription in progress... Stay pawsome! 🐕"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transcription Processing</h1>
              <p className="text-sm text-gray-600">
                Your audio is being transcribed
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          {/* Status Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {getStatusMessage()}
          </h2>

          {/* Pawsitive Message */}
          {(job?.status === 'pending' || job?.status === 'processing') && (
            <p className="text-lg text-blue-600 mb-6">
              {getPawsitiveMessage()}
            </p>
          )}

          {/* Job Details */}
          {job && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status:</dt>
                  <dd className="font-medium capitalize text-gray-900">{job.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Job ID:</dt>
                  <dd className="font-mono text-gray-900">{job.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created:</dt>
                  <dd className="text-gray-900">
                    {new Date(job.created_at).toLocaleString()}
                  </dd>
                </div>
                {job.confidence_score && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Confidence:</dt>
                    <dd className="text-gray-900">
                      {Math.round(job.confidence_score * 100)}%
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Progress Indicator */}
          {(job?.status === 'pending' || job?.status === 'processing') && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full animate-pulse"
                  style={{ width: job.status === 'pending' ? '25%' : '75%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {job.status === 'pending' ? 'Queued for processing' : 'Processing audio...'}
              </p>
            </div>
          )}

          {/* Success State */}
          {job?.status === 'completed' && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800">
                  ✅ Transcription completed successfully!
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Redirecting to note creation...
                </p>
              </div>
              
              {job.transcript && (
                <div className="bg-gray-50 border rounded-lg p-4 text-left">
                  <h4 className="font-medium text-gray-900 mb-2">Transcript Preview:</h4>
                  <p className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                    {job.transcript.substring(0, 200)}
                    {job.transcript.length > 200 && '...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {job?.status === 'failed' && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  ❌ Transcription failed
                </p>
                {job.error_message && (
                  <p className="text-sm text-red-600 mt-1">
                    {job.error_message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center space-x-4">
            {job?.status === 'completed' && (
              <button
                onClick={() => router.push(`/notes/create?transcription_job_id=${job.id}`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create SOAP Note
              </button>
            )}
            
            {job?.status === 'failed' && (
              <button
                onClick={() => router.push('/record')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Processing Time Estimate */}
          {(job?.status === 'pending' || job?.status === 'processing') && (
            <div className="mt-6 text-xs text-gray-500">
              <p>Typical processing time: 20-60 seconds</p>
              <p>This page will update automatically</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}