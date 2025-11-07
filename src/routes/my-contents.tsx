import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { FileText, Clock, BookOpen, Search, Edit2, Trash2, Eye, Loader2, Plus, Filter, Grid, List, Zap, CheckCircle, Archive, Code } from 'lucide-react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

type ContentItem = {
  id: string;
  title: string;
  type: 'quiz' | 'lesson' | 'video' | 'document';
  subject: string;
  grade: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
  thumbnailUrl?: string;
};

export const Route = createFileRoute('/my-contents')({
  component: () => (
    <ProtectedRoute>
      <MyContentsPage />
    </ProtectedRoute>
  ),
});

function MyContentsPage() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchContents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/contents/my-contents');
      // Backend returns { data: [...] }, API interceptor unwraps to just the data array
      // But check if it's already an array or needs unwrapping
      let contentsData: ContentItem[] = [];
      
      if (Array.isArray(response)) {
        contentsData = response;
      } else if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
        contentsData = response.data;
      } else if (response && typeof response === 'object' && Array.isArray(response)) {
        contentsData = response as ContentItem[];
      }
      
      setContents(contentsData);
    } catch (error) {
      console.error('Failed to fetch contents:', error);
      toast.error('Failed to load your contents. Please try again.');
      setContents([]); // Set empty array on error to prevent undefined.length errors
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate({ to: '/login' });
      return;
    }
    
    fetchContents();
  }, [navigate]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsDeleting(id);
      await api.delete(`/contents/${id}`);
      setContents(contents.filter(content => content.id !== id));
      toast.success('Content deleted successfully');
    } catch (error) {
      console.error('Failed to delete content:', error);
      toast.error('Failed to delete content. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quiz':
        return { icon: FileText, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
      case 'video':
        return { icon: Zap, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600' };
      case 'document':
        return { icon: FileText, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
      default:
        return { icon: BookOpen, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
    }
  };

  // Calculate statistics - ensure contents is always an array
  const contentsArray = Array.isArray(contents) ? contents : [];
  const stats = {
    total: contentsArray.length,
    published: contentsArray.filter(c => c.status === 'published').length,
    draft: contentsArray.filter(c => c.status === 'draft').length,
    archived: contentsArray.filter(c => c.status === 'archived').length,
  };

  const filteredContents = (Array.isArray(contents) ? contents : []).filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (content.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || content.status === statusFilter;
    const matchesType = typeFilter === 'all' || content.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your contents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Code className="h-8 w-8 mr-3 text-blue-600" />
                My Contents
              </h1>
              <p className="text-gray-600">
                Manage all your educational content in one place
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link 
                to="/create-content" 
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Content
              </Link>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Published</p>
                  <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Drafts</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Archived</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Archive className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by title, subject, or description..."
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="type-filter"
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors sm:text-sm appearance-none"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="lesson">Lesson</option>
                  <option value="quiz">Quiz</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div className="relative">
                <select
                  id="status-filter"
                  className="block w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors sm:text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid view"
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List view"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Display */}
        {filteredContents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">No contents found</h3>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                : 'Get started by creating your first content piece.'}
            </p>
            <div className="mt-6">
              <Link
                to="/create-content"
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Content
              </Link>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => {
              const { icon: Icon, bgColor, textColor } = getTypeIcon(content.type);
              return (
                <div
                  key={content.id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                >
                  {/* Card Header */}
                  <div className={`h-2 ${bgColor}`}></div>
                  
                  <div className="p-6">
                    {/* Icon and Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`h-12 w-12 rounded-xl ${bgColor} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${textColor}`} />
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(content.status)}`}>
                        {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {content.title}
                    </h3>
                    
                    {/* Description */}
                    {content.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {content.description}
                      </p>
                    )}
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                      <span className="font-medium">{content.subject}</span>
                      <span className="text-gray-300">•</span>
                      <span>Grade {content.grade}</span>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(content.updatedAt || content.createdAt), { addSuffix: true })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/contents/${content.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/contents/${content.id}/edit`}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(content.id);
                          }}
                          disabled={isDeleting === content.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {isDeleting === content.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Subject & Grade
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContents.map((content) => {
                    const { icon: Icon, bgColor, textColor } = getTypeIcon(content.type);
                    return (
                      <tr key={content.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center mr-4`}>
                              <Icon className={`h-5 w-5 ${textColor}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900">{content.title}</div>
                              {content.description && (
                                <div className="text-sm text-gray-500 line-clamp-1 mt-1">{content.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor} capitalize`}>
                            {content.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{content.subject}</div>
                          <div className="text-sm text-gray-500">Grade {content.grade}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(content.status)}`}>
                            {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDistanceToNow(new Date(content.updatedAt || content.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              to={`/contents/${content.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              to={`/contents/${content.id}/edit`}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(content.id);
                              }}
                              disabled={isDeleting === content.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {isDeleting === content.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
