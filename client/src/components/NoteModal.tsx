'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Note, 
  NoteColor, 
  NotePriority, 
  NOTE_COLOR_CONFIGS, 
  NOTE_PRIORITY_CONFIGS,
  CreateNoteRequest,
  UpdateNoteRequest 
} from '@/types/notes';
import {
  X,
  Save,
  Palette,
  AlertTriangle,
  Tag,
  Plus,
  Calendar,
  Pin,
  PinOff,
  Trash2
} from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  onSave: (noteData: CreateNoteRequest | UpdateNoteRequest) => void;
  onDelete?: (noteId: string) => void;
  defaultColor?: NoteColor;
  defaultPriority?: NotePriority;
}

const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  note,
  onSave,
  onDelete,
  defaultColor = NoteColor.YELLOW,
  defaultPriority = NotePriority.MEDIUM
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>(defaultColor);
  const [priority, setPriority] = useState<NotePriority>(defaultPriority);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [pinned, setPinned] = useState(false);
  const [reminder, setReminder] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!note;
  const colorConfig = NOTE_COLOR_CONFIGS[color];

  // Initialize form data when modal opens or note changes
  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setColor(note.color);
        setPriority(note.priority);
        setTags(note.tags || []);
        setPinned(note.pinned);
        setReminder(note.reminder || '');
      } else {
        resetForm();
      }
      // Focus title field
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, note]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setColor(defaultColor);
    setPriority(defaultPriority);
    setTags([]);
    setNewTag('');
    setPinned(false);
    setReminder('');
    setIsSaving(false);
  };

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      return; // Don't save empty notes
    }

    setIsSaving(true);

    const noteData = {
      title: trimmedTitle || 'Untitled',
      content: trimmedContent,
      color,
      priority,
      tags: tags.filter(tag => tag.trim()),
      pinned,
      ...(reminder && { reminder })
    };

    try {
      if (isEditing) {
        await onSave(noteData as UpdateNoteRequest);
      } else {
        await onSave(noteData as CreateNoteRequest);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (note && onDelete) {
      if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        onDelete(note.id);
        onClose();
      }
    }
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className={`
            w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl 
            overflow-hidden border-2 ${colorConfig.border}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Color accent bar */}
          <div className={`h-1 ${colorConfig.accent}`} />

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{NOTE_PRIORITY_CONFIGS[priority].icon}</span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {isEditing ? 'Edit Note' : 'New Note'}
                </h2>
              </div>
              {pinned && <Pin className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    autoResizeTextarea(e.target);
                  }}
                  onKeyDown={handleKeyDown}
                  className={`
                    w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg 
                    bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 
                    placeholder-gray-500 dark:placeholder-gray-400 
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                    transition-colors resize-none font-semibold text-lg
                  `}
                  placeholder="Enter note title..."
                  rows={1}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    autoResizeTextarea(e.target);
                  }}
                  onKeyDown={handleKeyDown}
                  className={`
                    w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg 
                    bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 
                    placeholder-gray-500 dark:placeholder-gray-400 
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                    transition-colors resize-none
                  `}
                  placeholder="Write your note content..."
                  rows={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tip: Use Ctrl+Enter to save quickly
                </p>
              </div>

              {/* Color and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Color picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Palette className="w-4 h-4 inline mr-2" />
                    Color
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(NOTE_COLOR_CONFIGS).map(([colorKey, config]) => (
                      <button
                        key={colorKey}
                        onClick={() => setColor(colorKey as NoteColor)}
                        className={`
                          w-10 h-10 rounded-lg border-2 ${config.accent} 
                          ${color === colorKey ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'} 
                          transition-transform
                        `}
                        title={colorKey}
                      />
                    ))}
                  </div>
                </div>

                {/* Priority selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Priority
                  </label>
                  <div className="space-y-2">
                    {Object.entries(NOTE_PRIORITY_CONFIGS).map(([priorityKey, config]) => (
                      <button
                        key={priorityKey}
                        onClick={() => setPriority(priorityKey as NotePriority)}
                        className={`
                          w-full px-3 py-2 text-left text-sm rounded-lg flex items-center space-x-2 
                          ${priority === priorityKey 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300' 
                            : 'hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
                          }
                        `}
                      >
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Tags
                </label>
                
                {/* Existing tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-full flex items-center space-x-2"
                      >
                        <span>#{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add new tag */}
                <div className="flex space-x-2">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Add a tag..."
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Additional options */}
              <div className="space-y-4">
                {/* Pin toggle */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex items-center space-x-2">
                    {pinned ? <Pin className="w-4 h-4 text-amber-600" /> : <PinOff className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm text-gray-700 dark:text-gray-300">Pin this note</span>
                  </div>
                </label>

                {/* Reminder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Reminder (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
            <div className="flex items-center space-x-2">
              {isEditing && onDelete && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || (!title.trim() && !content.trim())}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NoteModal;
