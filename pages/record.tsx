import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AudioRecorder } from '../components/AudioRecorder';
import { useAuth } from '../contexts/AuthContext';
import { audioAPI, petsAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  owner: {
    first_name: string;
    last_name: string;
  };
}

export default function RecordPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [patients, setPatients] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load patients
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const petsData = await petsAPI.getAll({ limit: 100 });
        setPatients(petsData);
      } catch (error) {
        console.error('Failed to load patients:', error);
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadPatients();
    }
  }, [isAuthenticated]);

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    setUploading(true);
    
    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, {
        type: audioBlob.type
      });

      // Upload audio file
      const response = await audioAPI.upload(audioFile, selectedPatient);
      
      toast.success('Recording uploaded successfully! Processing transcription...');
      
      // Redirect to notes page or show transcription status
      router.push(`/transcription/${response.transcription_job_id}`);
      
    } catch (error) {
      console.error('Failed to upload recording:', error);
      toast.error('Failed to upload recording. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRecordingError = (error: string) => {
    toast.error(error);
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
              <h1 className="text-2xl font-bold text-gray-900">Voice Recording</h1>
              <p className="text-sm text-gray-600">
                Record voice notes for veterinary documentation
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Patient Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Patient
            </h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {patients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No patients found.</p>
                    <button
                      onClick={() => router.push('/patients/new')}
                      className="mt-2 text-blue-600 hover:text-blue-700"
                    >
                      Add a patient first
                    </button>
                  </div>
                ) : (
                  patients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPatient === patient.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {patient.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {patient.species} • {patient.breed || 'Mixed'} • Age: {patient.age || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Owner: {patient.owner.first_name} {patient.owner.last_name}
                          </p>
                        </div>
                        {selectedPatient === patient.id && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedPatient && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Patient selected. Ready to record.
                </p>
              </div>
            )}
          </div>

          {/* Audio Recording */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              Voice Recording
            </h2>

            {!selectedPatient ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">
                  Please select a patient before recording
                </p>
              </div>
            ) : uploading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Uploading recording...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Please don't close this page
                </p>
              </div>
            ) : (
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onError={handleRecordingError}
                patientId={selectedPatient}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            Recording Tips
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Speak clearly and at a normal pace
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Include patient symptoms, examination findings, and treatment plans
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Mention vital signs and any diagnostic results
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              The AI will automatically structure your notes into SOAP format
            </li>
          </ul>
        </div>

        {/* Trial Reminder */}
        {user?.role === 'trial' && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800">
                You're on a trial account. Upgrade to unlock unlimited recordings and advanced features.
              </p>
              <button className="ml-auto text-sm text-amber-700 hover:text-amber-800 font-medium">
                Upgrade Plan →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}