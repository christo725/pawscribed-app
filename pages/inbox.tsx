import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { notesAPI, petsAPI } from '../lib/api';
import { ExportModal } from '../components/ExportModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { MobileLayout } from '../components/layout/MobileLayout';
import { MobileInboxSearch } from '../components/mobile/MobileInboxSearch';
import { useResponsive } from '../hooks/useResponsive';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

interface Note {
  id: number;
  title: string;
  note_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: number;
    name: string;
    species: string;
    breed: string;
  };
}

interface Patient {
  id: number;
  name: string;
  species: string;
}

type SortField = 'created_at' | 'updated_at' | 'title' | 'patient_name' | 'status';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export default function InboxPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isMobile } = useResponsive();
  const { t } = useTranslation(['common', 'veterinary']);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Sorting and view
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load data
  useEffect(() => {
    const loadInboxData = async () => {
      try {
        // Load all notes
        const notesData = await notesAPI.getAll({ limit: 200 });
        setNotes(notesData);

        // Load patients for filtering
        const petsData = await petsAPI.getAll({ limit: 100 });
        setPatients(petsData);

      } catch (error) {
        console.error('Failed to load inbox data:', error);
        toast.error('Failed to load inbox data');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadInboxData();
    }
  }, [isAuthenticated]);

  // Filter and sort notes
  const filteredAndSortedNotes = notes
    .filter(note => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(searchLower);
        const matchesPatient = note.patient?.name.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesPatient) return false;
      }

      // Status filter
      if (statusFilter && note.status !== statusFilter) return false;

      // Template filter
      if (templateFilter && note.note_type !== templateFilter) return false;

      // Patient filter
      if (patientFilter && note.patient?.name !== patientFilter) return false;

      // Date filter
      if (dateFilter) {
        const noteDate = new Date(note.created_at);
        const today = new Date();
        const filterDate = new Date(today);
        
        switch (dateFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            return noteDate >= filterDate;
          case 'week':
            filterDate.setDate(today.getDate() - 7);
            return noteDate >= filterDate;
          case 'month':
            filterDate.setMonth(today.getMonth() - 1);
            return noteDate >= filterDate;
          default:
            return true;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'patient_name':
          aValue = a.patient?.name || '';
          bValue = b.patient?.name || '';
          break;
        case 'created_at':
        case 'updated_at':
          aValue = new Date(a[sortField]);
          bValue = new Date(b[sortField]);
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = filteredAndSortedNotes.slice(startIndex, startIndex + itemsPerPage);

  // Toggle note selection
  const toggleNoteSelection = (noteId: number) => {
    const newSelection = new Set(selectedNotes);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedNotes(newSelection);
  };

  // Select all visible notes
  const selectAllVisible = () => {
    const newSelection = new Set(selectedNotes);
    paginatedNotes.forEach(note => newSelection.add(note.id));
    setSelectedNotes(newSelection);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedNotes(new Set());
  };

  // Batch operations
  const handleBatchExport = () => {
    const noteIds = Array.from(selectedNotes);
    if (noteIds.length === 0) {
      toast.error('No notes selected');
      return;
    }
    setShowExportModal(true);
  };

  const handleBatchDelete = async () => {
    const noteIds = Array.from(selectedNotes);
    if (noteIds.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${noteIds.length} selected note${noteIds.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await notesAPI.batchDelete(noteIds);
      toast.success(result.message);
      clearSelection();
      // Refresh notes list
      const notesData = await notesAPI.getAll({ limit: 200 });
      setNotes(notesData);
    } catch (error) {
      console.error('Batch delete failed:', error);
      toast.error('Failed to delete selected notes');
    }
  };

  const handleBatchStatusUpdate = async (newStatus: string) => {
    const noteIds = Array.from(selectedNotes);
    if (noteIds.length === 0) return;

    try {
      const result = await notesAPI.batchUpdateStatus(noteIds, newStatus);
      toast.success(result.message);
      clearSelection();
      // Refresh notes list
      const notesData = await notesAPI.getAll({ limit: 200 });
      setNotes(notesData);
    } catch (error) {
      console.error('Batch status update failed:', error);
      toast.error('Failed to update selected notes');
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'available_for_review': return 'bg-yellow-100 text-yellow-800';
      case 'ready_to_export': return 'bg-green-100 text-green-800';
      case 'exported': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTemplateFilter('');
    setPatientFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mobile render with different layout
  if (isMobile) {
    return (
      <MobileLayout title={t('navigation.inbox')}>
        <MobileInboxSearch
          notes={notes}
          patients={patients}
          onNotesFiltered={setFilteredNotes}
        />
        
        <div className="p-4">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
              <p className="text-gray-600 mb-4">
                {notes.length === 0 
                  ? "You haven't created any notes yet."
                  : "No notes match your current filters."
                }
              </p>
              <button
                onClick={() => router.push('/record')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {notes.length === 0 ? 'Create Your First Note' : 'Create Note'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 active:bg-gray-50 transition-colors"
                  onClick={() => router.push(`/notes/${note.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                      {note.patient && (
                        <p className="text-sm text-gray-600 truncate">
                          {note.patient.name} ({note.patient.species})
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(note.status)}`}>
                      {note.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      note.note_type === 'soap_standard' ? 'bg-blue-100 text-blue-800' :
                      note.note_type === 'soap_callback' ? 'bg-green-100 text-green-800' :
                      note.note_type === 'dental_record' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {note.note_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span>{formatDate(note.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('navigation.inbox')}</h1>
              <p className="text-sm text-gray-600">
                Advanced filtering and search for all your notes
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <button
                onClick={() => router.push('/record')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('recording.startRecording')}
              </button>
              <button
                onClick={() => router.push('/workflow')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('navigation.workflow')}
              </button>
              <button
                onClick={() => router.push('/patients')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('navigation.patients')}
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('navigation.analytics')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search notes, patients, and content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
              <svg className="absolute left-3 top-3.5 h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="processing">Processing</option>
                <option value="available_for_review">Available for Review</option>
                <option value="ready_to_export">Ready to Export</option>
                <option value="exported">Exported</option>
              </select>
            </div>

            {/* Template Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
              <select
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
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

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>

            {/* View Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                    viewMode === 'list'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${
                    viewMode === 'grid'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {filteredAndSortedNotes.length} of {notes.length} notes
              </span>
              
              {(searchQuery || statusFilter || templateFilter || patientFilter || dateFilter) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Items per page */}
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedNotes.size > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">
                {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={handleBatchExport}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Export Selected
                </button>
                <div className="relative group">
                  <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    Move To →
                  </button>
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg hidden group-hover:block z-10">
                    <button
                      onClick={() => handleBatchStatusUpdate('ready_to_export')}
                      className="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                    >
                      Ready to Export
                    </button>
                    <button
                      onClick={() => handleBatchStatusUpdate('available_for_review')}
                      className="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                    >
                      Available for Review
                    </button>
                    <button
                      onClick={() => handleBatchStatusUpdate('processing')}
                      className="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                    >
                      Processing
                    </button>
                    <button
                      onClick={() => handleBatchStatusUpdate('draft')}
                      className="block w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                    >
                      Draft
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleBatchDelete}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Delete Selected
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            clearSelection();
            // Refresh notes list
            const loadNotes = async () => {
              const notesData = await notesAPI.getAll({ limit: 200 });
              setNotes(notesData);
            };
            loadNotes();
          }}
          noteIds={Array.from(selectedNotes)}
          noteCount={selectedNotes.size}
        />

        {/* Notes List/Grid */}
        <div className="bg-white rounded-lg shadow">
          {/* Table Header (List View) */}
          {viewMode === 'list' && (
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={selectAllVisible}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Select All Visible
                </button>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center hover:text-gray-900"
                  >
                    Title
                    {sortField === 'title' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('patient_name')}
                    className="flex items-center hover:text-gray-900"
                  >
                    Patient
                    {sortField === 'patient_name' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-gray-900"
                  >
                    Status
                    {sortField === 'status' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('updated_at')}
                    className="flex items-center hover:text-gray-900"
                  >
                    Updated
                    {sortField === 'updated_at' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes Content */}
          {paginatedNotes.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
              <p className="text-gray-600 mb-4">
                {notes.length === 0 
                  ? "You haven't created any notes yet."
                  : "No notes match your current filters."
                }
              </p>
              {notes.length === 0 ? (
                <button
                  onClick={() => router.push('/record')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Note
                </button>
              ) : (
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            // List View
            <div className="divide-y divide-gray-200">
              {paginatedNotes.map((note) => (
                <div
                  key={note.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedNotes.has(note.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => router.push(`/notes/${note.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNoteSelection(note.id);
                        }}
                        className={`w-4 h-4 border rounded ${
                          selectedNotes.has(note.id) 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedNotes.has(note.id) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                        {note.patient && (
                          <p className="text-sm text-gray-600">
                            {note.patient.name} ({note.patient.species})
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(note.status)}`}>
                          {note.status.replace('_', ' ').toUpperCase()}
                        </span>
                        
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          note.note_type === 'soap_standard' ? 'bg-blue-100 text-blue-800' :
                          note.note_type === 'soap_callback' ? 'bg-green-100 text-green-800' :
                          note.note_type === 'dental_record' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {note.note_type.replace('_', ' ').toUpperCase()}
                        </span>
                        
                        <span className="text-sm text-gray-500">
                          {formatDate(note.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {paginatedNotes.map((note) => (
                <div
                  key={note.id}
                  className={`border rounded-lg p-4 hover:shadow-md cursor-pointer transition-all ${
                    selectedNotes.has(note.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => router.push(`/notes/${note.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-gray-900 truncate flex-1">{note.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNoteSelection(note.id);
                      }}
                      className={`ml-2 w-4 h-4 border rounded ${
                        selectedNotes.has(note.id) 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedNotes.has(note.id) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </button>
                  </div>
                  
                  {note.patient && (
                    <p className="text-sm text-gray-600 mb-3">
                      {note.patient.name} ({note.patient.species})
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(note.status)}`}>
                      {note.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(note.updated_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedNotes.length)} of {filteredAndSortedNotes.length} notes
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { getServerSideProps } from 'next-i18next/serverSideTranslations';

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await import('next-i18next/serverSideTranslations').then(m => 
      m.serverSideTranslations(locale, ['common', 'veterinary'])
    )),
  },
});