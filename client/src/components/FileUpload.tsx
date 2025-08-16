'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, File as FileIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import { filesAPI } from '@/services/api';

interface FileUploadProps {
  folderId?: string;
  onUploadComplete?: (files: any[]) => void;
  onClose?: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export default function FileUpload({ folderId, onUploadComplete, onClose }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      // Upload files one by one to track individual progress
      for (let i = 0; i < files.length; i++) {
        const uploadFile = files[i];
        
        // Skip if already completed or error
        if (uploadFile.status === 'completed' || uploadFile.status === 'error') {
          continue;
        }

        // Update file to uploading status
        setFiles((prev) =>
          prev.map((file) =>
            file.id === uploadFile.id
              ? { ...file, status: 'uploading', progress: 0 }
              : file
          )
        );

        const formData = new FormData();
        formData.append('files', uploadFile.file);
        
        if (folderId) {
          formData.append('folderId', folderId);
        }
        formData.append('description', 'Uploaded via drag & drop');

        try {
          // Create XMLHttpRequest for progress tracking
          const response = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setFiles((prev) =>
                  prev.map((file) =>
                    file.id === uploadFile.id
                      ? { ...file, progress: percentComplete }
                      : file
                  )
                );
              }
            });

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                  reject(new Error('Invalid JSON response'));
                }
              } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Upload timeout'));

            // Get auth token
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
            
            xhr.open('POST', `${apiUrl}/api/files/upload`);
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            
            xhr.send(formData);
          });

          // Update file to completed status
          setFiles((prev) =>
            prev.map((file) =>
              file.id === uploadFile.id
                ? { ...file, status: 'completed', progress: 100 }
                : file
            )
          );
        } catch (error: any) {
          console.error(`Upload error for file ${uploadFile.file.name}:`, error);
          setFiles((prev) =>
            prev.map((file) =>
              file.id === uploadFile.id
                ? {
                    ...file,
                    status: 'error',
                    progress: 0,
                    error: error.message || 'Upload failed',
                  }
                : file
            )
          );
        }
      }

      // Check if all files are completed
      const completedFiles = files.filter(f => f.status === 'completed');
      if (completedFiles.length > 0 && onUploadComplete) {
        // For the callback, we'll need to get the actual file data from the last successful response
        // This is a simplified version - in a real app you'd collect all successful uploads
        onUploadComplete([]);
      }

      // Auto-close after 2 seconds if all files are completed
      const hasErrors = files.some(f => f.status === 'error');
      if (!hasErrors) {
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Upload process error:', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <FileIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Upload Files</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Upload Area */}
        <div className="p-6 flex-1 overflow-hidden">
          {files.length === 0 ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4 transition-colors" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">
                {isDragActive ? 'Drop files here' : 'Upload your files'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                Maximum file size: 100MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Drop zone when files exist */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                  {isDragActive
                    ? 'Drop more files here'
                    : 'Drop more files or click to browse'}
                </p>
              </div>

              {/* File list */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getStatusIcon(file.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate transition-colors">
                            {file.file.name}
                          </p>
                          {file.status === 'uploading' && (
                            <span className="text-xs font-medium text-blue-600">
                              {file.progress}%
                            </span>
                          )}
                          {file.status === 'completed' && (
                            <span className="text-xs font-medium text-green-600">
                              Complete
                            </span>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        {(file.status === 'uploading' || file.status === 'completed') && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                file.status === 'completed' 
                                  ? 'bg-green-500' 
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
                          {formatBytes(file.file.size)}
                          {file.error && (
                            <span className="text-red-500 dark:text-red-400 ml-2">
                              - {file.error}
                            </span>
                          )}
                          {file.status === 'uploading' && (
                            <span className="text-blue-600 dark:text-blue-400 ml-2">
                              - Uploading...
                            </span>
                          )}
                          {file.status === 'completed' && (
                            <span className="text-green-600 dark:text-green-400 ml-2">
                              - Upload complete
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {file.status === 'pending' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 transition-colors">
            {/* Overall Progress Bar */}
            {uploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Overall Progress</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {Math.round((files.filter(f => f.status === 'completed').length / files.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(files.filter(f => f.status === 'completed').length / files.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
                {files.some((f) => f.status === 'completed') && (
                  <span className="text-green-600 dark:text-green-400 ml-2">
                    ({files.filter((f) => f.status === 'completed').length}{' '}
                    uploaded)
                  </span>
                )}
                {files.some((f) => f.status === 'error') && (
                  <span className="text-red-600 dark:text-red-400 ml-2">
                    ({files.filter((f) => f.status === 'error').length}{' '}
                    failed)
                  </span>
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setFiles([])}
                  disabled={uploading}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 transition-colors"
                >
                  Clear All
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={uploadFiles}
                  disabled={uploading || files.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {uploading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
