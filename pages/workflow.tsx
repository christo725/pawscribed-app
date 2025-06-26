import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { WorkflowBoard } from '../components/WorkflowBoard';
import { workflowAPI, petsAPI } from '../lib/api';
import toast from 'react-hot-toast';

interface WorkflowStats {
  draft: number;
  processing: number;
  available_for_review: number;
  ready_to_export: number;
  exported: number;
}

interface Patient {
  id: number;
  name: string;
  species: string;
}

export default function WorkflowPage() {
  const router = useRouter();
  const { user, isAuthenticated, trialDaysRemaining } = useAuth();
  
  const [stats, setStats] = useState<WorkflowStats>({
    draft: 0,
    processing: 0,
    available_for_review: 0,
    ready_to_export: 0,
    exported: 0
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load initial data
  useEffect(() => {
    const loadWorkflowData = async () => {
      try {
        // Load workflow stats
        const statsData = await workflowAPI.getStats();
        setStats(statsData);

        // Load patients for filtering
        const petsData = await petsAPI.getAll({ limit: 100 });
        setPatients(petsData);

      } catch (error) {
        console.error('Failed to load workflow data:', error);
        toast.error('Failed to load workflow data');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadWorkflowData();
    }
  }, [isAuthenticated]);

  const totalNotes = Object.values(stats).reduce((sum, count) => sum + count, 0);

  if (!isAuthenticated || loading) {
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
              <h1 className="text-2xl font-bold text-gray-900">
                Workflow Management
              </h1>
              <p className="text-sm text-gray-600">
                Manage your notes through the five-stage workflow process
              </p>
            </div>
            
            {/* User Info & Actions */}
            <div className="flex items-center space-x-4">
              {/* Trial Status */}
              {user?.role === 'trial' && trialDaysRemaining !== null && (
                <div className="flex items-center space-x-2">
                  {trialDaysRemaining > 0 ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full">
                      {trialDaysRemaining} trial days remaining
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                      Trial expired
                    </span>
                  )}
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Upgrade Plan →
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => router.push('/record')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  New Recording
                </button>
                <button
                  onClick={() => router.push('/inbox')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Inbox
                </button>
                <button
                  onClick={() => router.push('/analytics')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* Total Notes */}
          <div className="bg-white rounded-lg shadow p-4 md:col-span-1 lg:col-span-1">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Notes</p>
                <p className="text-2xl font-semibold text-gray-900">{totalNotes}</p>
              </div>
            </div>
          </div>

          {/* Individual Stage Stats */}
          {[
            { key: 'draft', label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
            { key: 'processing', label: 'Processing', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            { key: 'available_for_review', label: 'Review', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
            { key: 'ready_to_export', label: 'Ready', color: 'text-green-600', bgColor: 'bg-green-100' },
            { key: 'exported', label: 'Exported', color: 'text-purple-600', bgColor: 'bg-purple-100' },
          ].map((stage) => (
            <div key={stage.key} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className={`p-2 ${stage.bgColor} rounded-lg`}>
                  <div className={`w-6 h-6 ${stage.color} font-bold text-lg flex items-center justify-center`}>
                    {stats[stage.key as keyof WorkflowStats]}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">{stage.label}</p>
                  <p className={`text-sm ${stage.color} font-medium`}>
                    {totalNotes > 0 ? Math.round((stats[stage.key as keyof WorkflowStats] / totalNotes) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notes and patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                showFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>

            {/* Refresh */}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Template Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Type
                  </label>
                  <select
                    value={filterTemplate}
                    onChange={(e) => setFilterTemplate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Templates</option>
                    <option value="soap_standard">Standard SOAP</option>
                    <option value="soap_callback">Callback Note</option>
                    <option value="dental_record">Dental Record</option>
                    <option value="ultrasound_abdomen">Abdominal Ultrasound</option>
                  </select>
                </div>

                {/* Patient Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient
                  </label>
                  <select
                    value={filterPatient}
                    onChange={(e) => setFilterPatient(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Patients</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.name}>
                        {patient.name} ({patient.species})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterTemplate || filterPatient) && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterTemplate('');
                      setFilterPatient('');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workflow Board */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Five-Stage Workflow</h2>
            <p className="text-sm text-gray-600">
              Drag and drop notes between stages. Cmd/Ctrl+click to select multiple notes.
            </p>
          </div>
          
          <WorkflowBoard
            searchQuery={searchQuery}
            filterTemplate={filterTemplate}
            filterPatient={filterPatient}
          />
        </div>

        {/* Workflow Guide */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            📋 Workflow Stage Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-blue-800">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">1</div>
              <h4 className="font-medium mb-1">Draft</h4>
              <p>Newly created notes awaiting review</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">2</div>
              <h4 className="font-medium mb-1">Processing</h4>
              <p>Notes being actively worked on</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">3</div>
              <h4 className="font-medium mb-1">Review</h4>
              <p>Ready for quality review and approval</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">4</div>
              <h4 className="font-medium mb-1">Ready</h4>
              <p>Approved and ready for export</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">5</div>
              <h4 className="font-medium mb-1">Exported</h4>
              <p>Finalized and sent to patient records</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {totalNotes === 0 && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes in workflow</h3>
            <p className="text-gray-600 mb-4">
              Start by recording a voice note or creating a typed note to see your workflow in action.
            </p>
            <button
              onClick={() => router.push('/record')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}