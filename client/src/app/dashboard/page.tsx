'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Cloud, 
  LogOut, 
  User, 
  FolderPlus, 
  Upload,
  Folder,
  File,
  Search,
  Download,
  Trash2,
  Settings,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import FileBrowser from '@/components/FileBrowser';
import NewFolderModal from '@/components/NewFolderModal';
import CalendarWidget from '@/components/CalendarWidget';
import { filesAPI, foldersAPI, userAPI } from '@/services/api';
import {
  LayoutSettings,
  DEFAULT_LAYOUT_SETTINGS,
  WidgetPreferences
} from '@/types/layout';
import ThemeToggle from '@/components/ThemeToggle';
import NotesWidget from '@/components/NotesWidget';
import NotesSidebarWidget from '@/components/NotesSidebarWidget';
import NoteModal from '@/components/NoteModal';
import { CreateNoteRequest } from '@/types/notes';

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [files, setFiles] = useState<any[]>([]); // Recent files (limited to 10)
  const [allFiles, setAllFiles] = useState<any[]>([]); // All files for file browser widget
  const [folders, setFolders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [storageData, setStorageData] = useState({
    used: 0,
    limit: 5 * 1024 * 1024 * 1024, // 5GB default
    usedFormatted: '0 B',
    limitFormatted: '5 GB'
  });
  
  // Layout settings state
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(DEFAULT_LAYOUT_SETTINGS);
  
  // Notes modal state
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Storage formatting utility
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load layout settings from localStorage
  const loadLayoutSettings = () => {
    try {
      const saved = localStorage.getItem('dashboardLayout');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        console.log('📐 Loaded layout settings:', parsedSettings);
        setLayoutSettings(parsedSettings);
      } else {
        console.log('📐 No saved layout settings found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading layout settings:', error);
      // Keep default settings on error
    }
  };

  // Load user storage data
  const loadStorageData = async () => {
    try {
      console.log('🔍 Making profile API request...');
      const response = await userAPI.getProfile();
      console.log('📊 Full response:', response);
      console.log('📊 Response status:', response.status);
      console.log('📊 Response data:', response.data);
      
      if (response.data.success) {
        console.log('✅ API Success');
        console.log('👤 User data keys:', Object.keys(response.data.data));
        console.log('👤 Full user data:', response.data.data);
        
        // Check if storage data exists
        const storageInfo = response.data.data.storage;
        console.log('💾 Storage info:', storageInfo);
        console.log('💾 Storage info type:', typeof storageInfo);
        
        if (storageInfo && typeof storageInfo.used === 'number' && typeof storageInfo.limit === 'number') {
          const { used, limit } = storageInfo;
          console.log('✅ Valid storage data found:', { used, limit });
          setStorageData({
            used,
            limit,
            usedFormatted: formatBytes(used),
            limitFormatted: formatBytes(limit)
          });
        } else {
          // Fallback to default values if storage data is missing
          console.warn('⚠️ Storage data not found in profile, using defaults');
          console.log('Debug storage check:', {
            storageExists: !!storageInfo,
            usedType: typeof storageInfo?.used,
            limitType: typeof storageInfo?.limit,
            usedValue: storageInfo?.used,
            limitValue: storageInfo?.limit
          });
          setStorageData({
            used: 0,
            limit: 5 * 1024 * 1024 * 1024, // 5GB default
            usedFormatted: '0 B',
            limitFormatted: '5 GB'
          });
        }
      } else {
        console.log('❌ API Response not successful:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading storage data:', error);
      // Keep default values on error
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else {
        setLoading(false);
        loadData();
        loadStorageData();
        loadLayoutSettings(); // Load saved layout settings
      }
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [filesResponse, allFilesResponse, foldersResponse] = await Promise.all([
        filesAPI.getFiles({ limit: 10 }), // Recent files
        filesAPI.getFiles({ limit: 50 }),  // All files for browser widget
        foldersAPI.getFolders({ limit: 10 })
      ]);
      
      if (filesResponse.data.success) {
        setFiles(filesResponse.data.data.files);
      }
      
      if (allFilesResponse.data.success) {
        setAllFiles(allFilesResponse.data.data.files);
      }
      
      if (foldersResponse.data.success) {
        setFolders(foldersResponse.data.data.folders);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUploadComplete = (uploadedFiles: any[]) => {
    setFiles(prev => [...uploadedFiles, ...prev]);
    setShowUpload(false);
    loadData(); // Refresh data to get updated counts
    loadStorageData(); // Refresh storage data after upload
  };

  const handleFolderCreated = (newFolder: any) => {
    setFolders(prev => [newFolder, ...prev]);
    setShowNewFolder(false);
    loadData(); // Refresh data to get updated counts
  };

  const deleteFile = async (fileId: string) => {
    try {
      await filesAPI.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setAllFiles(prev => prev.filter(f => f.id !== fileId));
      loadStorageData(); // Refresh storage data after deletion
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 animate-glow"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-lg animate-glow">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent">
                DriveNotes
              </span>
            </div>

            {/* Search & Theme Toggle */}
            <div className="flex-1 max-w-lg mx-8 flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                />
              </div>
              <ThemeToggle variant="dropdown" size="sm" />
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 z-20">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push('/settings');
                          setShowUserMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <hr className="my-1 border-gray-200 dark:border-slate-600" />
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome back, {user.firstName}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Here's what's happening with your files and folders.
          </p>
          {/* Debug indicator for layout settings */}
          {layoutSettings.enabled && (
            <div className="mt-2 text-xs text-blue-600">
              ✨ Custom layout active (QA: {layoutSettings.widgets.showQuickActions ? 'ON' : 'OFF'}, Storage: {layoutSettings.widgets.storageWidget ? 'ON' : 'OFF'}, Calendar: {layoutSettings.widgets.calendarWidget ? 'ON' : 'OFF'})
            </div>
          )}
        </motion.div>

        {/* Quick Actions - conditionally rendered based on layout settings */}
        {(!layoutSettings.enabled || layoutSettings.widgets.showQuickActions) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <button 
              onClick={() => setShowUpload(true)}
              className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 border-dashed border-blue-200 dark:border-blue-400/50 hover:border-blue-300 dark:hover:border-blue-400"
            >
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Upload Files</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Drag and drop or browse</p>
            </button>

            <button 
              onClick={() => setShowNewFolder(true)}
              className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 border-dashed border-green-200 dark:border-green-400/50 hover:border-green-300 dark:hover:border-green-400"
            >
              <FolderPlus className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">New Folder</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Organize your files</p>
            </button>

            <button 
              onClick={() => setShowNoteModal(true)}
              className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 border-dashed border-purple-200 dark:border-purple-400/50 hover:border-purple-300 dark:hover:border-purple-400"
            >
              <File className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">New Note</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Create a smart note</p>
            </button>

            {(!layoutSettings.enabled || layoutSettings.widgets.fileBrowserWidget) && (
              <button 
                onClick={() => setShowFileBrowser(true)}
                className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 border-dashed border-orange-200 dark:border-orange-400/50 hover:border-orange-300 dark:hover:border-orange-400"
              >
                <Folder className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Browse Files</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">View all your content</p>
              </button>
            )}
          </motion.div>
        )}

        {/* Recent Activity & Stats */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Recent Files - conditionally rendered based on layout settings */}
            {(!layoutSettings.enabled || layoutSettings.widgets.recentFilesWidget) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Files</h2>
                  <button 
                    onClick={loadData}
                    disabled={refreshing}
                    className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <div className="space-y-3">
                  {files.length > 0 ? (
                    files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg group transition-colors">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <File className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.originalName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {file.formattedSize} • {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => window.open(file.url, '_blank')}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFile(file.id)}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Upload className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p>No files yet. Upload your first file to get started!</p>
                      <button 
                        onClick={() => setShowUpload(true)}
                        className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                      >
                        Upload Files
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Notes Sidebar Widget - conditionally rendered based on layout settings */}
              {(!layoutSettings.enabled || layoutSettings.widgets.notesSidebarWidget) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <NotesSidebarWidget />
                </motion.div>
              )}
              
              {/* Storage Info - conditionally rendered based on layout settings */}
              {(!layoutSettings.enabled || layoutSettings.widgets.storageWidget) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 transition-colors"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Storage</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-300">Used</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{storageData.usedFormatted} of {storageData.limitFormatted}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            (storageData.used / storageData.limit) > 0.8 ? 'bg-red-500' : 
                            (storageData.used / storageData.limit) > 0.6 ? 'bg-yellow-500' : 'bg-blue-600 dark:bg-blue-500'
                          }`}
                          style={{ width: `${Math.min((storageData.used / storageData.limit) * 100, 100)}%` }}
                        ></div>
                      </div>
                      {(storageData.used / storageData.limit) > 0.8 && (
                        <p className="text-xs text-red-600 mt-1">Storage almost full!</p>
                      )}
                    </div>
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-600">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <span>Files</span>
                        <span>{files.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                        <span>Folders</span>
                        <span>{folders.length}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Calendar Widget - conditionally rendered based on layout settings */}
              {(!layoutSettings.enabled || layoutSettings.widgets.calendarWidget) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <CalendarWidget />
                </motion.div>
              )}
            </div>
          </div>

          {/* Notes Main Widget - conditionally rendered based on layout settings */}
          {(!layoutSettings.enabled || layoutSettings.widgets.notesMainWidget) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <NotesWidget 
                maxHeight="500px"
                compact={false}
                enableDragDrop={true}
                enableBulkOperations={true}
              />
            </motion.div>
          )}
          
          {/* File Browser Card Widget - conditionally rendered based on layout settings */}
          {(!layoutSettings.enabled || layoutSettings.widgets.fileBrowserCardWidget) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">All Files Browser</h2>
                <button 
                  onClick={loadData}
                  disabled={refreshing}
                  className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allFiles.length > 0 ? (
                  allFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg group transition-colors">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                          <File className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.originalName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {file.formattedSize} • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => window.open(file.url, '_blank')}
                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Upload className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p>No files yet. Upload your first file to get started!</p>
                    <button 
                      onClick={() => setShowUpload(true)}
                      className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      Upload Files
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <NewFolderModal
          onFolderCreated={handleFolderCreated}
          onClose={() => setShowNewFolder(false)}
        />
      )}

      {/* File Browser Modal */}
      {showFileBrowser && (
        <FileBrowser
          onClose={() => setShowFileBrowser(false)}
        />
      )}

      {/* Note Modal for Quick Actions */}
      {showNoteModal && (
        <NoteModal
          isOpen={showNoteModal}
          onClose={() => setShowNoteModal(false)}
          onSave={async (noteData: CreateNoteRequest) => {
            // Handle note creation from quick action
            console.log('Note created:', noteData);
          }}
        />
      )}
    </div>
  );
}
