import axios from 'axios';
import { 
  CreateNoteRequest, 
  UpdateNoteRequest, 
  ReorderNotesRequest,
  NotesResponse,
  NoteResponse,
  DeleteNoteResponse 
} from '@/types/notes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register/email', data, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login/email', data, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  googleLogin: (data: { token: string }) =>
    api.post('/auth/google', data, {
      headers: { 'Content-Type': 'application/json' }
    }),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }, {
      headers: { 'Content-Type': 'application/json' }
    }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: any) => api.put('/user/profile', data),
  updatePreferences: (data: any) => api.put('/user/preferences', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/user/change-password', data),
  getStorage: () => api.get('/user/storage'),
  
  // AI Settings
  getAISettings: () => api.get('/user/ai-settings'),
  getAvailableAIProviders: () => api.get('/user/ai-providers'),
  updateAISettings: (data: any) => api.put('/user/ai-settings', data),
  setAIApiKey: (provider: string, apiKey: string) => 
    api.post(`/user/ai-settings/api-key/${provider}`, { apiKey }),
  removeAIApiKey: (provider: string) => 
    api.delete(`/user/ai-settings/api-key/${provider}`),
};

// Files API
export const filesAPI = {
  getFiles: (params?: any) => api.get('/files', { params }),
  uploadFile: (formData: FormData) => {
    // Create a separate axios instance for file uploads to avoid any interference
    return axios.post(`${API_URL}/api/files/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      withCredentials: true,
    });
  },
  getFile: (id: string) => api.get(`/files/${id}`),
  updateFile: (id: string, data: any) => api.put(`/files/${id}`, data),
  deleteFile: (id: string) => api.delete(`/files/${id}`),
  shareFile: (id: string, data: any) => api.post(`/files/${id}/share`, data),
};

// Folders API
export const foldersAPI = {
  getFolders: (params?: any) => api.get('/folders', { params }),
  createFolder: (data: any) => api.post('/folders', data),
  getFolder: (id: string) => api.get(`/folders/${id}`),
  updateFolder: (id: string, data: any) => api.put(`/folders/${id}`, data),
  deleteFolder: (id: string, force?: boolean) => 
    api.delete(`/folders/${id}`, { params: { force } }),
  shareFolder: (id: string, data: any) => api.post(`/folders/${id}/share`, data),
};

// Calendar API
export const calendarAPI = {
  getSettings: () => api.get('/calendar/settings'),
  updateSettings: (data: any) => api.put('/calendar/settings', data),
  initAuth: () => api.post('/calendar/auth/init'),
  authCallback: (data: { code: string; state: string }) => api.post('/calendar/auth/callback', data),
  getEvents: (params?: { 
    daysToShow?: number; 
    maxResults?: number;
    includeHolidays?: string;
  }) => api.get('/calendar/events', { params }),
  getHolidayCalendars: () => api.get('/calendar/holiday-calendars'),
  disconnect: () => api.delete('/calendar/disconnect'),
};

// Notes API
export const notesAPI = {
  // Get all notes with optional filtering and pagination
  getNotes: (params?: {
    offset?: number;
    limit?: number;
    archived?: boolean;
    tags?: string[];
    priority?: string;
    search?: string;
  }): Promise<NotesResponse> => {
    // Convert parameters to match backend expectations
    const queryParams: any = {};
    if (params) {
      if (params.offset !== undefined) queryParams.offset = params.offset;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.archived !== undefined) queryParams.archived = params.archived.toString();
      if (params.priority) queryParams.priority = params.priority;
      if (params.search) queryParams.search = params.search;
      if (params.tags && params.tags.length > 0) queryParams.tags = params.tags;
    }
    return api.get('/notes', { params: queryParams });
  },

  // Get a single note by ID
  getNote: (id: string): Promise<NoteResponse> => api.get(`/notes/${id}`),

  // Create a new note
  createNote: (data: CreateNoteRequest): Promise<NoteResponse> => 
    api.post('/notes', data, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Update an existing note
  updateNote: (id: string, data: UpdateNoteRequest): Promise<NoteResponse> => 
    api.put(`/notes/${id}`, data, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Delete a note
  deleteNote: (id: string): Promise<DeleteNoteResponse> => api.delete(`/notes/${id}`),

  // Archive/Unarchive a note
  archiveNote: (id: string, archived: boolean = true): Promise<NoteResponse> => 
    api.put(`/notes/${id}`, { archived }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Pin/Unpin a note
  pinNote: (id: string, pinned: boolean = true): Promise<NoteResponse> => 
    api.put(`/notes/${id}`, { pinned }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Reorder notes (bulk position update)
  reorderNotes: (data: ReorderNotesRequest): Promise<{ success: boolean; message: string }> => 
    api.post('/notes/reorder', data, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Update note color
  updateNoteColor: (id: string, color: string): Promise<NoteResponse> => 
    api.put(`/notes/${id}`, { color }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Update note priority
  updateNotePriority: (id: string, priority: string): Promise<NoteResponse> => 
    api.put(`/notes/${id}`, { priority }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Duplicate a note
  duplicateNote: (id: string): Promise<NoteResponse> => 
    api.post(`/notes/${id}/duplicate`, {}, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Get all tags used in notes
  getTags: (): Promise<{ success: boolean; data: string[] }> => 
    api.get('/notes/tags'),

  // Bulk operations
  bulkUpdate: (operation: string, noteIds: string[], data?: any): Promise<{ success: boolean; message: string }> => 
    api.post('/notes/bulk', { operation, noteIds, data }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Bulk delete
  bulkDelete: (noteIds: string[]): Promise<DeleteNoteResponse> => 
    api.post('/notes/bulk', {
      operation: 'delete',
      noteIds
    }, {
      headers: { 'Content-Type': 'application/json' }
    }),
};

// AI API for note processing
export const aiAPI = {
  // NEW: Process content directly without requiring saved note
  processContent: (content: string, aiFunction: string, instructions?: string): Promise<{ success: boolean; data: any }> => 
    api.post('/ai/process-content', { content, aiFunction, instructions }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Summarize note content
  summarizeNote: (noteId: string): Promise<{ success: boolean; data: { summary: string; originalLength: number; summaryLength: number } }> => 
    api.post(`/ai/notes/${noteId}/summarize`, {}, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Convert text to table
  createTable: (noteId: string, instructions?: string): Promise<{ success: boolean; data: { table: string; format: string } }> => 
    api.post(`/ai/notes/${noteId}/create-table`, { instructions }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Enhance content (improve writing, fix grammar)
  enhanceContent: (noteId: string, instructions?: string): Promise<{ success: boolean; data: { enhancedContent: string } }> => 
    api.post(`/ai/notes/${noteId}/enhance`, { instructions }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Extract action items and tasks
  extractActionItems: (noteId: string): Promise<{ success: boolean; data: { actionItems: Array<{ task: string; priority?: string; deadline?: string }> } }> => 
    api.post(`/ai/notes/${noteId}/extract-actions`, {}, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Expand content (elaborate on ideas)
  expandContent: (noteId: string, instructions?: string): Promise<{ success: boolean; data: { expandedContent: string } }> => 
    api.post(`/ai/notes/${noteId}/expand`, { instructions }, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // Format content with headings and structure
  formatContent: (noteId: string): Promise<{ success: boolean; data: { formattedContent: string } }> => 
    api.post(`/ai/notes/${noteId}/format`, {}, {
      headers: { 'Content-Type': 'application/json' }
    }),

  // General AI processing with custom prompt
  processWithPrompt: (noteId: string, prompt: string): Promise<{ success: boolean; data: { result: string } }> => 
    api.post(`/ai/notes/${noteId}/process`, { prompt }, {
      headers: { 'Content-Type': 'application/json' }
    }),
};
export default api;
