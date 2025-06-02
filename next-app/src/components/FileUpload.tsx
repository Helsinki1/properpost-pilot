// components/FileUpload.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'uploading' | 'completed' | 'error';
  progress?: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  fileId?: string;
}

interface FileUploadProps {
  // Optional props for customization
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
  uploadEndpoint?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  title?: string;
  description?: string;
}

export default function FileUpload({
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxFiles = 10,
  uploadEndpoint = '/api/upload',
  onUploadComplete,
  onUploadError,
  className = '',
  title = 'Upload Documents',
  description = 'Drop files here or click to browse'
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`;
    }
    
    if (!allowedTypes.includes(file.type)) {
      return 'File type not allowed';
    }
    
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }
    
    return null;
  };

  // Handle file upload to backend
  const uploadFileToServer = async (file: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'real_estate_document');
    
    try {
      // Get auth token from wherever you store it (localStorage, cookies, context, etc.)
      const token = localStorage.getItem('authToken'); // Adjust based on your auth setup
      
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }
      
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Handle file drops
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    const newFiles: UploadedFile[] = [];
    
    for (const file of acceptedFiles) {
      const validationError = validateFile(file);
      
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        status: validationError ? 'error' : 'uploading',
        progress: 0,
      };
      
      newFiles.push(newFile);
      setFiles(prev => [...prev, newFile]);
      
      if (validationError) {
        onUploadError?.(validationError);
        continue;
      }
      
      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? { ...f, progress: Math.min((f.progress || 0) + 10, 90) }
              : f
          ));
        }, 200);
        
        const result = await uploadFileToServer(file);
        
        clearInterval(progressInterval);
        
        setFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        ));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: 'error', progress: 0 }
            : f
        ));
        onUploadError?.(errorMessage);
      }
    }
    
    setUploading(false);
    
    // Call completion callback with successfully uploaded files
    const completedFiles = files.filter(f => f.status === 'completed');
    if (completedFiles.length > 0) {
      onUploadComplete?.(completedFiles);
    }
  }, [files, maxFiles, maxFileSize, allowedTypes, uploadEndpoint, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((acc, type) => {
      const extensions: { [key: string]: string[] } = {
        'application/pdf': ['.pdf'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
      };
      if (extensions[type]) {
        acc[type] = extensions[type];
      }
      return acc;
    }, {} as { [key: string]: string[] }),
    multiple: maxFiles > 1,
  });

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Remove file from list
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word')) return '📝';
    return '📋';
  };

  return (
    <div className={`space-y-6 ${className} bg-white`}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-4xl">📁</div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-500">
              {description}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Max {formatFileSize(maxFileSize)} per file • {maxFiles} files max
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Select Files'}
          </button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Files ({files.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {files.map((file) => (
              <div key={file.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-xl">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Status */}
                  <div className="flex-shrink-0">
                    {file.status === 'completed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Uploaded
                      </span>
                    )}
                    {file.status === 'uploading' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ⏳ Uploading...
                      </span>
                    )}
                    {file.status === 'error' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ✗ Error
                      </span>
                    )}
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}