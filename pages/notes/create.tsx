import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { notesAPI, audioAPI, petsAPI } from '../../lib/api';
import toast from 'react-hot-toast';

interface TranscriptionJob {
  id: number;
  status: string;
  transcript: string;
  confidence_score: number;
}

interface Patient {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  owner: {
    first_name: string;
    last_name: string;
  };
}

export default function CreateNotePage() {
  const router = useRouter();
  const { transcription_job_id } = router.query;
  const { isAuthenticated } = useAuth();
  
  const [transcriptionJob, setTranscriptionJob] = useState<TranscriptionJob | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('soap_standard');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load transcription job and patients
  useEffect(() => {
    const loadData = async () => {
      if (!transcription_job_id || Array.isArray(transcription_job_id)) return;

      try {
        // Load transcription job
        const jobData = await audioAPI.getTranscriptionStatus(parseInt(transcription_job_id));
        setTranscriptionJob(jobData);

        // Load patients
        const petsData = await petsAPI.getAll({ limit: 100 });
        setPatients(petsData);

      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load transcription data');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    }
  }, [transcription_job_id, isAuthenticated]);

  const handleGenerateSOAP = async () => {
    if (!selectedPatient || !transcriptionJob) {
      toast.error('Please select a patient');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/notes/generate-from-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          transcription_job_id: transcriptionJob.id,
          patient_id: selectedPatient,
          template_type: selectedTemplate
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('SOAP note generated successfully!');
        router.push(`/notes/${result.note_id}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to generate SOAP note');
      }

    } catch (error) {
      console.error('SOAP generation failed:', error);
      toast.error('Failed to generate SOAP note');
    } finally {
      setGenerating(false);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!transcriptionJob) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Transcription Not Found</h2>
          <p className="text-gray-600 mb-4">The requested transcription could not be found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Create SOAP Note</h1>
              <p className="text-sm text-gray-600">
                Generate structured medical notes from transcription
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transcription Review */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transcription Review
            </h2>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Transcription Quality
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round((transcriptionJob.confidence_score || 0) * 100)}% confidence
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(transcriptionJob.confidence_score || 0) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-2">Transcript:</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {transcriptionJob.transcript}
              </p>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>• Review the transcript for accuracy before generating SOAP note</p>
              <p>• The AI will extract medical information from this text</p>
              <p>• Missing information will be noted in the generated report</p>
            </div>
          </div>

          {/* Generation Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              SOAP Note Settings
            </h2>

            {/* Patient Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Patient *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {patients.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No patients found</p>
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
                          <h3 className="font-medium text-gray-900">{patient.name}</h3>
                          <p className="text-sm text-gray-600">
                            {patient.species} • {patient.breed} • {patient.age} years
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
            </div>

            {/* Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SOAP Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="soap_standard">Standard SOAP Note</option>
                <option value="soap_callback">Callback/Follow-up Note</option>
                <option value="dental_record">Dental Examination</option>
                <option value="ultrasound_abdomen">Abdominal Ultrasound</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the template that best matches your examination type
              </p>
            </div>

            {/* Template Description */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Template Info:</h4>
              <p className="text-xs text-blue-800">
                {selectedTemplate === 'soap_standard' && 'Comprehensive veterinary SOAP note with full examination sections'}
                {selectedTemplate === 'soap_callback' && 'Shortened format for follow-up consultations and progress checks'}
                {selectedTemplate === 'dental_record' && 'Specialized format for dental examinations and oral health assessments'}
                {selectedTemplate === 'ultrasound_abdomen' && 'Systematic abdominal ultrasound examination with organ-specific findings'}
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateSOAP}
              disabled={!selectedPatient || generating}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                !selectedPatient || generating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {generating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating SOAP Note...
                </div>
              ) : (
                'Generate SOAP Note'
              )}
            </button>

            {!selectedPatient && (
              <p className="text-xs text-red-600 mt-2 text-center">
                Please select a patient to continue
              </p>
            )}
          </div>
        </div>

        {/* AI Information */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-amber-900 mb-3">
            🤖 AI-Powered SOAP Generation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-800">
            <div>
              <h4 className="font-medium mb-2">What our AI does:</h4>
              <ul className="space-y-1">
                <li>• Extracts medical information from your voice recording</li>
                <li>• Organizes findings into proper SOAP format</li>
                <li>• Identifies vital signs, symptoms, and treatments</li>
                <li>• Uses veterinary-specific terminology</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Important notes:</h4>
              <ul className="space-y-1">
                <li>• AI only uses information from your recording</li>
                <li>• Missing data will be clearly marked</li>
                <li>• You can edit all generated content</li>
                <li>• Always review before finalizing notes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}