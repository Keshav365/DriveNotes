'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Note, 
  NoteColor,
  NotePriority,
  NOTE_COLOR_CONFIGS, 
  NOTE_PRIORITY_CONFIGS,
  CreateNoteRequest 
} from '@/types/notes';
import { notesAPI } from '@/services/api';
import NoteModal from './NoteModal';
import {
  Plus,
  Pin,
  RefreshCw,
  MoreHorizontal,
  Edit3,
  Trash2,
  ExternalLink,
  StickyNote,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface NotesSidebarWidgetProps {
  className?: string;
  maxNotes?: number;
  showPinned?: boolean;
  onNoteClick?: (note: Note) => void;
  onShowAll?: () => void;
}

const NotesSidebarWidget: React.FC<NotesSidebarWidgetProps> = ({
  className = '',
  maxNotes = 5,
  showPinned = true,
  onNoteClick,
  onShowAll
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Load notes
  const loadNotes = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: any = {
        limit: maxNotes,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      };

      // Show pinned notes first if enabled
      if (showPinned) {
        params.pinned = true;
      }

      const response = await notesAPI.getNotes(params);
      
      if (response.data.success) {
        let fetchedNotes = response.data.data.notes;
        
        // If we're showing pinned notes but don't have enough, get recent notes too
        if (showPinned && fetchedNotes.length < maxNotes) {
          const recentResponse = await notesAPI.getNotes({
            limit: maxNotes - fetchedNotes.length,
            sortBy: 'updatedAt',
            sortOrder: 'desc',
            pinned: false
          });
          
          if (recentResponse.data.success) {
            fetchedNotes = [...fetchedNotes, ...recentResponse.data.data.notes];
          }
        }
        
        setNotes(fetchedNotes.slice(0, maxNotes));
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load sidebar notes:', err);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [maxNotes, showPinned]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Handle note operations
  const handleCreateNote = async (noteData: CreateNoteRequest) => {
    try {
      const response = await notesAPI.createNote(noteData);
      if (response.data.success) {
        setNotes(prev => [response.data.data, ...prev.slice(0, maxNotes - 1)]);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesAPI.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      // Load one more note to fill the gap
      if (notes.length === maxNotes) {
        loadNotes(true);
      }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 transition-colors ${className}`}>
        <div className="flex items-center justify-center h-24">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
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
      <div className="p-4 border-b border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <StickyNote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Notes</span>
            {showPinned && (
              <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            )}
          </h3>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => loadNotes(true)}
              disabled={refreshing}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowNoteModal(true)}
              className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
              title="New Note"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {notes.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {showPinned ? 'Pinned & recent notes' : 'Recent notes'}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-6">
            <StickyNote className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              No notes yet
            </p>
            <button
              onClick={() => setShowNoteModal(true)}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1 mx-auto"
            >
              <Plus className="w-3 h-3" />
              <span>Create Note</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notes.map((note) => {
                const colorConfig = NOTE_COLOR_CONFIGS[note.color];
                const priorityConfig = NOTE_PRIORITY_CONFIGS[note.priority];
                
                return (
                  <motion.div
                    key={note.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`
                      group relative p-3 rounded-lg border cursor-pointer
                      transition-all duration-200 hover:shadow-md
                      ${colorConfig.bg} ${colorConfig.border} ${colorConfig.hover}
                    `}
                    onClick={() => {
                      onNoteClick?.(note);
                      setSelectedNote(note);
                    }}
                  >
                    {/* Color accent */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${colorConfig.accent} rounded-l-lg`} />
                    
                    <div className="ml-2">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                          <span className="text-xs" title={priorityConfig.label}>
                            {priorityConfig.icon}
                          </span>
                          
                          {note.pinned && (
                            <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          )}
                          
                          <h4 className={`text-sm font-medium truncate ${colorConfig.text}`}>
                            {note.title || 'Untitled'}
                          </h4>
                        </div>
                        
                        {/* Quick actions */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNote(note);
                              setShowNoteModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePinNote(note.id, !note.pinned);
                            }}
                            className={`p-1 rounded transition-colors ${
                              note.pinned 
                                ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300' 
                                : 'text-gray-400 hover:text-amber-600 dark:hover:text-amber-400'
                            }`}
                            title={note.pinned ? 'Unpin' : 'Pin'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this note?')) {
                                handleDeleteNote(note.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Content preview */}
                      {note.content && (
                        <p className={`text-xs ${colorConfig.text} opacity-80 mb-2 line-clamp-2`}>
                          {truncateText(note.content, 80)}
                        </p>
                      )}
                      
                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {note.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                          {note.tags.length > 2 && (
                            <span className="px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                              +{note.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(note.updatedAt)}</span>
                        </div>
                        
                        {note.reminder && (
                          <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
                            <Calendar className="w-3 h-3" />
                            <span>Reminder</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Show all button */}
            <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
              <button
                onClick={onShowAll}
                className="w-full px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center justify-center space-x-1"
              >
                <span>View all notes</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Note Modal */}
      <NoteModal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setSelectedNote(null);
        }}
        note={selectedNote}
        onSave={selectedNote ? 
          (data) => {
            // Handle update - for now just refresh the list
            loadNotes(true);
          } : 
          handleCreateNote
        }
        onDelete={selectedNote ? () => handleDeleteNote(selectedNote.id) : undefined}
      />
    </motion.div>
  );
};

export default NotesSidebarWidget;
