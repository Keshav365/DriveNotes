'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  File,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Grid,
  List,
  Filter,
  Upload,
  FolderPlus,
  ArrowUp,
  MoreHorizontal,
  Eye,
  Edit
} from 'lucide-react';
import { filesAPI, foldersAPI } from '@/services/api';

interface FileBrowserWidgetProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

interface FileItem {
  id: string;
  name: string;
  originalName: string;
  type: 'file';
  size: number;
  formattedSize: string;
  uploadedAt: string;
  url: string;
  mimeType: string;
}

interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  createdAt: string;
  fileCount: number;
}

type BrowserItem = FileItem | FolderItem;

export default function FileBrowserWidget({ 
  className = '', 
  size = 'large' 
}: FileBrowserWidgetProps) {
  const [items, setItems] = useState<BrowserItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sizeConfig = {
    small: {
      container: 'h-64',
      maxItems: 5,
      showToolbar: false,
      showSearch: false
    },
    medium: {
      container: 'h-96',
      maxItems: 10,
      showToolbar: true,
      showSearch: true
    },
    large: {
      container: 'h-[500px]',
      maxItems: -1, // Show all
      showToolbar: true,
      showSearch: true
    }
  };

  const config = sizeConfig[size];

  useEffect(() => {
    loadItems();
  }, [currentFolder]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const [filesResponse, foldersResponse] = await Promise.all([
        filesAPI.getFiles({ 
          folderId: currentFolder,
          limit: config.maxItems === -1 ? undefined : config.maxItems
        }),
        foldersAPI.getFolders({ 
          parentId: currentFolder,
          limit: config.maxItems === -1 ? undefined : config.maxItems
        })
      ]);

      const fileItems: BrowserItem[] = filesResponse.data.success 
        ? filesResponse.data.data.files.map((file: any) => ({
            ...file,
            type: 'file' as const
          }))
        : [];

      const folderItems: BrowserItem[] = foldersResponse.data.success
        ? foldersResponse.data.data.folders.map((folder: any) => ({
            ...folder,
            type: 'folder' as const
          }))
        : [];

      const allItems = [...folderItems, ...fileItems];
      setItems(sortItems(allItems));
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const sortItems = (itemsToSort: BrowserItem[]) => {
    return [...itemsToSort].sort((a, b) => {
      // Always show folders first
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;

      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          const aDate = a.type === 'file' ? a.uploadedAt : a.createdAt;
          const bDate = b.type === 'file' ? b.uploadedAt : b.createdAt;
          comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
          break;
        case 'size':
          if (a.type === 'file' && b.type === 'file') {
            comparison = a.size - b.size;
          }
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handleItemClick = (item: BrowserItem) => {
    if (item.type === 'folder') {
      setCurrentFolder(item.id);
      setSelectedItems([]);
    }
  };

  const handleGoUp = () => {
    setCurrentFolder(null); // For simplicity, go to root
    setSelectedItems([]);
  };

  const handleDownload = (file: FileItem) => {
    window.open(file.url, '_blank');
  };

  const handleDelete = async (item: BrowserItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      if (item.type === 'file') {
        await filesAPI.deleteFile(item.id);
      } else {
        await foldersAPI.deleteFolder(item.id);
      }
      await loadItems();
      setSelectedItems([]);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getItemIcon = (item: BrowserItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-5 h-5 text-blue-500" />;
    }
    
    // File type icons based on mime type
    if (item.mimeType?.startsWith('image/')) {
      return <File className="w-5 h-5 text-green-500" />;
    } else if (item.mimeType?.includes('pdf')) {
      return <File className="w-5 h-5 text-red-500" />;
    } else if (item.mimeType?.includes('document') || item.mimeType?.includes('word')) {
      return <File className="w-5 h-5 text-blue-600" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-4 ${config.container} ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading files...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Folder className="w-5 h-5 text-blue-600" />
            <span>Files & Folders</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            {config.showToolbar && (
              <>
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                >
                  {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        {config.showSearch && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Navigation */}
        {currentFolder && (
          <button
            onClick={handleGoUp}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Back to root</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className={`${config.container} overflow-y-auto`}>
        <div className="p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>{searchQuery ? 'No items match your search' : 'No files or folders found'}</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-1'}>
              <AnimatePresence>
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group cursor-pointer ${
                      viewMode === 'grid'
                        ? 'p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50'
                        : 'flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg'
                    } transition-colors`}
                    onClick={() => handleItemClick(item)}
                  >
                    {viewMode === 'grid' ? (
                      // Grid view
                      <div className="text-center">
                        <div className="flex justify-center mb-2">
                          {getItemIcon(item)}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.type === 'file' ? item.formattedSize : `${item.fileCount || 0} items`}
                        </p>
                      </div>
                    ) : (
                      // List view
                      <>
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getItemIcon(item)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.type === 'file' 
                                ? `${item.formattedSize} • ${new Date(item.uploadedAt).toLocaleDateString()}`
                                : `${item.fileCount || 0} items • ${new Date(item.createdAt).toLocaleDateString()}`
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.type === 'file' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item as FileItem);
                              }}
                              className="p-1 text-gray-500 hover:text-blue-600"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item);
                            }}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {config.showToolbar && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{filteredItems.length} items</span>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date</option>
                <option value="size">Sort by Size</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
