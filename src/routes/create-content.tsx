import { useState, useRef, ChangeEvent, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Upload, BookOpen, GraduationCap, FileText, X, Loader2, Image, Video, File, ArrowLeft, Save, Eye, CheckCircle, AlertCircle, Zap, Film, Layers, Code } from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { toast } from 'react-hot-toast';
import axios from 'axios';

type ContentType = 'lesson' | 'quiz' | 'video' | 'document';

const subjects = [
  'Mathematics',
  'Science',
  'History',
  'English',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'Art',
  'Music'
];

const grades = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

// This is a workaround for the route registration issue
// The actual route should be registered in your route configuration
const CreateContentRoute = () => {
  return (
    <ProtectedRoute>
      <CreateContentPage />
    </ProtectedRoute>
  );
};

export const Route = createFileRoute('/create-content')({
  component: CreateContentRoute,
});

export default function CreateContentPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<{
    title: string;
    description: string;
    subject: string;
    grade: string;
    contentType: ContentType;
    status?: 'draft' | 'published';
  }>({
    defaultValues: {
      title: '',
      description: '',
      subject: '',
      grade: '',
      contentType: 'lesson',
      status: 'draft',
    },
  });
  
  const contentType = watch('contentType');
  const title = watch('title');
  const description = watch('description');

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8" />;
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  const getFileTypeColor = (file: File) => {
    if (file.type.startsWith('image/')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (file.type.startsWith('video/')) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const onSubmit = async (data: {
    title: string;
    description: string;
    subject: string;
    grade: string;
    contentType: ContentType;
    status?: 'draft' | 'published';
  }) => {
    if (!data.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!data.subject || !data.grade) {
      setError('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Create FormData to send both file and metadata
      const formData = new FormData();
      formData.append('title', data.title.trim());
      formData.append('description', data.description.trim());
      formData.append('type', data.contentType);
      formData.append('subject', data.subject);
      formData.append('grade', data.grade);
      formData.append('status', data.status || 'draft');
      
      // Append file if one was selected
      if (file) {
        formData.append('file', file);
      }

      // Use axios directly with FormData to http://127.0.0.1:3000/api/upload
      // Note: Backend has /api global prefix, so use /api/upload
      // Note: Don't set Content-Type manually - axios will set it with boundary for FormData
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:3000/api/upload', formData, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      toast.success('Content created successfully!');
      navigate({ to: '/my-contents' });
    } catch (err: any) {
      console.error('Upload error:', err);
      let errorMessage = 'Network Error';
      
      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.message || err.response.data?.error || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'Network Error: Unable to connect to the server. Please ensure the backend server is running on http://127.0.0.1:3000';
        console.error('No response received:', err.request);
      } else {
        // Request setup error
        errorMessage = err.message || 'An error occurred while setting up the request';
        console.error('Request setup error:', err.message);
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };


  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = useCallback((selectedFile: File) => {
    // Accept multiple file types
    const acceptedTypes = ['image/', 'video/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    const isValidType = acceptedTypes.some(type => selectedFile.type.startsWith(type));
    
    if (!isValidType) {
      setError('Please upload an image, video, or document file');
      return;
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  }, []);

  const handleInputFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  }, [handleFileChange]);

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'lesson':
        return <BookOpen className="h-6 w-6" />;
      case 'quiz':
        return <GraduationCap className="h-6 w-6" />;
      case 'video':
        return <Film className="h-6 w-6" />;
      case 'document':
        return <FileText className="h-6 w-6" />;
      default:
        return <FileText className="h-6 w-6" />;
    }
  };

  const getContentTypeColor = (type: ContentType) => {
    switch (type) {
      case 'lesson':
        return 'bg-blue-100 text-blue-600 border-blue-300';
      case 'quiz':
        return 'bg-purple-100 text-purple-600 border-purple-300';
      case 'video':
        return 'bg-red-100 text-red-600 border-red-300';
      case 'document':
        return 'bg-green-100 text-green-600 border-green-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              to="/my-contents"
              className="p-2 rounded-lg text-gray-600 hover:bg-white hover:text-blue-600 transition-colors"
              title="Back to My Contents"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center">
                <Code className="h-8 w-8 mr-3 text-blue-600" />
                Create New Content
              </h1>
              <p className="text-gray-600">
                Fill in the details below to create your content
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Main Form Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Content Details</h2>
                </div>

                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      {...register('title', { required: 'Title is required' })}
                      className={`w-full rounded-xl border px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter content title..."
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      {...register('description')}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Describe your content..."
                    />
                  </div>

                  {/* Subject & Grade Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="subject"
                        {...register('subject', { required: 'Subject is required' })}
                        className={`w-full rounded-xl border px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors.subject ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a subject</option>
                        {subjects.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                      {errors.subject && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="grade" className="block text-sm font-semibold text-gray-700 mb-2">
                        Grade <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="grade"
                        {...register('grade', { required: 'Grade is required' })}
                        className={`w-full rounded-xl border px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          errors.grade ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select a grade</option>
                        {grades.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                      {errors.grade && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.grade.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Content Type Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Content Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(['lesson', 'quiz', 'video', 'document'] as ContentType[]).map((type) => (
                        <div key={type}>
                          <input
                            type="radio"
                            id={`content-type-${type}`}
                            className="sr-only"
                            value={type}
                            checked={contentType === type}
                            onChange={() => setValue('contentType', type)}
                          />
                          <label
                            htmlFor={`content-type-${type}`}
                            className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                              contentType === type
                                ? `${getContentTypeColor(type)} border-current shadow-lg transform scale-105`
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`${contentType === type ? '' : 'text-gray-400'}`}>
                              {getContentTypeIcon(type)}
                            </div>
                            <span className={`mt-2 text-sm font-semibold capitalize ${
                              contentType === type ? '' : 'text-gray-600'
                            }`}>
                              {type}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">File Upload</h2>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50 scale-105'
                      : file
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleInputFileChange}
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    className="hidden"
                    aria-label="Upload file"
                    aria-describedby="file-upload-description"
                  />

                  {file ? (
                    <div className="space-y-4">
                      {/* Image Preview */}
                      {filePreview && (
                        <div className="mx-auto max-w-xs">
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="rounded-lg border-2 border-gray-200 max-h-48 mx-auto"
                          />
                        </div>
                      )}
                      
                      {/* File Info */}
                      <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl ${getFileTypeColor(file)} border-2`}>
                        <div className="flex-shrink-0">
                          {getFileIcon(file)}
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <p className="font-semibold truncate">{file.name}</p>
                          <p className="text-xs opacity-75">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile();
                          }}
                          className="flex-shrink-0 p-1 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                          aria-label="Remove file"
                          title="Remove file"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                      <p id="file-upload-description" className="text-sm font-medium text-gray-700 mb-2">
                        <span className="text-blue-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Images, Videos, or Documents (max. 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate({ to: '/my-contents' })}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`flex-1 px-6 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 ${
                    isUploading
                      ? 'bg-blue-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl'
                  }`}
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5" />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Save className="h-5 w-5" />
                      Create Content
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Preview/Sidebar */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
              </div>

              <div className="space-y-4">
                {/* Title Preview */}
                {title ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Title</p>
                    <p className="text-base font-bold text-gray-900">{title}</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No title yet</div>
                )}

                {/* Description Preview */}
                {description ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Description</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{description}</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No description yet</div>
                )}

                {/* Content Type Badge */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Type</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getContentTypeColor(contentType)}`}>
                    {getContentTypeIcon(contentType)}
                    <span className="font-semibold capitalize">{contentType}</span>
                  </div>
                </div>

                {/* Subject & Grade */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Subject</p>
                    <p className="text-sm font-medium text-gray-900">
                      {watch('subject') || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Grade</p>
                    <p className="text-sm font-medium text-gray-900">
                      {watch('grade') || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Quick Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Add a descriptive title for better organization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Upload files up to 50MB in size</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>You can edit content later</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
