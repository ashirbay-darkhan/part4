'use client';

import { useState, useEffect } from 'react';
import { Menu, Search, Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/authContext';
import { cn } from '@/lib/utils';

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
    
    // Save the setting in localStorage
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
    <header className="h-16 bg-background border-b border-accent/10 flex items-center px-6 justify-between z-10 relative">
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
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground hover:bg-accent/10 relative transition-colors"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-background"></span>
        </Button>
        
        <div className={cn(
          "h-9 w-9 rounded-md bg-accent/10 border border-accent/30 flex items-center justify-center",
          "transition-all hover:bg-accent/20 cursor-pointer"
        )}>
          <span className="text-sm font-medium text-accent">
            {user?.name?.charAt(0) || 'R'}
          </span>
        </div>
      </div>
    </header>
  );
}