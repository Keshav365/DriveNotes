'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Note, 
  NoteColor, 
  NotePriority, 
  CreateNoteRequest,
  UpdateNoteRequest,
  DEFAULT_NOTES_SETTINGS 
} from '@/types/notes';
import { notesAPI } from '@/services/api';
import NoteCard from './NoteCard';
import NoteModal from './NoteModal';
import {
  Plus,
  Search,
  Filter,
  SortAsc,
  RefreshCw,
  Archive,
  Grid,
  List,
  Settings,
  Download,
  Upload,
  Trash2,
  Pin,
  Palette,
  AlertTriangle
} from 'lucide-react';

interface NotesWidgetProps {
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  enableDragDrop?: boolean;
  enableBulkOperations?: boolean;
  compact?: boolean;
  showPriorityIcons?: boolean;
  showCreatedDate?: boolean;
  defaultView?: 'grid' | 'list';
  onNoteClick?: (note: Note) => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'createdAt' | 'updatedAt' | 'title' | 'priority' | 'position';
type FilterOption = 'all' | 'pinned' | 'archived' | NoteColor | NotePriority;

const NotesWidget: React.FC<NotesWidgetProps> = ({
  className = '',
  maxHeight = '600px',
  showHeader = true,
  enableDragDrop = true,
  enableBulkOperations = true,
  compact = false,
  showPriorityIcons = true,
  showCreatedDate = true,
  defaultView = 'grid',
  onNoteClick
}) => {
  // State management
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // UI states
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Load notes
  const loadNotes = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const params: any = {
        sortBy,
        sortOrder,
        limit: 50
      };

      // Apply filters
      if (filterBy === 'pinned') {
        params.pinned = true;
      } else if (filterBy === 'archived') {
        params.archived = true;
      } else if (Object.values(NoteColor).includes(filterBy as NoteColor)) {
        params.color = filterBy;
      } else if (Object.values(NotePriority).includes(filterBy as NotePriority)) {
        params.priority = filterBy;
      }

      // Apply search
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await notesAPI.getNotes(params);
      if (response.data.success) {
        setNotes(response.data.data.notes);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortBy, sortOrder, filterBy, searchQuery]);

  // Initial load and refresh on dependency changes
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Handle note operations
  const handleCreateNote = async (noteData: CreateNoteRequest) => {
    try {
      const response = await notesAPI.createNote(noteData);
      if (response.data.success) {
        setNotes(prev => [response.data.data, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const response = await notesAPI.updateNote(noteId, updates);
      if (response.data.success) {
        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, ...response.data.data } : note
        ));
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesAPI.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setSelectedNotes(prev => prev.filter(id => id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handlePinNote = async (noteId: string, pinned: boolean) => {
    try {
      const response = await notesAPI.pinNote(noteId, pinned);
      if (response.data.success) {
        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, pinned } : note
        ));
      }
    } catch (error) {
      console.error('Failed to pin/unpin note:', error);
    }
  };

  const handleDuplicateNote = async (noteId: string) => {
    try {
      const response = await notesAPI.duplicateNote(noteId);
      if (response.data.success) {
        setNotes(prev => [response.data.data, ...prev]);
      }
    } catch (error) {
      console.error('Failed to duplicate note:', error);
    }
  };

  const handleColorChange = async (noteId: string, color: NoteColor) => {
    try {
      const response = await notesAPI.updateNoteColor(noteId, color);
      if (response.data.success) {
        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, color } : note
        ));
      }
    } catch (error) {
      console.error('Failed to update note color:', error);
    }
  };

  const handlePriorityChange = async (noteId: string, priority: NotePriority) => {
    try {
      const response = await notesAPI.updateNotePriority(noteId, priority);
      if (response.data.success) {
        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, priority } : note
        ));
      }
    } catch (error) {
      console.error('Failed to update note priority:', error);
    }
  };

  // Handle drag and drop
  const handleDragEnd = async (result: any) => {
    if (!result.destination || !enableDragDrop) return;

    const newNotes = Array.from(notes);
    const [reorderedNote] = newNotes.splice(result.source.index, 1);
    newNotes.splice(result.destination.index, 0, reorderedNote);

    // Update local state immediately for better UX
    setNotes(newNotes);

    // Update positions on server
    try {
      const noteIds = newNotes.map(note => note.id);
      await notesAPI.reorderNotes({ noteIds });
    } catch (error) {
      console.error('Failed to reorder notes:', error);
      // Revert on error
      loadNotes(true);
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedNotes.length === 0) return;
    
    if (confirm(`Delete ${selectedNotes.length} selected notes? This action cannot be undone.`)) {
      try {
        await notesAPI.bulkDelete(selectedNotes);
        setNotes(prev => prev.filter(note => !selectedNotes.includes(note.id)));
        setSelectedNotes([]);
        setShowBulkActions(false);
      } catch (error) {
        console.error('Failed to bulk delete notes:', error);
      }
    }
  };

  const handleBulkPin = async (pinned: boolean) => {
    if (selectedNotes.length === 0) return;

    try {
      await notesAPI.bulkUpdate(selectedNotes, { pinned });
      setNotes(prev => prev.map(note => 
        selectedNotes.includes(note.id) ? { ...note, pinned } : note
      ));
      setSelectedNotes([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to bulk pin/unpin notes:', error);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const selectAllNotes = () => {
    setSelectedNotes(notes.map(note => note.id));
  };

  const clearSelection = () => {
    setSelectedNotes([]);
  };

  // Filter and sort notes
  const filteredAndSortedNotes = notes.filter(note => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return note.title.toLowerCase().includes(query) || 
             note.content.toLowerCase().includes(query) ||
             (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)));
    }
    return true;
  });

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading notes...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm transition-colors ${className}`}
    >
      {/* Header */}
      {showHeader && (
        <div className="p-6 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
              <span>📝</span>
              <span>Notes</span>
              {notes.length > 0 && (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  {notes.length}
                </span>
              )}
            </h2>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadNotes(true)}
                disabled={refreshing}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setShowNoteModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Note</span>
              </button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="position">Position</option>
                <option value="createdAt">Created</option>
                <option value="updatedAt">Updated</option>
                <option value="title">Title</option>
                <option value="priority">Priority</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <SortAsc className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} View`}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {enableBulkOperations && selectedNotes.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {selectedNotes.length} note{selectedNotes.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkPin(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                >
                  <Pin className="w-3 h-3" />
                  <span>Pin</span>
                </button>
                <button
                  onClick={() => handleBulkPin(false)}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Unpin
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes content */}
      <div className={`p-6 ${maxHeight ? `max-h-[${maxHeight}] overflow-y-auto` : ''}`}>
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {filteredAndSortedNotes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms or filters'
                : 'Create your first note to get started organizing your thoughts'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNoteModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create Note</span>
              </button>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="notes" direction={viewMode === 'grid' ? 'horizontal' : 'vertical'}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'space-y-4'
                  }
                >
                  <AnimatePresence>
                    {filteredAndSortedNotes.map((note, index) => (
                      <Draggable
                        key={note.id}
                        draggableId={note.id}
                        index={index}
                        isDragDisabled={!enableDragDrop}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              ${viewMode === 'list' ? 'w-full' : ''} 
                              ${enableBulkOperations ? 'cursor-pointer' : ''}
                            `}
                            onClick={() => {
                              if (enableBulkOperations && !snapshot.isDragging) {
                                toggleNoteSelection(note.id);
                              }
                              onNoteClick?.(note);
                            }}
                          >
                            <div className={`
                              ${selectedNotes.includes(note.id) ? 'ring-2 ring-blue-500' : ''}
                            `}>
                              <NoteCard
                                note={note}
                                onEdit={handleUpdateNote}
                                onDelete={handleDeleteNote}
                                onPin={handlePinNote}
                                onDuplicate={handleDuplicateNote}
                                onColorChange={handleColorChange}
                                onPriorityChange={handlePriorityChange}
                                compact={compact}
                                showPriorityIcon={showPriorityIcons}
                                showCreatedDate={showCreatedDate}
                                isDragging={snapshot.isDragging}
                                dragHandleProps={enableDragDrop ? provided.dragHandleProps : undefined}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Note Modal */}
      <NoteModal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setEditingNote(null);
        }}
        note={editingNote}
        onSave={editingNote ? 
          (data) => handleUpdateNote(editingNote.id, data as UpdateNoteRequest) : 
          handleCreateNote
        }
        onDelete={editingNote ? () => handleDeleteNote(editingNote.id) : undefined}
        defaultColor={DEFAULT_NOTES_SETTINGS.defaultColor}
        defaultPriority={DEFAULT_NOTES_SETTINGS.defaultPriority}
      />
    </motion.div>
  );
};

export default NotesWidget;
