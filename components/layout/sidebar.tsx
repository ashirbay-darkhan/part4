'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Users, 
  ChevronDown, 
  LineChart, 
  Calendar,
  LogOut,
  Menu,
  X,
  Scissors,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  LayoutGrid,
  CalendarClock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/authContext';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import MiniCalendar from '@/components/layout/mini-calendar';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const SidebarItem = ({
  href,
  icon,
  label,
  isActive,
}: SidebarItemProps) => {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between py-2.5 px-4 text-sm transition-all duration-200 relative group rounded-md mx-1 my-1',
        isActive
          ? 'bg-sidebar-primary/20 text-sidebar-primary'
          : 'hover:bg-sidebar-primary/10 text-sidebar-foreground/90 hover:text-sidebar-foreground'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "transition-colors duration-200",
          isActive ? "text-sidebar-primary" : "text-sidebar-primary/70"
        )}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full"></div>
      )}

      {/* Hover indicator */}
      <div className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-sidebar-primary/50 rounded-r-full opacity-0 transition-opacity duration-200",
        isActive ? "opacity-0" : "group-hover:opacity-100"
      )}></div>
    </Link>
  );
};

// Submenu item component
const SubMenuItem = ({ href, label, isActive }: { href: string; label: string; isActive: boolean }) => (
  <Link
    href={href}
    className={cn(
      'block py-1 pl-9 pr-3 text-xs transition-colors duration-200 rounded-md mx-1',
      isActive
        ? 'bg-sidebar-primary/10 text-sidebar-primary'
        : 'hover:bg-sidebar-primary/5 text-sidebar-foreground/80 hover:text-sidebar-foreground'
    )}
  >
    {label}
  </Link>
);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Handle date selection from mini calendar
  const handleDateSelect = (date: Date) => {
    // Format the date parameter as YYYY-MM-DD
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Navigate to calendar with selected date
    router.push(`/calendar?date=${formattedDate}`);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed top-0 left-0 z-50 w-52 bg-black
          transform transition-transform duration-300 ease-in-out shadow-xl
          md:relative md:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `} 
        style={{ height: '100vh', position: 'fixed' }}
      >
        {/* Inner content container with flex layout */}
        <div className="flex flex-col h-full">
          {/* Compact Logo/Title Section */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <h1 className="text-sm font-bold text-sidebar-primary truncate">
                {user?.businessName || 'Pied piper'}
              </h1>
              <span className="text-xs text-sidebar-foreground/70">Booking</span>
            </div>
            <div className="h-6 w-6 rounded-full bg-sidebar-primary/10 flex items-center justify-center border border-sidebar-primary/30">
              <span className="text-xs font-medium text-sidebar-primary">Pro</span>
            </div>
          </div>
          
          {/* Mini Calendar */}
          <div className="mb-2">
            <MiniCalendar onDateSelect={handleDateSelect} />
          </div>

          {/* Removed Navigation Menu Section Title to save space */}
          <div className="my-1"></div>

          {/* Navigation Menu - Scrollable */}
          <div className="flex-grow overflow-y-auto pt-1 space-y-0">
            <SidebarItem
              href="/dashboard"
              icon={<LayoutGrid className="h-6 w-6" />}
              label="Dashboard"
              isActive={pathname === '/dashboard'}
            />

            <SidebarItem
              href="/services"
              icon={<Scissors className="h-6 w-6" />}
              label="Services"
              isActive={pathname.includes('/services')}
            />

            <SidebarItem
              href="/staff"
              icon={<Users className="h-6 w-6" />}
              label="Staff"
              isActive={pathname.includes('/staff') && !pathname.includes('/calendar')}
            />

            <SidebarItem
              href="/calendar"
              icon={<Calendar className="h-6 w-6" />}
              label="Calendar"
              isActive={pathname.includes('/calendar')}
            />

            <SidebarItem
              href="/clients"
              icon={<UserPlus className="h-6 w-6" />}
              label="Clients"
              isActive={pathname.includes('/clients')}
            />

            <SidebarItem
              href="/booking-form"
              icon={<CalendarClock className="h-6 w-6" />}
              label="Booking Form"
              isActive={pathname.includes('/booking-form')}
            />
            
            {/* Removed Settings link to save space */}
          </div>

          {/* User Profile - Fixed at bottom */}
          <div className="border-t border-sidebar-border/20 px-3 py-2 mt-1 bg-sidebar-primary/5">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-sidebar-primary/10 border border-sidebar-border/20 flex items-center justify-center">
                <span className="text-xs font-medium text-sidebar-foreground">
                  {user?.email?.[0]?.toUpperCase() || 'R'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sidebar-foreground text-xs truncate">{user?.name || 'Richard H.'}</div>
                <div className="text-sidebar-foreground/60 text-[10px] truncate">{user?.email || 'richard@gmail.com'}</div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors hover:bg-sidebar-primary/10 rounded-full h-6 w-6 flex items-center justify-center"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile toggle button */}
      <button 
        className="fixed bottom-4 right-4 bg-sidebar-primary text-sidebar-primary-foreground p-3 rounded-full shadow-lg md:hidden z-50 hover:shadow-xl hover:scale-105 transition-all duration-300"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </>
  );
}
