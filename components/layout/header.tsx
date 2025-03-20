'use client';

import { useState, useEffect } from 'react';
import { Menu, Search, Bell, Moon, Sun, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/authContext';

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user } = useAuth();

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
    
    // Optionally, save the setting in localStorage
    localStorage.setItem('darkMode', newDarkMode ? 'true' : 'false');
  };

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
    <header className="h-16 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 justify-between">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2 text-pawly-dark-blue dark:text-white">
          <Menu className="h-5 w-5" />
        </Button>
        
        {isSearchOpen ? (
          <div className="relative">
            <Input
              type="search"
              placeholder="Search..."
              className="w-64 pl-10 bg-white dark:bg-pawly-dark-blue/80 text-pawly-dark-blue dark:text-white border-slate-200 dark:border-pawly-dark-blue/60"
              autoFocus
              onBlur={() => setIsSearchOpen(false)}
            />
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-pawly-dark-blue dark:text-white" />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="text-pawly-dark-blue dark:text-white"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Theme toggle button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="text-pawly-dark-blue dark:text-white"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        <Button variant="ghost" size="icon" className="text-pawly-dark-blue dark:text-white">
          <Bell className="h-5 w-5" />
        </Button>
        
        <div className="h-8 w-8 rounded-full bg-pawly-teal flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {user?.name?.charAt(0) || 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}