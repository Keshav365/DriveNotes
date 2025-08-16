'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, X, Folder } from 'lucide-react';
import { foldersAPI } from '@/services/api';

interface NewFolderModalProps {
  onClose: () => void;
  onFolderCreated: (folder: any) => void;
  parentFolderId?: string | null;
}

const folderColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
];

export default function NewFolderModal({ onClose, onFolderCreated, parentFolderId }: NewFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(folderColors[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    if (name.length > 255) {
      setError('Folder name must be less than 255 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await foldersAPI.createFolder({
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentFolderId || undefined,
        color: selectedColor,
      });

      if (response.data.success) {
        onFolderCreated(response.data.data);
        onClose();
      } else {
        setError(response.data.message || 'Failed to create folder');
      }
    } catch (error: any) {
      console.error('Error creating folder:', error);
      setError(
        error.response?.data?.message || 
        'An error occurred while creating the folder'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) setError(''); // Clear error when user starts typing
  };

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
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center transition-colors">
              <FolderPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 transition-colors">New Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg transition-colors"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Folder Name */}
          <div className="mb-6">
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Folder Name *
            </label>
            <div className="relative">
              <input
                id="folderName"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter folder name..."
                maxLength={255}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                disabled={loading}
                autoFocus
              />
              <div className="absolute right-3 top-3 text-xs text-gray-400 dark:text-gray-500 transition-colors">
                {name.length}/255
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="folderDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              Description (Optional)
            </label>
            <textarea
              id="folderDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this folder..."
              rows={3}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              disabled={loading}
            />
            <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors">
              {description.length}/1000
            </div>
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 transition-colors">
              Folder Color
            </label>
            <div className="flex items-center space-x-2">
              {folderColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColorSelect(color.value)}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-gray-800 dark:border-gray-300 scale-110'
                      : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  disabled={loading}
                >
                  {selectedColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg transition-colors">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors">Preview:</p>
            <div className="flex items-center space-x-3">
              <Folder className="w-8 h-8" style={{ color: selectedColor }} />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 transition-colors">
                  {name.trim() || 'New Folder'}
                </p>
                {description.trim() && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                    {description.trim()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>Create Folder</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
