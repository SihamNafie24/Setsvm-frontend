import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { User, Mail, MapPin, LogOut, Edit, Camera, Phone, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  dateOfBirth: string;
  bio: string;
  twitter: string;
  linkedin: string;
  github: string;
  avatar: string;
}

export const Route = createFileRoute('/profile')({
  component: () => (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  ),
});

function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    country: user?.country || '',
    dateOfBirth: user?.dateOfBirth || '',
    bio: user?.bio || '',
    twitter: user?.twitter || '',
    linkedin: user?.linkedin || '',
    github: user?.github || '',
    avatar: user?.avatar || ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        dateOfBirth: user.dateOfBirth || '',
        bio: user.bio || '',
        twitter: user.twitter || '',
        linkedin: user.linkedin || '',
        github: user.github || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    
    setIsLoading(true);
    try {
      await updateProfile(formData);
      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          avatar: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-6">
          {/* Cover Photo */}
          <div className="h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -bottom-20 left-8">
              <div className="relative group">
                <Avatar className="h-36 w-36 border-4 border-white shadow-2xl ring-4 ring-white/20">
                  <AvatarImage src={formData.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-5xl font-semibold">
                    {formData.name ? formData.name[0].toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      className="hidden"
                      accept="image/*"
                      aria-label="Upload profile picture"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-110"
                      aria-label="Change profile picture"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Profile Actions */}
            <div className="absolute top-4 right-4 flex flex-wrap gap-2">
              <Button 
                variant="ghost"
                size="sm"
                className="bg-white/90 hover:bg-white text-gray-700 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200"
                onClick={async () => {
                  const confirmed = window.confirm('Are you sure you want to sign out?');
                  if (!confirmed) return;
                  try {
                    setIsLoading(true);
                    await logout();
                    toast({ 
                      title: 'Signed out', 
                      description: 'You have been successfully signed out.',
                      variant: 'default' 
                    });
                    navigate({ to: '/login' });
                  } catch (error) {
                    toast({ 
                      title: 'Sign out failed', 
                      description: 'There was an error signing out. Please try again.',
                      variant: 'destructive' 
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoading ? 'Signing out...' : 'Sign out'}
              </Button>
              
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                    className="bg-white/90 hover:bg-white backdrop-blur-sm border-gray-300 shadow-md"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="bg-white/90 hover:bg-white backdrop-blur-sm border-gray-300 text-gray-700 shadow-md hover:shadow-lg"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
          
          {/* Profile Info */}
          <div className="pt-24 px-8 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{formData.name || 'User'}</h1>
                <p className="text-gray-600 flex items-center mb-3">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{formData.email || 'No email provided'}</span>
                </p>
                {formData.bio && !isEditing && (
                  <p className="text-gray-700 text-base leading-relaxed">{formData.bio}</p>
                )}
              </div>
              <div className="flex gap-3">
                {formData.github && (
                  <a 
                    href={`https://github.com/${formData.github}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-400 hover:text-gray-900 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-full"
                    aria-label="Visit GitHub profile"
                    title="GitHub"
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2 1 .1-.8.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.7 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.4.1-2.9 0 0 1-.3.9.3 3.2 0 1.1.4 2.1 1.1 2.8.3.3.9.9.1 1.1 0 .8-.1 1.5-.1 1.7 0 .3.2.7 1.1.6 6.4-2.1 6.4-8 0-10.1.9-.9 1.1-2.1 1.1-3.2 0-2.4-1.3-3.3-1.3-3.3z"/>
                    </svg>
                  </a>
                )}
                {formData.twitter && (
                  <a 
                    href={`https://twitter.com/${formData.twitter}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-400 hover:text-blue-400 transition-colors duration-200 p-2 hover:bg-blue-50 rounded-full"
                    aria-label="Visit Twitter profile"
                    title="Twitter"
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                )}
                {formData.linkedin && (
                  <a 
                    href={`https://linkedin.com/in/${formData.linkedin}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-400 hover:text-blue-600 transition-colors duration-200 p-2 hover:bg-blue-50 rounded-full"
                    aria-label="Visit LinkedIn profile"
                    title="LinkedIn"
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                About
              </h2>
              {isEditing ? (
                <div>
                  <Label htmlFor="bio" className="sr-only">Bio</Label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={5}
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 text-sm transition duration-150 ease-in-out resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">{formData.bio || 'No bio provided'}</p>
              )}
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center">
                    <User className="h-4 w-4 mr-1 text-gray-400" />
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{formData.name || 'Not provided'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-gray-400" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{formData.email || 'Not provided'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-gray-400" />
                    Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{formData.phone || 'Not provided'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    Date of Birth
                  </Label>
                  {isEditing ? (
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">Street Address</Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {formData.address || 'Not provided'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                  {isEditing ? (
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {formData.city || 'Not provided'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country</Label>
                  {isEditing ? (
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {formData.country || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Social Media */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Social Media
              </h3>
              <div className="space-y-4">
                {/* Twitter */}
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </div>
                      <Input
                        id="twitter"
                        name="twitter"
                        value={formData.twitter}
                        onChange={handleInputChange}
                        placeholder="@username"
                        className="w-full pl-10"
                      />
                    </div>
                  ) : formData.twitter ? (
                    <a
                      href={formData.twitter.startsWith('http') ? formData.twitter : `https://twitter.com/${formData.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                      aria-label="Visit Twitter profile"
                      title="Twitter"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{formData.twitter}</p>
                        <p className="text-xs text-gray-500">Click to visit profile</p>
                      </div>
                      <svg className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">Not connected</p>
                    </div>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      <Input
                        id="linkedin"
                        name="linkedin"
                        value={formData.linkedin}
                        onChange={handleInputChange}
                        placeholder="username"
                        className="w-full pl-10"
                      />
                    </div>
                  ) : formData.linkedin ? (
                    <a
                      href={formData.linkedin.startsWith('http') ? formData.linkedin : `https://linkedin.com/in/${formData.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all duration-200"
                      aria-label="Visit LinkedIn profile"
                      title="LinkedIn"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{formData.linkedin}</p>
                        <p className="text-xs text-gray-500">Click to visit profile</p>
                      </div>
                      <svg className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">Not connected</p>
                    </div>
                  )}
                </div>

                {/* GitHub */}
                <div className="space-y-2">
                  <Label htmlFor="github" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <svg className="h-4 w-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2 1 .1-.8.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.7 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.4.1-2.9 0 0 1-.3.9.3 3.2 0 1.1.4 2.1 1.1 2.8.3.3.9.9.1 1.1 0 .8-.1 1.5-.1 1.7 0 .3.2.7 1.1.6 6.4-2.1 6.4-8 0-10.1.9-.9 1.1-2.1 1.1-3.2 0-2.4-1.3-3.3-1.3-3.3z"/>
                    </svg>
                    GitHub
                  </Label>
                  {isEditing ? (
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2 1 .1-.8.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.7 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.4.1-2.9 0 0 1-.3.9.3 3.2 0 1.1.4 2.1 1.1 2.8.3.3.9.9.1 1.1 0 .8-.1 1.5-.1 1.7 0 .3.2.7 1.1.6 6.4-2.1 6.4-8 0-10.1.9-.9 1.1-2.1 1.1-3.2 0-2.4-1.3-3.3-1.3-3.3z"/>
                        </svg>
                      </div>
                      <Input
                        id="github"
                        name="github"
                        value={formData.github}
                        onChange={handleInputChange}
                        placeholder="username"
                        className="w-full pl-10"
                      />
                    </div>
                  ) : formData.github ? (
                    <a
                      href={formData.github.startsWith('http') ? formData.github : `https://github.com/${formData.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all duration-200"
                      aria-label="Visit GitHub profile"
                      title="GitHub"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <svg className="h-5 w-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2 1 .1-.8.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.7 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.4.1-2.9 0 0 1-.3.9.3 3.2 0 1.1.4 2.1 1.1 2.8.3.3.9.9.1 1.1 0 .8-.1 1.5-.1 1.7 0 .3.2.7 1.1.6 6.4-2.1 6.4-8 0-10.1.9-.9 1.1-2.1 1.1-3.2 0-2.4-1.3-3.3-1.3-3.3z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-gray-900 transition-colors">{formData.github}</p>
                        <p className="text-xs text-gray-500">Click to visit profile</p>
                      </div>
                      <svg className="h-4 w-4 text-gray-400 group-hover:text-gray-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2 1 .1-.8.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.7 0-1.2.4-2.3 1.2-3.1-.1-.3-.5-1.4.1-2.9 0 0 1-.3.9.3 3.2 0 1.1.4 2.1 1.1 2.8.3.3.9.9.1 1.1 0 .8-.1 1.5-.1 1.7 0 .3.2.7 1.1.6 6.4-2.1 6.4-8 0-10.1.9-.9 1.1-2.1 1.1-3.2 0-2.4-1.3-3.3-1.3-3.3z"/>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">Not connected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions (only shown in edit mode) */}
            {isEditing && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-6">
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
