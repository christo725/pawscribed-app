import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { petsAPI, notesAPI, visitsAPI } from '../../lib/api';
import { PatientInfo } from '../../components/patient/PatientInfo';
import { PatientNotebook } from '../../components/patient/PatientNotebook';
import { PatientTimeline } from '../../components/patient/PatientTimeline';
import toast from 'react-hot-toast';

interface Patient {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  sex: string;
  weight: number;
  microchip_number?: string;
  medical_record_number?: string;
  owner: {
    id: number;
    full_name: string;
    email: string;
    phone_number: string;
  };
}

interface Note {
  id: number;
  title: string;
  note_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  exported_at?: string;
}

interface Visit {
  id: number;
  visit_type: string;
  chief_complaint: string;
  created_at: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

type TabType = 'overview' | 'notebook' | 'timeline' | 'documents';

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load patient data
  useEffect(() => {
    const loadPatientData = async () => {
      if (!id || !isAuthenticated) return;
      
      try {
        setLoading(true);
        
        // Load patient details
        const patientData = await petsAPI.getById(Number(id));
        setPatient(patientData);
        
        // Load patient notes
        const notesData = await notesAPI.getAll({ 
          patient_id: Number(id),
          limit: 100 
        });
        setNotes(notesData);
        
        // Load patient visits
        const visitsData = await visitsAPI.getAll({ pet_id: Number(id) });
        setVisits(visitsData);
        
      } catch (error) {
        console.error('Failed to load patient data:', error);
        toast.error('Failed to load patient information');
        router.push('/patients');
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [id, isAuthenticated, router]);

  if (!isAuthenticated || loading || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'notebook', label: 'Notebook', icon: '📔' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'documents', label: 'Documents', icon: '📄' }
  ];

  const stats = {
    totalNotes: notes.length,
    completedNotes: notes.filter(n => n.status === 'exported').length,
    lastVisit: notes.length > 0 
      ? new Date(notes[0].created_at).toLocaleDateString()
      : 'No visits yet',
    upcomingAppointments: 0 // Placeholder
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/patients')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {patient.species} • {patient.breed} • {patient.age} years old
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/record?patient_id=${patient.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Recording
              </button>
              <button
                onClick={() => router.push(`/patients/${patient.id}/edit`)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit Patient
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalNotes}</p>
              </div>
              <span className="text-2xl">📝</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedNotes}</p>
              </div>
              <span className="text-2xl">✅</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Visit</p>
                <p className="text-lg font-bold text-gray-900">{stats.lastVisit}</p>
              </div>
              <span className="text-2xl">📅</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
              </div>
              <span className="text-2xl">🔔</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <PatientInfo patient={patient} />
            )}
            
            {activeTab === 'notebook' && (
              <PatientNotebook 
                patientId={patient.id}
                notes={notes}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onRefresh={async () => {
                  const notesData = await notesAPI.getAll({ 
                    patient_id: patient.id,
                    limit: 100 
                  });
                  setNotes(notesData);
                }}
              />
            )}
            
            {activeTab === 'timeline' && (
              <PatientTimeline 
                notes={notes}
                visits={visits}
              />
            )}
            
            {activeTab === 'documents' && (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Document Management</h3>
                <p className="text-gray-600">Upload and manage patient documents, x-rays, and lab results.</p>
                <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}