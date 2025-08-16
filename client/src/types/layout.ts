export interface WidgetPreferences {
  // Sidebar widgets
  storageWidget: boolean;
  calendarWidget: boolean;
  notesSidebarWidget: boolean;
  
  // Main area widgets
  recentFilesWidget: boolean;
  fileBrowserWidget: boolean;
  fileBrowserCardWidget: boolean; // New file browser card widget
  notesMainWidget: boolean; // Main notes widget
  
  // Quick actions (always visible but can be configured)
  showQuickActions: boolean;
  
  // Layout preferences
  sidebarPosition: 'left' | 'right';
  widgetSizes: {
    fileBrowser: 'small' | 'medium' | 'large';
    notes: 'small' | 'medium' | 'large';
  };
}

export interface LayoutSettings {
  enabled: boolean;
  widgets: WidgetPreferences;
  lastModified: string;
}

export const DEFAULT_WIDGET_PREFERENCES: WidgetPreferences = {
  // Default: show all widgets
  storageWidget: true,
  calendarWidget: true,
  notesSidebarWidget: true,
  recentFilesWidget: true,
  fileBrowserWidget: false, // Default off since it's new
  fileBrowserCardWidget: true, // Default on for new card widget
  notesMainWidget: true, // Default on for notes
  showQuickActions: true,
  sidebarPosition: 'right',
  widgetSizes: {
    fileBrowser: 'large',
    notes: 'medium'
  }
};

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  enabled: false, // Default to disabled - show all widgets
  widgets: DEFAULT_WIDGET_PREFERENCES,
  lastModified: new Date().toISOString()
};

// Widget info for settings UI
export interface WidgetInfo {
  id: keyof WidgetPreferences;
  name: string;
  description: string;
  icon: string;
  category: 'sidebar' | 'main' | 'general';
  defaultEnabled: boolean;
}

export const WIDGET_INFO: WidgetInfo[] = [
  {
    id: 'recentFilesWidget',
    name: 'Recent Files',
    description: 'Shows your recently uploaded and accessed files',
    icon: 'File',
    category: 'main',
    defaultEnabled: true
  },
  {
    id: 'fileBrowserWidget', 
    name: 'File Browser',
    description: 'Embedded file browser for quick navigation and management',
    icon: 'Folder',
    category: 'main',
    defaultEnabled: false
  },
  {
    id: 'fileBrowserCardWidget',
    name: 'All Files Browser',
    description: 'Shows all your files in an easy-to-browse card format',
    icon: 'File',
    category: 'main',
    defaultEnabled: true
  },
  {
    id: 'notesMainWidget',
    name: 'Notes Manager',
    description: 'Create, edit, organize, and manage your notes with colors and priorities',
    icon: 'StickyNote',
    category: 'main',
    defaultEnabled: true
  },
  {
    id: 'storageWidget',
    name: 'Storage Info',
    description: 'Displays storage usage, limits, and file counts',
    icon: 'HardDrive',
    category: 'sidebar',
    defaultEnabled: true
  },
  {
    id: 'calendarWidget',
    name: 'Calendar Events',
    description: 'Shows upcoming calendar events and holidays',
    icon: 'Calendar',
    category: 'sidebar', 
    defaultEnabled: true
  },
  {
    id: 'notesSidebarWidget',
    name: 'Quick Notes',
    description: 'Quick overview of your recent and pinned notes',
    icon: 'StickyNote',
    category: 'sidebar',
    defaultEnabled: true
  },
  {
    id: 'showQuickActions',
    name: 'Quick Actions',
    description: 'Upload, create folder, browse files, and new note buttons',
    icon: 'Zap',
    category: 'general',
    defaultEnabled: true
  }
];
