import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { api } from '../lib/api';
import { Loader2, User, Mail, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

type SignupFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  beforeLoad: () => {
    const token = localStorage.getItem('token');
    if (token) {
      throw redirect({
        to: '/dashboard',
      });
    }
  },
});

function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm<SignupFormData>();

  const password = watch('password');

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    setPasswordStrength(Math.min(strength, 5));
  }, [password]);

  const getPasswordStrengthLabel = () => {
    if (passwordStrength <= 1) return { text: 'Very Weak', color: 'text-red-600' };
    if (passwordStrength <= 2) return { text: 'Weak', color: 'text-orange-600' };
    if (passwordStrength <= 3) return { text: 'Fair', color: 'text-yellow-600' };
    if (passwordStrength <= 4) return { text: 'Good', color: 'text-blue-600' };
    return { text: 'Strong', color: 'text-green-600' };
  };

  const onSubmit = async (data: SignupFormData) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', {
        type: 'manual',
        message: "Passwords don't match!",
      });
      return;
    }

    setIsLoading(true);
    try {
const response = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });

      // Save token and user data
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      toast.success('Account created successfully!');
      
      // Redirect to dashboard after successful signup
      navigate({
        to: '/dashboard',
        replace: true,
      });
    } catch (error: any) {
      console.error('Signup failed:', error);
      const errorMessage = error.response?.data?.message || 'Signup failed. Please try again.';
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(async (response: any) => {
    setIsGoogleLoading(true);
    try {
      // Send the Google credential token to your backend
      const result = await api.post('/auth/google', {
        credential: response.credential,
      });

      // Save token and user data
      localStorage.setItem('token', result.data.access_token);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      toast.success('Signed in with Google successfully!');
      
      navigate({
        to: '/dashboard',
        replace: true,
      });
    } catch (error: any) {
      console.error('Google sign in failed:', error);
      const errorMessage = error.response?.data?.message || 'Google sign in failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [navigate]);

  // Load Google Identity Services
  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      return; // Don't load if client ID is not configured
    }

    // Check if script already exists
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const initializeGoogle = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn,
          });
        } catch (error) {
          console.error('Failed to initialize Google Identity Services:', error);
        }
      }
    };

    if (window.google) {
      initializeGoogle();
    } else {
      script.onload = initializeGoogle;
    }
  }, [handleGoogleSignIn]);

  const handleGoogleButtonClick = async () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      toast.error('Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    if (!window.google) {
      toast.error('Google sign in is not available. Please try again in a moment.');
      return;
    }

    try {
      // Use Google One Tap or OAuth popup
      window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (response: any) => {
          // For now, we'll use a direct OAuth approach
          // The backend should handle the token verification
          try {
            setIsGoogleLoading(true);
            const result = await api.post('/auth/google', {
              access_token: response.access_token,
            });

            localStorage.setItem('token', result.data.access_token);
            localStorage.setItem('user', JSON.stringify(result.data.user));
            toast.success('Signed up with Google successfully!');
            
            navigate({
              to: '/dashboard',
              replace: true,
            });
          } catch (error: any) {
            console.error('Google sign up failed:', error);
            toast.error(error.response?.data?.message || 'Google sign up failed. Please try again.');
          } finally {
            setIsGoogleLoading(false);
          }
        },
      }).requestAccessToken();
    } catch (error) {
      console.error('Google OAuth error:', error);
      toast.error('Failed to initialize Google sign in.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-2">
            <Link 
              to="/" 
              className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200 p-2 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to home
            </Link>
          </div>
          
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
              <p className="text-gray-600">Sign up to get started</p>
            </div>
            
            {errors.root && (
              <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
                {errors.root.message}
              </div>
            )}
      
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
          <input
            id="name"
            type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    {...register('name', { 
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters'
                      }
                    })}
                    className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
          </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
          <input
            id="email"
            type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
            })}
                    className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
                    disabled={isLoading || isGoogleLoading}
          />
                </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
          <input
            id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                        message: 'Password must be at least 8 characters'
                      }
                    })}
                    className={`pl-10 pr-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400 ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isLoading || isGoogleLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${getPasswordStrengthLabel().color}`}>
                        {getPasswordStrengthLabel().text}
                      </span>
                      <span className="text-xs text-gray-500">
                        {passwordStrength}/5
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          passwordStrength <= 1 ? 'bg-red-500' :
                          passwordStrength <= 2 ? 'bg-orange-500' :
                          passwordStrength <= 3 ? 'bg-yellow-500' :
                          passwordStrength <= 4 ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
          <input
            id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
            {...register('confirmPassword', {
                      required: 'Please confirm your password',
              validate: value =>
                        value === password || 'The passwords do not match'
                    })}
                    className={`pl-10 pr-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-400 ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isLoading || isGoogleLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

              <div>
          <button
            type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
                    isLoading || isGoogleLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
          </button>
        </div>
      </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleButtonClick}
                disabled={isLoading || isGoogleLoading || !import.meta.env.VITE_GOOGLE_CLIENT_ID}
                className={`w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${
                  isLoading || isGoogleLoading || !import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Signing in with Google...
                  </>
                ) : (
                  <>
                    <span className="sr-only">Sign up with Google</span>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign up with Google
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-gray-600">
          Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}