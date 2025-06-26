import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '../../hooks/useTranslation';

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

interface MobileInboxSearchProps {
  notes: Note[];
  patients: Patient[];
  onNotesFiltered: (filteredNotes: Note[]) => void;
}

export const MobileInboxSearch: React.FC<MobileInboxSearchProps> = ({
  notes,
  patients,
  onNotesFiltered
}) => {
  const router = useRouter();
  const { t } = useTranslation(['common', 'veterinary']);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Apply filters whenever any filter changes
  React.useEffect(() => {
    const filteredNotes = notes.filter(note => {
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
    });

    onNotesFiltered(filteredNotes);
  }, [notes, searchQuery, statusFilter, templateFilter, patientFilter, dateFilter, onNotesFiltered]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTemplateFilter('');
    setPatientFilter('');
    setDateFilter('');
  };

  const hasActiveFilters = searchQuery || statusFilter || templateFilter || patientFilter || dateFilter;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-3 p-1 rounded transition-colors ${
              showFilters || hasActiveFilters
                ? 'text-blue-600 bg-blue-100'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="space-y-3 mt-3">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="draft">{t('status.draft')}</option>
                <option value="processing">{t('status.processing')}</option>
                <option value="available_for_review">{t('status.review')}</option>
                <option value="ready_to_export">{t('status.ready')}</option>
                <option value="exported">{t('status.exported')}</option>
              </select>
            </div>

            {/* Template Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.template')}
              </label>
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('filters.allTemplates')}</option>
                <option value="soap_standard">{t('templates.soap')}</option>
                <option value="soap_callback">{t('templates.callback')}</option>
                <option value="dental_record">{t('templates.dental')}</option>
                <option value="ultrasound_abdomen">{t('templates.ultrasound')}</option>
              </select>
            </div>

            {/* Patient Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.patient')}
              </label>
              <select
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('filters.allPatients')}</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.name}>
                    {patient.name} ({patient.species})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.date')}
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('filters.allTime')}</option>
                <option value="today">{t('filters.today')}</option>
                <option value="week">{t('filters.week')}</option>
                <option value="month">{t('filters.month')}</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('buttons.clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {t('filters.active')}
            </span>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {t('buttons.clear')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};