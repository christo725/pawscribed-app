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

interface MobileWorkflowBoardProps {
  notes: Note[];
  onStatusChange?: (noteId: number, newStatus: string) => void;
  onRefresh?: () => void;
}

export const MobileWorkflowBoard: React.FC<MobileWorkflowBoardProps> = ({
  notes,
  onStatusChange,
  onRefresh
}) => {
  const router = useRouter();
  const { t } = useTranslation(['common', 'veterinary']);
  const [activeStage, setActiveStage] = useState('processing');

  const stages = [
    {
      id: 'processing',
      label: t('workflow.processing'),
      icon: '⚡',
      color: 'blue',
      status: 'processing'
    },
    {
      id: 'review',
      label: t('workflow.review'),
      icon: '👁️',
      color: 'yellow',
      status: 'available_for_review'
    },
    {
      id: 'ready',
      label: t('workflow.ready'),
      icon: '✅',
      color: 'green',
      status: 'ready_to_export'
    },
    {
      id: 'exported',
      label: t('workflow.exported'),
      icon: '📤',
      color: 'purple',
      status: 'exported'
    }
  ];

  const getNotesForStage = (status: string) => {
    return notes.filter(note => note.status === status);
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleNoteClick = (noteId: number) => {
    router.push(`/notes/${noteId}`);
  };

  const handleStatusMove = (noteId: number, newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(noteId, newStatus);
    }
  };

  const currentStageNotes = getNotesForStage(activeStage);
  const currentStage = stages.find(stage => stage.status === activeStage);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Stage Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {stages.map((stage) => {
            const stageNotes = getNotesForStage(stage.status);
            const isActive = activeStage === stage.status;
            
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.status)}
                className={`flex-shrink-0 px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? `border-${stage.color}-500 text-${stage.color}-600 bg-${stage.color}-50`
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{stage.icon}</span>
                  <div className="text-left">
                    <div className="font-medium text-sm">{stage.label}</div>
                    <div className="text-xs text-gray-500">{stageNotes.length}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{currentStage?.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-900">{currentStage?.label}</h2>
              <p className="text-sm text-gray-500">
                {currentStageNotes.length} {currentStageNotes.length === 1 ? 'note' : 'notes'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {currentStageNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <span className="text-4xl mb-2">{currentStage?.icon}</span>
            <p className="text-center font-medium">No notes in {currentStage?.label.toLowerCase()}</p>
            <p className="text-sm text-center mt-1">Notes will appear here as they move through the workflow</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {currentStageNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-lg border border-gray-200 p-4 active:bg-gray-50 transition-colors"
                onClick={() => handleNoteClick(note.id)}
              >
                {/* Note Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                    {note.patient && (
                      <p className="text-sm text-gray-600 truncate">
                        {note.patient.name} ({note.patient.species})
                      </p>
                    )}
                  </div>
                  
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    note.note_type === 'soap_standard' ? 'bg-blue-100 text-blue-800' :
                    note.note_type === 'soap_callback' ? 'bg-green-100 text-green-800' :
                    note.note_type === 'dental_record' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {note.note_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Note Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>Updated {formatDate(note.updated_at)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(note.status)}`}>
                    {note.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/notes/${note.id}`);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    {t('buttons.view')}
                  </button>
                  
                  {/* Quick Actions */}
                  {activeStage === 'processing' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusMove(note.id, 'available_for_review');
                      }}
                      className="px-3 py-2 bg-yellow-100 text-yellow-700 text-sm rounded-lg hover:bg-yellow-200 transition-colors"
                    >
                      → Review
                    </button>
                  )}
                  
                  {activeStage === 'available_for_review' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusMove(note.id, 'ready_to_export');
                      }}
                      className="px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-colors"
                    >
                      → Ready
                    </button>
                  )}
                  
                  {activeStage === 'ready_to_export' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/export?notes=${note.id}`);
                      }}
                      className="px-3 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      Export
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={() => router.push('/record')}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>{t('recording.startRecording')}</span>
        </button>
      </div>
    </div>
  );
};