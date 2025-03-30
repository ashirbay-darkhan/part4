'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Menu, Search, Bell, X, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/authContext';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// Use memo to prevent unnecessary re-renders
export const Header = memo(function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();
  
  // Track if there are unread notifications
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  
  // Sample notifications data - in a real app, this would come from an API
  const notifications = [
    { id: 1, title: 'New appointment booked', time: '10 minutes ago', read: false },
    { id: 2, title: 'Appointment cancelled', time: '2 hours ago', read: false },
    { id: 3, title: 'New client registered', time: 'Yesterday', read: true },
    { id: 4, title: 'Staff schedule updated', time: '2 days ago', read: true },
  ];

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setHasUnreadNotifications(false);
    // In a real app, you would make an API call to update the read status
  };
  
  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchTerm = searchInputRef.current?.value;
    if (searchTerm) {
      // Perform search - in a real app this would navigate or filter data
      console.log(`Searching for: ${searchTerm}`);
      // Close search after submission
      setIsSearchOpen(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 justify-between z-20 relative">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden mr-2 text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {isSearchOpen ? (
          <div className="relative">
            <form onSubmit={handleSearchSubmit}>
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search..."
                className="w-64 md:w-80 pl-10 h-10 bg-accent/5 border-accent/20 focus-visible:ring-accent/30 transition-all rounded-full"
                autoFocus
                autoComplete="off"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-accent/70" />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" 
                onClick={() => setIsSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Notifications dropdown */}
        <div className="relative" ref={notificationsRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/10 relative transition-colors"
          >
            <Bell className="h-5 w-5" />
            {hasUnreadNotifications && (
              <span className="absolute top-1 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-background"></span>
            )}
          </Button>
          
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100]">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-medium">Notifications</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs hover:bg-gray-100 transition-colors" 
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors relative",
                      !notification.read && "bg-gray-50"
                    )}
                  >
                    {!notification.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full"></span>
                    )}
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <a href="#" className="text-xs text-accent hover:underline block text-center">
                  View all notifications
                </a>
              </div>
            </div>
          )}
        </div>
        
        {/* User profile dropdown */}
        <div className="relative" ref={userMenuRef}>
          <div 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center cursor-pointer hover:bg-accent/20 transition-colors",
              "border border-accent/20"
            )}
          >
            <span className="text-sm font-medium text-accent">
              {user?.name?.charAt(0) || 'R'}
            </span>
          </div>
          
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100]">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium truncate">{user?.email || 'richard@gmail.com'}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.businessName || 'Pied Piper'}</p>
              </div>
              
              <a 
                href="/profile" 
                className="px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4 text-gray-500" />
                <span>Profile</span>
              </a>
              
              <a 
                href="/settings" 
                className="px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4 text-gray-500" />
                <span>Settings</span>
              </a>
              
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100 mt-1"
              >
                <LogOut className="h-4 w-4 text-gray-500" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});