export enum NoteColor {
  WHITE = '#ffffff',
  YELLOW = '#fef3c7',
  GREEN = '#d1fae5',
  BLUE = '#dbeafe',
  PURPLE = '#e9d5ff',
  PINK = '#fce7f3',
  RED = '#fee2e2',
  ORANGE = '#fed7aa',
  GRAY = '#f3f4f6'
}

export enum NotePriority {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  priority: NotePriority;
  position: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tags?: string[];
  archived: boolean;
  pinned: boolean;
  reminder?: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  color: NoteColor;
  priority: NotePriority;
  tags?: string[];
  pinned?: boolean;
  reminder?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  color?: NoteColor;
  priority?: NotePriority;
  position?: number;
  tags?: string[];
  archived?: boolean;
  pinned?: boolean;
  reminder?: string;
}

export interface ReorderNotesRequest {
  noteIds: string[];
}

export interface NotesResponse {
  success: boolean;
  data: {
    notes: Note[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
  message?: string;
}

export interface NoteResponse {
  success: boolean;
  data: Note;
  message?: string;
}

export interface DeleteNoteResponse {
  success: boolean;
  message: string;
}

// Color configurations for UI
export const NOTE_COLOR_CONFIGS = {
  [NoteColor.WHITE]: {
    bg: 'bg-white dark:bg-slate-800',
    border: 'border-gray-300 dark:border-slate-600',
    text: 'text-gray-900 dark:text-gray-100',
    accent: 'bg-gray-500',
    hover: 'hover:bg-gray-50 dark:hover:bg-slate-700'
  },
  [NoteColor.YELLOW]: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700/50',
    text: 'text-yellow-900 dark:text-yellow-100',
    accent: 'bg-yellow-500',
    hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/30'
  },
  [NoteColor.GREEN]: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700/50',
    text: 'text-green-900 dark:text-green-100', 
    accent: 'bg-green-500',
    hover: 'hover:bg-green-200 dark:hover:bg-green-900/30'
  },
  [NoteColor.BLUE]: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700/50', 
    text: 'text-blue-900 dark:text-blue-100',
    accent: 'bg-blue-500',
    hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/30'
  },
  [NoteColor.PURPLE]: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    border: 'border-purple-300 dark:border-purple-700/50',
    text: 'text-purple-900 dark:text-purple-100',
    accent: 'bg-purple-500',
    hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/30'
  },
  [NoteColor.PINK]: {
    bg: 'bg-pink-100 dark:bg-pink-900/20',
    border: 'border-pink-300 dark:border-pink-700/50',
    text: 'text-pink-900 dark:text-pink-100',
    accent: 'bg-pink-500', 
    hover: 'hover:bg-pink-200 dark:hover:bg-pink-900/30'
  },
  [NoteColor.RED]: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700/50',
    text: 'text-red-900 dark:text-red-100',
    accent: 'bg-red-500',
    hover: 'hover:bg-red-200 dark:hover:bg-red-900/30'
  },
  [NoteColor.ORANGE]: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-orange-300 dark:border-orange-700/50',
    text: 'text-orange-900 dark:text-orange-100',
    accent: 'bg-orange-500',
    hover: 'hover:bg-orange-200 dark:hover:bg-orange-900/30'
  },
  [NoteColor.GRAY]: {
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-900 dark:text-gray-100',
    accent: 'bg-gray-500',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-800/70'
  }
};

// Priority configurations for UI
export const NOTE_PRIORITY_CONFIGS = {
  [NotePriority.LOW]: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Low',
    icon: '🔵'
  },
  [NotePriority.MEDIUM]: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
    label: 'Medium',
    icon: '🟡'
  },
  [NotePriority.HIGH]: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'High',
    icon: '🟠'
  },
  [NotePriority.URGENT]: {
    color: 'text-red-600 dark:text-red-400', 
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Urgent',
    icon: '🔴'
  }
};

export interface NotesSettings {
  enabled: boolean;
  showInSidebar: boolean;
  showInMainArea: boolean;
  defaultColor: NoteColor;
  defaultPriority: NotePriority;
  maxNotesPerPage: number;
  enableDragDrop: boolean;
  showPriorityIcons: boolean;
  showCreatedDate: boolean;
  enableReminders: boolean;
  compactView: boolean;
}

export const DEFAULT_NOTES_SETTINGS: NotesSettings = {
  enabled: true,
  showInSidebar: true,
  showInMainArea: true,
  defaultColor: NoteColor.YELLOW,
  defaultPriority: NotePriority.MEDIUM,
  maxNotesPerPage: 20,
  enableDragDrop: true,
  showPriorityIcons: true,
  showCreatedDate: true,
  enableReminders: false,
  compactView: false
};
