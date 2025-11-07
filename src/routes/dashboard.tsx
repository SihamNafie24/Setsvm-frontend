import { createFileRoute, Link } from '@tanstack/react-router';
import { FileText, BookOpen, Plus, TrendingUp, Users, Activity, Clock, CheckCircle, ArrowRight, Code, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

interface ContentItem {
  id: string;
  title: string;
  type: 'quiz' | 'lesson' | 'video' | 'document';
  subject: string;
  grade: string;
  status?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: number;
  type: 'content' | 'user' | 'update' | 'system';
  title: string;
  time: string;
  read: boolean;
  icon: React.ReactNode;
}

function DashboardPage() {
  const { user } = useAuth();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContents: 0,
    publishedContents: 0,
    draftContents: 0,
    recentActivity: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/contents/my-contents');
      const contentsData = response.data || [];
      setContents(contentsData);
      
      // Calculate statistics
      setStats({
        totalContents: contentsData.length,
        publishedContents: contentsData.filter((c: ContentItem) => c.status === 'published').length,
        draftContents: contentsData.filter((c: ContentItem) => c.status === 'draft').length,
        recentActivity: contentsData.filter((c: ContentItem) => {
          const daysSinceUpdate = (new Date().getTime() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate <= 7;
        }).length,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const recentActivities: Activity[] = [
    { 
      id: 1, 
      type: 'content', 
      title: contents.length > 0 ? `Updated "${contents[0]?.title}"` : 'New content published', 
      time: '2 hours ago', 
      read: false,
      icon: <FileText className="h-4 w-4 text-blue-500" />
    },
    { 
      id: 2, 
      type: 'user', 
      title: 'Profile updated successfully', 
      time: '5 hours ago', 
      read: true,
      icon: <Users className="h-4 w-4 text-green-500" />
    },
    { 
      id: 3, 
      type: 'system', 
      title: 'System running smoothly', 
      time: '1 day ago', 
      read: true,
      icon: <CheckCircle className="h-4 w-4 text-purple-500" />
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return <BookOpen className="h-5 w-5" />;
      case 'quiz':
        return <FileText className="h-5 w-5" />;
      case 'video':
        return <Zap className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'bg-blue-100 text-blue-600';
      case 'quiz':
        return 'bg-purple-100 text-purple-600';
      case 'video':
        return 'bg-red-100 text-red-600';
      case 'document':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || 'User'}! 
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your content today.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Contents */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Contents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalContents}</p>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  All time
                </p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Published */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Published</p>
                <p className="text-3xl font-bold text-green-600">{stats.publishedContents}</p>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  Live now
                </p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Drafts */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Drafts</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.draftContents}</p>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Clock className="h-3 w-3 mr-1 text-yellow-500" />
                  In progress
                </p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">This Week</p>
                <p className="text-3xl font-bold text-purple-600">{stats.recentActivity}</p>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Activity className="h-3 w-3 mr-1 text-purple-500" />
                  Recent updates
                </p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-purple-100 flex items-center justify-center">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-blue-600" />
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                  to="/create-content"
                  className="group relative overflow-hidden p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Create Content</h3>
                    <p className="text-sm text-blue-100">Start creating new educational materials</p>
                  </div>
                </Link>
                
                <Link 
                  to="/my-contents"
                  className="group relative overflow-hidden p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">My Contents</h3>
                    <p className="text-sm text-green-100">Manage your existing content</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Contents */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Contents
                </h2>
                <Link 
                  to="/my-contents"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                >
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-500">Loading...</p>
                </div>
              ) : contents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No content yet</p>
                  <Link 
                    to="/create-content"
                    className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                  >
                    Create your first content
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {contents.slice(0, 5).map((content) => (
                    <Link
                      key={content.id}
                      to="/my-contents"
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${getTypeColor(content.type)} flex items-center justify-center mr-3`}>
                            {getTypeIcon(content.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {content.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-500">{content.subject}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-500">Grade {content.grade}</span>
                              <span className="text-gray-300">•</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                content.status === 'published' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {content.status || 'draft'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100" />
                      </div>
                      <p className="text-sm text-gray-500 mt-2 ml-[52px]">
                        Updated {formatDate(content.updatedAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-purple-600" />
                  Activity
                </h2>
              </div>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      activity.read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${activity.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                    {!activity.read && (
                      <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Developer Stats */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  Developer Stats
                </h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium">Content Creation</span>
                  <span className="text-lg font-bold">{stats.totalContents}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium">Success Rate</span>
                  <span className="text-lg font-bold">
                    {stats.totalContents > 0 
                      ? Math.round((stats.publishedContents / stats.totalContents) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium">This Week</span>
                  <span className="text-lg font-bold">{stats.recentActivity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
