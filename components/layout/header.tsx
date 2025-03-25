'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, Moon, Sun, LogOut, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/authContext';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Function to toggle theme
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Add or remove the dark class from html
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save the setting in localStorage
    localStorage.setItem('darkMode', newDarkMode ? 'true' : 'false');
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/login');
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

  // When mounting the component, check saved theme
  useEffect(() => {
    // Check system preferences if no saved settings
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedDarkMode = localStorage.getItem('darkMode') === 'true' || 
                         (localStorage.getItem('darkMode') === null && prefersDark);
    
    setDarkMode(savedDarkMode);
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <header className="h-16 bg-background border-b border-accent/10 flex items-center px-6 justify-between z-20 relative">
      {/* Subtle gold accent line at the bottom */}
      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-accent/30"></div>
      
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2 text-muted-foreground hover:text-foreground hover:bg-accent/10">
          <Menu className="h-5 w-5" />
        </Button>
        
        {isSearchOpen ? (
          <div className="relative">
            <Input
              type="search"
              placeholder="Search..."
              className="w-64 md:w-80 pl-10 h-10 bg-accent/5 border-accent/20 focus-visible:ring-accent/30 transition-all"
              autoFocus
              onBlur={() => setIsSearchOpen(false)}
            />
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-accent/70" />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/10"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        {/* Theme toggle button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-accent" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        {/* Notifications dropdown */}
        <div className="relative" ref={notificationsRef}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/10 relative transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-background"></span>
          </Button>
          
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-background border border-accent/20 rounded-md shadow-lg py-1 z-[100]">
              <div className="px-4 py-2 border-b border-accent/10">
                <h3 className="text-sm font-medium">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-accent/5 border-b border-accent/10">
                  <p className="text-sm">New appointment booked</p>
                  <p className="text-xs text-muted-foreground mt-1">10 minutes ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-accent/5 border-b border-accent/10">
                  <p className="text-sm">Appointment cancelled</p>
                  <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-accent/5">
                  <p className="text-sm">New client registered</p>
                  <p className="text-xs text-muted-foreground mt-1">Yesterday</p>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-accent/10">
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
              "h-9 w-9 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center",
              "transition-all hover:bg-accent/20 cursor-pointer"
            )}
          >
            <span className="text-sm font-medium text-accent">
              {user?.name?.charAt(0) || 'R'}
            </span>
          </div>
          
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-background border border-accent/20 rounded-md shadow-lg py-1 z-[100]">
              <div className="px-4 py-2 border-b border-accent/10">
                <p className="text-sm font-medium truncate">{user?.email || 'richard@gmail.com'}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.businessName || 'Pied Piper'}</p>
              </div>
              
              <a 
                href="/profile" 
                className="px-4 py-2 text-sm flex items-center gap-3 hover:bg-accent/5 transition-colors"
              >
                <User className="h-4 w-4 text-accent/70" />
                <span>Profile</span>
              </a>
              
              <a 
                href="/settings" 
                className="px-4 py-2 text-sm flex items-center gap-3 hover:bg-accent/5 transition-colors"
              >
                <Settings className="h-4 w-4 text-accent/70" />
                <span>Settings</span>
              </a>
              
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-accent/5 transition-colors text-left border-t border-accent/10 mt-1"
              >
                <LogOut className="h-4 w-4 text-accent/70" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}