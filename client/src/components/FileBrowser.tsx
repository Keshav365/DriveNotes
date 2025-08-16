'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FolderOpen,
  File as FileIcon, 
  ChevronRight,
  Home,
  ArrowLeft,
  Search,
  Upload,
  FolderPlus,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  Share,
  X,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  HardDrive,
  Edit2
} from 'lucide-react';
import { filesAPI, foldersAPI } from '@/services/api';
import FileUpload from './FileUpload';
import RenameFolderModal from './RenameFolderModal';

interface FileItem {
  id: string;
  originalName: string;
  name: string;
  size: number;
  formattedSize: string;
  mimeType: string;
  url: string;
  uploadedAt: string;
  folderId?: string;
}

interface FolderItem {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  totalSize: number;
  formattedSize: string;
  createdAt: string;
  lastModified: string;
  color?: string;
  parentId?: string;
}

interface BreadcrumbItem {
  id?: string;
  name: string;
  path: string;
}

interface FileBrowserProps {
  onClose: () => void;
  initialFolderId?: string;
}

export default function FileBrowser({ onClose, initialFolderId }: FileBrowserProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ name: 'Home', path: '/' }]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<FolderItem | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    folder: FolderItem | null;
  }>({ show: false, x: 0, y: 0, folder: null });

  useEffect(() => {
    loadFolderContents();
  }, [currentFolderId]);

  const loadFolderContents = async () => {
    try {
      setLoading(true);

      if (currentFolderId) {
        // Load specific folder contents
        const folderResponse = await foldersAPI.getFolder(currentFolderId);

        if (folderResponse.data.success) {
          const folderData = folderResponse.data.data;
          setCurrentFolder(folderData.folder);
          setFiles(folderData.contents.files || []);
          setFolders(folderData.contents.subfolders || []);
          
          // Update breadcrumbs
          updateBreadcrumbs(folderData.folder);
        } else {
          console.error('Failed to load folder:', folderResponse.data.message);
          alert(`Failed to load folder: ${folderResponse.data.message}`);
        }
      } else {
        // Load root level
        const [filesResponse, foldersResponse] = await Promise.all([
          filesAPI.getFiles({ limit: 100, folderId: null }),
          foldersAPI.getFolders({ limit: 100, parentId: null })
        ]);

        if (filesResponse.data.success) {
          setFiles(filesResponse.data.data.files || []);
        }

        if (foldersResponse.data.success) {
          const folders = foldersResponse.data.data.folders || [];
          // Format folders to match interface
          const formattedFolders = folders.map((folder: any) => ({
            id: folder._id,
            name: folder.name,
            description: folder.description,
            fileCount: 0,
            totalSize: 0,
            formattedSize: '0 Bytes',
            createdAt: folder.createdAt,
            lastModified: folder.updatedAt,
            color: folder.color,
            parentId: folder.parent
          }));
          setFolders(formattedFolders);
        }

        setCurrentFolder(null);
        setBreadcrumbs([{ name: 'Home', path: '/' }]);
      }
    } catch (error: any) {
      console.error('Error loading folder contents:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load folder contents';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const updateBreadcrumbs = (folder: FolderItem) => {
    // In a real implementation, you'd build the full path from the folder's parentPath
    const newBreadcrumbs: BreadcrumbItem[] = [{ name: 'Home', path: '/' }];
    
    // For now, just add the current folder
    if (folder.parentId) {
      newBreadcrumbs.push({ name: '...', path: '' }); // Placeholder for parent folders
    }
    newBreadcrumbs.push({ 
      id: folder.id, 
      name: folder.name, 
      path: `/folder/${folder.id}` 
    });
    
    setBreadcrumbs(newBreadcrumbs);
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedItems(new Set());
  };

  const goBack = () => {
    if (currentFolder?.parentId) {
      navigateToFolder(currentFolder.parentId);
    } else {
      navigateToFolder(null);
    }
  };

  const handleItemSelect = (id: string, type: 'file' | 'folder') => {
    const newSelected = new Set(selectedItems);
    const itemId = `${type}-${id}`;
    
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    
    setSelectedItems(newSelected);
  };

  const deleteSelectedItems = async () => {
    if (!confirm('Are you sure you want to delete the selected items?')) return;

    const promises: Promise<any>[] = [];
    
    for (const itemId of Array.from(selectedItems)) {
      const [type, id] = itemId.split('-');
      if (type === 'file') {
        promises.push(filesAPI.deleteFile(id));
      } else if (type === 'folder') {
        promises.push(foldersAPI.deleteFolder(id, false));
      }
    }

    try {
      await Promise.all(promises);
      setSelectedItems(new Set());
      loadFolderContents();
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };

  const downloadFile = (file: FileItem) => {
    window.open(file.url, '_blank');
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
    return '📄';
  };

  const filteredFiles = files.filter(file => 
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder => 
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadComplete = (uploadedFiles: FileItem[]) => {
    setFiles(prev => [...uploadedFiles, ...prev]);
    setShowUpload(false);
    loadFolderContents();
  };

  const handleRenameFolder = (folder: FolderItem) => {
    setRenamingFolder(folder);
    setShowRenameModal(true);
  };

  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!confirm(`Are you sure you want to delete the folder "${folder.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await foldersAPI.deleteFolder(folder.id, false);
      loadFolderContents();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Error deleting folder. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              disabled={!currentFolderId}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">File Browser</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-600">
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || crumb.name || index} className="flex items-center">
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-2" />}
                <button
                  onClick={() => {
                    if (crumb.name === 'Home') {
                      navigateToFolder(null);
                    } else if (crumb.id) {
                      navigateToFolder(crumb.id);
                    }
                  }}
                  className={`${
                    index === breadcrumbs.length - 1 
                      ? 'text-blue-600 dark:text-blue-400 font-medium' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </nav>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-600">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 w-64 transition-colors"
              />
            </div>

            {selectedItems.size > 0 && (
              <button
                onClick={deleteSelectedItems}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedItems.size})</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                {searchTerm ? 'No items found' : 'This folder is empty'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'Upload files or create folders to get started'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Files
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4' : 'space-y-2'}>
              {/* Folders */}
              {filteredFolders.map((folder) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${
                    viewMode === 'grid'
                      ? 'p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:shadow-md transition-shadow cursor-pointer group bg-white dark:bg-slate-800'
                      : 'flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer group bg-white dark:bg-slate-800'
                  } ${selectedItems.has(`folder-${folder.id}`) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:ring-blue-400' : ''}`}
                  onClick={() => {
                    if (selectedItems.size > 0) {
                      handleItemSelect(folder.id, 'folder');
                    } else {
                      navigateToFolder(folder.id);
                    }
                  }}
                >
                  <div className={viewMode === 'grid' ? 'text-center' : 'flex items-center space-x-3 flex-1 min-w-0'}>
                    <div className={viewMode === 'grid' ? 'mb-3' : ''}>
                      <FolderOpen className={`${viewMode === 'grid' ? 'w-12 h-12 mx-auto' : 'w-8 h-8'} text-blue-500`} style={{ color: folder.color || '#3b82f6' }} />
                    </div>
                    <div className={viewMode === 'grid' ? '' : 'flex-1 min-w-0'}>
                      <p className={`font-medium text-gray-900 dark:text-gray-100 ${viewMode === 'list' ? 'truncate' : ''}`}>
                        {folder.name}
                      </p>
                      {viewMode === 'grid' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {folder.fileCount} items • {folder.formattedSize}
                        </p>
                      )}
                      {viewMode === 'list' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {folder.fileCount} items • {folder.formattedSize} • {formatDate(folder.lastModified)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {viewMode === 'list' && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({
                            show: true,
                            x: e.clientX,
                            y: e.clientY,
                            folder: folder
                          });
                        }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Files */}
              {filteredFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${
                    viewMode === 'grid'
                      ? 'p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:shadow-md transition-shadow cursor-pointer group bg-white dark:bg-slate-800'
                      : 'flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer group bg-white dark:bg-slate-800'
                  } ${selectedItems.has(`file-${file.id}`) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:ring-blue-400' : ''}`}
                  onClick={() => handleItemSelect(file.id, 'file')}
                >
                  <div className={viewMode === 'grid' ? 'text-center' : 'flex items-center space-x-3 flex-1 min-w-0'}>
                    <div className={viewMode === 'grid' ? 'mb-3' : ''}>
                      {file.mimeType?.startsWith('image/') && file.url ? (
                        <img
                          src={file.url}
                          alt={file.originalName}
                          className={`${viewMode === 'grid' ? 'w-12 h-12 mx-auto' : 'w-8 h-8'} object-cover rounded`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <div className={`${viewMode === 'grid' ? 'w-12 h-12 mx-auto' : 'w-8 h-8'} flex items-center justify-center text-2xl`}>
                          {getFileIcon(file.mimeType)}
                        </div>
                      )}
                      <FileIcon className={`${viewMode === 'grid' ? 'w-12 h-12 mx-auto' : 'w-8 h-8'} text-gray-400 dark:text-gray-500 hidden`} />
                    </div>
                    <div className={viewMode === 'grid' ? '' : 'flex-1 min-w-0'}>
                      <p className={`font-medium text-gray-900 dark:text-gray-100 ${viewMode === 'list' ? 'truncate' : ''}`} title={file.originalName}>
                        {file.originalName}
                      </p>
                      {viewMode === 'grid' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {file.formattedSize} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                      {viewMode === 'list' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {file.formattedSize} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {viewMode === 'list' && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file);
                        }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemSelect(file.id, 'file');
                        }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
          folderId={currentFolderId || undefined}
        />
      )}

      {/* Context Menu */}
      {contextMenu.show && contextMenu.folder && (
        <>
          <div 
            className="fixed inset-0 z-[55]"
            onClick={() => setContextMenu({ show: false, x: 0, y: 0, folder: null })}
          />
          <div 
            className="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-2 z-[60]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                handleRenameFolder(contextMenu.folder!);
                setContextMenu({ show: false, x: 0, y: 0, folder: null });
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-gray-700 dark:text-gray-200"
            >
              <Edit2 className="w-4 h-4" />
              <span>Rename</span>
            </button>
            <button
              onClick={() => {
                handleDeleteFolder(contextMenu.folder!);
                setContextMenu({ show: false, x: 0, y: 0, folder: null });
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center space-x-2 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* Rename Folder Modal */}
      {showRenameModal && renamingFolder && (
        <RenameFolderModal
          folder={renamingFolder}
          onClose={() => {
            setShowRenameModal(false);
            setRenamingFolder(null);
          }}
          onRename={() => {
            loadFolderContents();
            setShowRenameModal(false);
            setRenamingFolder(null);
          }}
        />
      )}
    </motion.div>
  );
}
