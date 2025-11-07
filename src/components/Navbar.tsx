import { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { LogOut, User, Settings, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Reusable NavLink component for desktop navigation
const NavLink = ({ to, text, icon }: { to: string; text: string; icon?: React.ReactNode }) => (
  <Link
    to={to}
    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg hover:bg-blue-50 relative group"
    activeProps={{
      className: 'text-blue-600 font-semibold bg-blue-50',
    }}
  >
    {icon && <span className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>}
    <span>{text}</span>
    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-4/5 group-[&.active]:w-4/5"></span>
  </Link>
);

// Reusable MobileNavLink component for mobile navigation
const MobileNavLink = ({ to, text, icon, onClick }: { to: string; text: string; icon?: React.ReactNode; onClick?: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-all duration-200 active:scale-[0.98]"
    activeProps={{
      className: 'text-blue-600 font-semibold bg-blue-50',
    }}
  >
    {icon && <span className="text-gray-400">{icon}</span>}
    <span>{text}</span>
  </Link>
);

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && 
          !(event.target as HTMLElement).closest('button[aria-label="Toggle mobile menu"]')) {
        // Close only if clicking truly outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getUserInitials = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <nav 
        className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
          scrolled ? 'shadow-xl border-b border-gray-100' : 'shadow-lg'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and main navigation */}
            <div className="flex items-center flex-1">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center group">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:via-blue-600 group-hover:to-indigo-700 transition-all duration-300">
                    Setsvm
                  </span>
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              {isAuthenticated && (
                <div className="hidden md:ml-10 md:flex md:space-x-1">
                  <NavLink to="/dashboard" text="Dashboard" />
                  <NavLink to="/my-contents" text="My Contents" />
                  <NavLink to="/create-content" text="Create" />
                  <NavLink to="/profile" text="Profile" />
                </div>
              )}
            </div>

            {/* Desktop Right Side Actions */}
            <div className="hidden md:flex items-center space-x-3">
              {isAuthenticated ? (
                <>
                  {/* User Menu */}
                  <div className="relative" ref={userMenuRef}>
                    <button 
                      className="flex items-center space-x-2 focus:outline-none group hover:bg-gray-50 px-3 py-2 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      aria-label="User menu"
                      aria-expanded={isUserMenuOpen}
                    >
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md ring-2 ring-white">
                        {getUserInitials()}
                      </div>
                      <div className="flex flex-col items-start hidden lg:block">
                        <span className="text-sm font-medium text-gray-900">
                          {user?.name || 'User'}
                        </span>
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>
                    
                    {/* Dropdown menu with animation */}
                    <div 
                      className={`absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 transition-all duration-200 ${
                        isUserMenuOpen 
                          ? 'opacity-100 translate-y-0 pointer-events-auto' 
                          : 'opacity-0 -translate-y-2 pointer-events-none'
                      }`}
                    >
                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="flex items-center text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 px-4 py-2.5 w-full text-left transition-colors rounded-lg mx-1"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          My Profile
                        </Link>
                        <Link
                          to="/dashboard"
                          className="flex items-center text-sm text-gray-700 hover:bg-gray-50 px-4 py-2.5 w-full text-left transition-colors rounded-lg mx-1"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 mr-3 text-gray-400" />
                          Dashboard
                        </Link>
                      </div>
                      <div className="border-t border-gray-200 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors rounded-lg mx-1"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden space-x-2">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle mobile menu"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu with slide animation */}
        <div 
          ref={mobileMenuRef}
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="pt-2 pb-4 space-y-1 px-4">
            {isAuthenticated ? (
              <>
                <MobileNavLink 
                  to="/dashboard" 
                  text="Dashboard" 
                  icon={<Settings className="h-5 w-5" />}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <MobileNavLink 
                  to="/create-content" 
                  text="Create Content"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <MobileNavLink 
                  to="/my-contents" 
                  text="My Contents"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="border-t border-gray-200 pt-4 pb-3 mt-2">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors mb-3 active:scale-[0.98]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
                        {getUserInitials()}
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-base font-medium text-gray-800">
                        {user?.name || 'User'}
                      </div>
                    </div>
                    <User className="h-5 w-5 text-gray-400" />
                  </Link>
                  <div className="mt-2 space-y-1">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5 mr-2" />
                      View Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="block px-4 py-3 rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors text-center shadow-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

    </>
  );
};

export default Navbar;
