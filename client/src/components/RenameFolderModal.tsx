'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, X, Folder } from 'lucide-react';
import { foldersAPI } from '@/services/api';

interface RenameFolderModalProps {
  folder: {
    id: string;
    name: string;
    color?: string;
  };
  onClose: () => void;
  onRename: (updatedFolder: any) => void;
}

export default function RenameFolderModal({ folder, onClose, onRename }: RenameFolderModalProps) {
  const [newName, setNewName] = useState(folder.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setError('Folder name is required');
      return;
    }

    if (newName.trim() === folder.name) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await foldersAPI.updateFolder(folder.id, {
        name: newName.trim()
      });

      if (response.data.success) {
        onRename(response.data.data);
        onClose();
      } else {
        setError(response.data.message || 'Failed to rename folder');
      }
    } catch (error: any) {
      console.error('Error renaming folder:', error);
      setError(
        error.response?.data?.message || 
        error.message ||
        'An error occurred while renaming the folder'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
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
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center transition-colors">
              <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 transition-colors">Rename Folder</h2>
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

          {/* Current Folder Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg transition-colors">
            <div className="flex items-center space-x-3">
              <Folder className="w-8 h-8" style={{ color: folder.color || '#3b82f6' }} />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">Current name:</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 transition-colors">{folder.name}</p>
              </div>
            </div>
          </div>

          {/* New Name Input */}
          <div className="mb-6">
            <label htmlFor="newName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
              New Folder Name
            </label>
            <input
              id="newName"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter new folder name..."
              maxLength={255}
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
              }`}
              disabled={loading}
              autoFocus
            />
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
              disabled={loading || !newName.trim() || newName.trim() === folder.name}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Renaming...</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span>Rename</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
