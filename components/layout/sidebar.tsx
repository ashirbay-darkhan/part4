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

interface MiniCalendarProps {
  onDateSelect: (date: Date) => void;
}

// Mini Calendar Component with enhanced styling
const MiniCalendar = ({ onDateSelect }: MiniCalendarProps) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Get current month and year
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  // Get days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Get days from previous month
  const daysFromPrevMonth = firstDayOfMonth;
  
  // Get days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // Get total cells needed (previous month days + current month days + next month days)
  const totalCells = Math.ceil((daysFromPrevMonth + daysInMonth) / 7) * 7;
  
  // Get days from next month
  const daysFromNextMonth = totalCells - (daysFromPrevMonth + daysInMonth);
  
  // Function to get month name
  const getMonthName = (date: Date): string => {
    return date.toLocaleString('default', { month: 'long' });
  };
  
  // Convert to Russian month name if necessary
  const getMonthNameInLanguage = (date: Date): string => {
    const monthName = getMonthName(date);
    const russianMonths: Record<string, string> = {
      'January': 'январь',
      'February': 'февраль',
      'March': 'март',
      'April': 'апрель',
      'May': 'май',
      'June': 'июнь',
      'July': 'июль',
      'August': 'август',
      'September': 'сентябрь',
      'October': 'октябрь',
      'November': 'ноябрь',
      'December': 'декабрь'
    };
    return russianMonths[monthName] || monthName;
  };
  
  // Function to go to previous month
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  // Function to go to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  // Handle clicking on a specific day
  const handleDateClick = (year: number, month: number, day: number) => {
    // Create date for the selected day (month is 0-indexed in JavaScript)
    const date = new Date(year, month, day);
    
    // Format as YYYY-MM-DD to avoid timezone issues
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Set the selected date
    setSelectedDate(date);
    
    // Call the provided callback with the selected date
    onDateSelect(date);
    
    // Update the displayed month/year if the selected date is in a different month
    if (month !== currentDate.getMonth() || year !== currentDate.getFullYear()) {
      setCurrentDate(new Date(year, month, 1));
    }
  };
  
  // Check if a date is today
  const isToday = (year: number, month: number, day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };
  
  // Check if a date is selected
  const isSelected = (year: number, month: number, day: number): boolean => {
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };
  
  // Function to capitalize first letter
  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  return (
    <div className="px-4 pb-3 pt-3 border-b border-sidebar-border/20 bg-sidebar-primary/5 rounded-lg mx-2 my-2">
      {/* Calendar grid with larger cells */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {/* Day labels */}
        <div className="text-center text-[10px] text-sidebar-foreground/50 mb-1">вс</div>
        <div className="text-center text-[10px] text-sidebar-foreground/50 mb-1">пн</div>
        <div className="text-center text-[10px] text-sidebar-foreground/50 mb-1">вт</div>
        <div className="text-center text-[10px] text-sidebar-foreground/50 mb-1">ср</div>
        <div className="text-center text-[10px] text-sidebar-foreground/50 mb-1">чт</div>
        <div className="text-center text-[10px] text-sidebar-foreground/50 mb-1">пт</div>
        <div className="text-center text-[10px] text-sidebar-foreground/50 mb-1">сб</div>
        
        {/* Previous month days */}
        {Array.from({ length: daysFromPrevMonth }).map((_, index) => {
          const day = daysInPrevMonth - daysFromPrevMonth + index + 1;
          const prevMonth = month - 1 < 0 ? 11 : month - 1;
          const prevYear = month - 1 < 0 ? year - 1 : year;
          
          return (
            <button
              key={`prev-${index}`}
              className="h-6 w-6 text-center text-[10px] opacity-40 hover:opacity-60 text-sidebar-foreground/70 hover:bg-sidebar-accent/5 rounded-full transition-all"
              onClick={() => handleDateClick(prevYear, prevMonth, day)}
            >
              {day}
            </button>
          );
        })}
        
        {/* Current month days */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const isCurrentDay = isToday(year, month, day);
          const isSelectedDay = isSelected(year, month, day);
          
          return (
            <button
              key={`current-${index}`}
              className={cn(
                "h-6 w-6 text-center text-[11px] rounded-full flex items-center justify-center transition-all",
                isCurrentDay && !isSelectedDay && "text-sidebar-foreground font-bold ring-1 ring-sidebar-primary/30",
                isSelectedDay && "bg-sidebar-primary text-sidebar-primary-foreground font-bold",
                !isCurrentDay && !isSelectedDay && "hover:bg-sidebar-accent/15 text-sidebar-foreground/90 hover:text-sidebar-foreground"
              )}
              onClick={() => handleDateClick(year, month, day)}
            >
              {day}
            </button>
          );
        })}
        
        {/* Next month days */}
        {Array.from({ length: daysFromNextMonth }).map((_, index) => {
          const day = index + 1;
          const nextMonth = month + 1 > 11 ? 0 : month + 1;
          const nextYear = month + 1 > 11 ? year + 1 : year;
          
          return (
            <button
              key={`next-${index}`}
              className="h-6 w-6 text-center text-[10px] opacity-40 hover:opacity-60 text-sidebar-foreground/70 hover:bg-sidebar-accent/5 rounded-full transition-all"
              onClick={() => handleDateClick(nextYear, nextMonth, day)}
            >
              {day}
            </button>
          );
        })}
      </div>
      
      {/* Month/Year and Navigation at the bottom */}
      <div className="flex justify-between items-center">
        <div className="text-sidebar-primary text-sm font-medium capitalize">
          {capitalize(getMonthNameInLanguage(currentDate))} {year}
        </div>
        <div className="flex space-x-1">
          <button 
            onClick={goToPrevMonth}
            className="p-0.5 hover:bg-sidebar-accent/15 rounded-full transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={goToNextMonth}
            className="p-0.5 hover:bg-sidebar-accent/15 rounded-full transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

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
              href="/analytics"
              icon={<LineChart className="h-6 w-6" />}
              label="Analytics"
              isActive={pathname.includes('/analytics')}
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
