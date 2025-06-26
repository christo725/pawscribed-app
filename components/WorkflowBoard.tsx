import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { notesAPI, workflowAPI } from '../lib/api';
import { ExportModal } from './ExportModal';
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
  };
}

interface WorkflowStats {
  draft: number;
  processing: number;
  available_for_review: number;
  ready_to_export: number;
  exported: number;
}

const WORKFLOW_STAGES = [
  {
    id: 'draft',
    title: 'Draft',
    description: 'Newly created notes',
    color: 'bg-gray-100 border-gray-300',
    headerColor: 'bg-gray-500',
    textColor: 'text-gray-700'
  },
  {
    id: 'processing',
    title: 'Processing',
    description: 'Being worked on',
    color: 'bg-blue-100 border-blue-300',
    headerColor: 'bg-blue-500',
    textColor: 'text-blue-700'
  },
  {
    id: 'available_for_review',
    title: 'Available for Review',
    description: 'Ready for review',
    color: 'bg-yellow-100 border-yellow-300',
    headerColor: 'bg-yellow-500',
    textColor: 'text-yellow-700'
  },
  {
    id: 'ready_to_export',
    title: 'Ready to Export',
    description: 'Approved and ready',
    color: 'bg-green-100 border-green-300',
    headerColor: 'bg-green-500',
    textColor: 'text-green-700'
  },
  {
    id: 'exported',
    title: 'Exported',
    description: 'Finalized and exported',
    color: 'bg-purple-100 border-purple-300',
    headerColor: 'bg-purple-500',
    textColor: 'text-purple-700'
  }
];

interface WorkflowBoardProps {
  searchQuery?: string;
  filterTemplate?: string;
  filterPatient?: string;
}

export const WorkflowBoard: React.FC<WorkflowBoardProps> = ({
  searchQuery = '',
  filterTemplate = '',
  filterPatient = ''
}) => {
  const [notes, setNotes] = useState<{ [key: string]: Note[] }>({
    draft: [],
    processing: [],
    available_for_review: [],
    ready_to_export: [],
    exported: []
  });
  const [stats, setStats] = useState<WorkflowStats>({
    draft: 0,
    processing: 0,
    available_for_review: 0,
    ready_to_export: 0,
    exported: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);

  // Load notes and stats
  const loadWorkflowData = async () => {
    try {
      // Load notes for each status
      const notePromises = WORKFLOW_STAGES.map(stage =>
        notesAPI.getAll({ status: stage.id, limit: 50 })
      );
      
      const [draftNotes, processingNotes, reviewNotes, exportNotes, exportedNotes] = 
        await Promise.all(notePromises);

      setNotes({
        draft: draftNotes || [],
        processing: processingNotes || [],
        available_for_review: reviewNotes || [],
        ready_to_export: exportNotes || [],
        exported: exportedNotes || []
      });

      // Load workflow stats
      const statsData = await workflowAPI.getStats();
      setStats(statsData);

    } catch (error) {
      console.error('Failed to load workflow data:', error);
      toast.error('Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflowData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadWorkflowData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter notes based on search and filters
  const filterNotes = (noteList: Note[]) => {
    return noteList.filter(note => {
      const matchesSearch = !searchQuery || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.patient?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTemplate = !filterTemplate || note.note_type === filterTemplate;
      
      const matchesPatient = !filterPatient || 
        note.patient?.name.toLowerCase().includes(filterPatient.toLowerCase());

      return matchesSearch && matchesTemplate && matchesPatient;
    });
  };

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const noteId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    try {
      // Update note status
      await notesAPI.updateStatus(noteId, newStatus);
      
      // Update local state
      const sourceNotes = [...notes[source.droppableId]];
      const destNotes = source.droppableId === destination.droppableId 
        ? sourceNotes 
        : [...notes[destination.droppableId]];

      // Remove from source
      const [movedNote] = sourceNotes.splice(source.index, 1);
      
      // Add to destination
      if (source.droppableId !== destination.droppableId) {
        movedNote.status = newStatus;
        destNotes.splice(destination.index, 0, movedNote);
      } else {
        sourceNotes.splice(destination.index, 0, movedNote);
      }

      setNotes({
        ...notes,
        [source.droppableId]: sourceNotes,
        [destination.droppableId]: destNotes
      });

      // Update stats
      const newStats = { ...stats };
      newStats[source.droppableId as keyof WorkflowStats]--;
      newStats[destination.droppableId as keyof WorkflowStats]++;
      setStats(newStats);

      toast.success(`Note moved to ${WORKFLOW_STAGES.find(s => s.id === newStatus)?.title}`);

    } catch (error) {
      console.error('Failed to update note status:', error);
      toast.error('Failed to move note');
    }
  };

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

  // Select all notes in a stage
  const selectAllInStage = (stageId: string) => {
    const stageNotes = filterNotes(notes[stageId]);
    const newSelection = new Set(selectedNotes);
    stageNotes.forEach(note => newSelection.add(note.id));
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
      loadWorkflowData(); // Refresh data
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
      loadWorkflowData(); // Refresh data
    } catch (error) {
      console.error('Batch status update failed:', error);
      toast.error('Failed to update selected notes');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading workflow...</span>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Selection Bar */}
      {selectedNotes.size > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-blue-700 font-medium">
                {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
              </span>
            </div>
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
          loadWorkflowData();
        }}
        noteIds={Array.from(selectedNotes)}
        noteCount={selectedNotes.size}
      />

      {/* Workflow Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-full">
          {WORKFLOW_STAGES.map((stage) => {
            const stageNotes = filterNotes(notes[stage.id]);
            const stageCount = stats[stage.id as keyof WorkflowStats];

            return (
              <div key={stage.id} className={`border-2 rounded-lg ${stage.color} flex flex-col`}>
                {/* Stage Header */}
                <div className={`${stage.headerColor} text-white p-3 rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stage.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs font-medium">
                        {stageCount}
                      </span>
                      <button
                        onClick={() => selectAllInStage(stage.id)}
                        className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30"
                        title="Select all in this stage"
                      >
                        ☑️
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white text-opacity-80 mt-1">{stage.description}</p>
                </div>

                {/* Notes List */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 min-h-96 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {stageNotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {stage.id === 'draft' && (
                            <div>
                              <span className="text-2xl">📝</span>
                              <p className="text-sm mt-2">No draft notes</p>
                              <p className="text-xs">Start by recording a new note</p>
                            </div>
                          )}
                          {stage.id === 'processing' && (
                            <div>
                              <span className="text-2xl">⚙️</span>
                              <p className="text-sm mt-2">Nothing being processed</p>
                            </div>
                          )}
                          {stage.id === 'available_for_review' && (
                            <div>
                              <span className="text-2xl">👀</span>
                              <p className="text-sm mt-2">No notes to review</p>
                            </div>
                          )}
                          {stage.id === 'ready_to_export' && (
                            <div>
                              <span className="text-2xl">📤</span>
                              <p className="text-sm mt-2">Nothing ready to export</p>
                            </div>
                          )}
                          {stage.id === 'exported' && (
                            <div>
                              <span className="text-2xl">✅</span>
                              <p className="text-sm mt-2">No exported notes</p>
                              <p className="text-xs">Taking a paws...</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        stageNotes.map((note, index) => (
                          <Draggable key={note.id} draggableId={note.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white border rounded-lg p-3 mb-2 shadow-sm transition-all cursor-pointer ${
                                  snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                } ${selectedNotes.has(note.id) ? 'ring-2 ring-blue-500' : ''}`}
                                onClick={(e) => {
                                  if (e.metaKey || e.ctrlKey) {
                                    toggleNoteSelection(note.id);
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm text-gray-900 truncate">
                                      {note.title}
                                    </h4>
                                    {note.patient && (
                                      <p className="text-xs text-gray-600 mt-1">
                                        {note.patient.name} ({note.patient.species})
                                      </p>
                                    )}
                                    <div className="flex items-center mt-2 text-xs text-gray-500">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        note.note_type === 'soap_standard' ? 'bg-blue-100 text-blue-800' :
                                        note.note_type === 'soap_callback' ? 'bg-green-100 text-green-800' :
                                        note.note_type === 'dental_record' ? 'bg-purple-100 text-purple-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {note.note_type.replace('_', ' ').toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {formatDate(note.updated_at)}
                                    </p>
                                  </div>
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
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};