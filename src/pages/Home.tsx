import { Link } from '@tanstack/react-router';
import { FileText, Upload, FolderOpen, User, Image, Video, File, Plus, ArrowRight, CheckCircle, Users, Rocket, Layers, Shield, Zap } from 'lucide-react';

export function HomePage() {
  const features = [
    {
      icon: <Plus className="w-8 h-8 text-blue-600" />,
      title: 'Create Content Easily',
      description: 'Build posts and projects with our modern form. Add titles, descriptions, and upload files with drag-and-drop support.',
      color: 'blue'
    },
    {
      icon: <FolderOpen className="w-8 h-8 text-purple-600" />,
      title: 'Manage & Organize',
      description: 'View all your content in one place. Edit or delete posts anytime. Organize with categories and tags.',
      color: 'purple'
    },
    {
      icon: <Upload className="w-8 h-8 text-green-600" />,
      title: 'File Upload Support',
      description: 'Upload images, videos, or documents seamlessly. Preview files before publishing.',
      color: 'green'
    },
    {
      icon: <User className="w-8 h-8 text-indigo-600" />,
      title: 'Personal Profile',
      description: 'Customize your profile with personal details and profile picture. Manage your account settings.',
      color: 'indigo'
    },
    {
      icon: <Shield className="w-8 h-8 text-yellow-600" />,
      title: 'Secure & Private',
      description: 'Your content is secure and private. Each user has their own account with protected data.',
      color: 'yellow'
    },
    {
      icon: <Zap className="w-8 h-8 text-red-600" />,
      title: 'Fast & Modern',
      description: 'Built with React + Vite for lightning-fast performance. Clean, responsive design that works everywhere.',
      color: 'red'
    },
  ];

  const fileTypes = [
    { icon: <Image className="w-6 h-6" />, label: 'Images', color: 'text-blue-600' },
    { icon: <Video className="w-6 h-6" />, label: 'Videos', color: 'text-purple-600' },
    { icon: <File className="w-6 h-6" />, label: 'Documents', color: 'text-green-600' },
  ];

  const useCases = [
    {
      title: 'Blog System',
      description: 'Create and manage blog posts with rich content and media.',
      icon: <FileText className="w-6 h-6" />,
    },
    {
      title: 'Gallery App',
      description: 'Organize photos and videos in beautiful galleries.',
      icon: <Image className="w-6 h-6" />,
    },
    {
      title: 'Cloud Storage',
      description: 'Store and manage your files in a mini cloud platform.',
      icon: <FolderOpen className="w-6 h-6" />,
    },
  ];

  const stats = [
    { label: 'Active Users', value: '1K+', icon: Users },
    { label: 'Content Items', value: '10K+', icon: FileText },
    { label: 'Files Uploaded', value: '50K+', icon: Upload },
    { label: 'Uptime', value: '99.9%', icon: Shield },
  ];

  const benefits = [
    'Free to get started',
    'No credit card required',
    'Unlimited content',
    'Drag & drop uploads',
    'Secure & reliable',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm font-semibold mb-6">
              <Rocket className="w-4 h-4 mr-2" />
              Modern Content Management Platform
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              <span className="block">Create, Manage,</span>
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Organize Your Content
              </span>
            </h1>
            
            <p className="mt-6 text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A lightweight CMS platform where you can easily create, manage, and organize your content. Upload files, create posts, and personalize your profile.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 text-lg font-semibold rounded-xl hover:bg-gray-50 hover:border-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Sign In
              </Link>
            </div>

            {/* Benefits List */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 mb-3">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full text-purple-700 text-sm font-semibold mb-4">
              <Layers className="w-4 h-4 mr-2" />
              Powerful Features
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Powerful Content Management Features
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to create, manage, and organize your content efficiently. Simple, fast, and user-friendly.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const colorClasses = {
                blue: 'bg-blue-50 text-blue-600 border-blue-200',
                purple: 'bg-purple-50 text-purple-600 border-purple-200',
                yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
                green: 'bg-green-50 text-green-600 border-green-200',
                red: 'bg-red-50 text-red-600 border-red-200',
                indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
              };
              
              return (
                <div 
                  key={index}
                  className="group relative bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Gradient Top Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${feature.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    feature.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                    feature.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    feature.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    feature.color === 'red' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    'bg-gradient-to-r from-indigo-500 to-indigo-600'
                  }`}></div>
                  
                  <div className={`w-14 h-14 rounded-xl ${colorClasses[feature.color as keyof typeof colorClasses]} border-2 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* File Types Support */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Multiple File Types Supported
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upload and manage different types of files with ease
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {fileTypes.map((item, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 text-center"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gray-100 mb-4 ${item.color}`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{item.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-indigo-100 rounded-full text-indigo-700 text-sm font-semibold mb-4">
              <Layers className="w-4 h-4 mr-2" />
              Expandable Platform
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Use It Your Way
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform can be adapted for various use cases
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((item, index) => (
              <div
                key={index}
                className="relative bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start managing your content in minutes
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Sign Up Free',
                description: 'Create your account in seconds. No credit card required.',
                icon: <User className="w-8 h-8 text-blue-600" />,
              },
              {
                step: '02',
                title: 'Create Content',
                description: 'Add titles, descriptions, and upload files with drag-and-drop.',
                icon: <Plus className="w-8 h-8 text-purple-600" />,
              },
              {
                step: '03',
                title: 'Manage & Organize',
                description: 'View, edit, or delete your content. Organize everything your way.',
                icon: <FolderOpen className="w-8 h-8 text-green-600" />,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="relative bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute -top-4 left-8">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                </div>
                <div className="mb-6 pt-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Ready to manage your content?
            </h2>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
              Join users who are already creating and organizing their content with Setsvm. Start managing your content today - it's free and easy!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center px-8 py-4 bg-white text-blue-700 text-lg font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-white text-lg font-semibold border-2 border-white rounded-xl hover:bg-white/10 transition-all duration-200 shadow-lg"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
