'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Note, 
  NoteColor, 
  NotePriority, 
  NOTE_COLOR_CONFIGS, 
  NOTE_PRIORITY_CONFIGS 
} from '@/types/notes';
import {
  Edit3,
  Trash2,
  Pin,
  PinOff,
  Copy,
  Calendar,
  Tag,
  MoreHorizontal,
  Palette,
  AlertTriangle,
  Save,
  X,
  GripVertical
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onEdit?: (noteId: string, updates: Partial<Note>) => void;
  onDelete?: (noteId: string) => void;
  onPin?: (noteId: string, pinned: boolean) => void;
  onDuplicate?: (noteId: string) => void;
  onColorChange?: (noteId: string, color: NoteColor) => void;
  onPriorityChange?: (noteId: string, priority: NotePriority) => void;
  onTagClick?: (tag: string) => void;
  compact?: boolean;
  readonly?: boolean;
  showPriorityIcon?: boolean;
  showCreatedDate?: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
  onPin,
  onDuplicate,
  onColorChange,
  onPriorityChange,
  onTagClick,
  compact = false,
  readonly = false,
  showPriorityIcon = true,
  showCreatedDate = true,
  isDragging = false,
  dragHandleProps
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const colorConfig = NOTE_COLOR_CONFIGS[note.color];
  const priorityConfig = NOTE_PRIORITY_CONFIGS[note.priority];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowColorPicker(false);
        setShowPriorityPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto resize textareas
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleSaveEdit = () => {
    if (onEdit && (editTitle !== note.title || editContent !== note.content)) {
      onEdit(note.id, {
        title: editTitle.trim() || 'Untitled',
        content: editContent.trim()
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, isTitle: boolean = false) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && isTitle) {
      e.preventDefault();
      contentRef.current?.focus();
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

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        scale: isDragging ? 0.95 : 1,
        rotateZ: isDragging ? 5 : 0
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`
        relative group bg-white dark:bg-slate-800 border-2 rounded-lg p-4 
        shadow-sm hover:shadow-lg transition-all duration-200
        ${colorConfig.border} ${colorConfig.hover}
        ${isDragging ? 'z-50' : 'z-auto'}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Color accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colorConfig.accent} rounded-t-lg`} />

      {/* Drag handle */}
      {!readonly && dragHandleProps && (
        <div 
          {...dragHandleProps}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      <div className={`${dragHandleProps ? 'ml-6' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1">
            {/* Priority indicator */}
            {showPriorityIcon && (
              <span 
                className="text-sm cursor-pointer hover:scale-110 transition-transform"
                title={priorityConfig.label}
                onClick={() => !readonly && setShowPriorityPicker(!showPriorityPicker)}
              >
                {priorityConfig.icon}
              </span>
            )}

            {/* Pin indicator */}
            {note.pinned && (
              <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}

            {/* Title */}
            <div className="flex-1">
              {isEditing ? (
                <textarea
                  ref={titleRef}
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    autoResizeTextarea(e.target);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, true)}
                  className={`w-full bg-transparent border-none outline-none resize-none font-semibold text-lg ${colorConfig.text} placeholder-gray-400`}
                  placeholder="Note title..."
                  rows={1}
                />
              ) : (
                <h3 
                  className={`font-semibold text-lg ${colorConfig.text} cursor-text ${compact ? 'text-base' : 'text-lg'}`}
                  onClick={() => !readonly && setIsEditing(true)}
                >
                  {note.title || 'Untitled'}
                </h3>
              )}
            </div>
          </div>

          {/* Action Menu */}
          {!readonly && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all rounded"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 top-6 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowColorPicker(!showColorPicker);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <Palette className="w-4 h-4" />
                      <span>Color</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowPriorityPicker(!showPriorityPicker);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Priority</span>
                    </button>

                    <button
                      onClick={() => {
                        onPin?.(note.id, !note.pinned);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      {note.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      <span>{note.pinned ? 'Unpin' : 'Pin'}</span>
                    </button>

                    <button
                      onClick={() => {
                        onDuplicate?.(note.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>

                    <hr className="my-1 border-gray-200 dark:border-slate-600" />

                    <button
                      onClick={() => {
                        onDelete?.(note.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Color picker */}
              {showColorPicker && (
                <div className="absolute right-0 top-6 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 z-50">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose Color</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(NOTE_COLOR_CONFIGS).map(([color, config]) => (
                      <button
                        key={color}
                        onClick={() => {
                          onColorChange?.(note.id, color as NoteColor);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded-full border-2 ${config.accent} ${
                          note.color === color ? 'ring-2 ring-blue-500' : 'hover:scale-110'
                        } transition-transform`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Priority picker */}
              {showPriorityPicker && (
                <div className="absolute right-0 top-6 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-3 z-50">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Set Priority</h4>
                  <div className="space-y-1">
                    {Object.entries(NOTE_PRIORITY_CONFIGS).map(([priority, config]) => (
                      <button
                        key={priority}
                        onClick={() => {
                          onPriorityChange?.(note.id, priority as NotePriority);
                          setShowPriorityPicker(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm rounded flex items-center space-x-2 ${
                          note.priority === priority 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                            : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          {isEditing ? (
            <textarea
              ref={contentRef}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                autoResizeTextarea(e.target);
              }}
              onKeyDown={handleKeyDown}
              className={`w-full bg-transparent border-none outline-none resize-none ${colorConfig.text} placeholder-gray-400`}
              placeholder="Write your note content..."
              rows={compact ? 2 : 4}
            />
          ) : (
            <p 
              className={`${colorConfig.text} whitespace-pre-wrap cursor-text ${compact ? 'text-sm' : 'text-base'}`}
              onClick={() => !readonly && setIsEditing(true)}
            >
              {compact ? truncateContent(note.content, 100) : note.content || 'Empty note'}
            </p>
          )}
        </div>

        {/* Edit buttons */}
        {isEditing && (
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
            <span className="text-xs text-gray-500">Ctrl+Enter to save</span>
          </div>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors flex items-center space-x-1"
              >
                <Tag className="w-3 h-3" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            {showCreatedDate && (
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(note.updatedAt)}</span>
              </span>
            )}
          </div>

          {note.reminder && (
            <span className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
              <Calendar className="w-3 h-3" />
              <span>Reminder set</span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default NoteCard;
