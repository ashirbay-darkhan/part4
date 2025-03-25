'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Users, 
  ChevronDown, 
  LineChart, 
  ShoppingBag, 
  Calendar,
  LogOut,
  Menu,
  X,
  Scissors,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/authContext';
import { Button } from '@/components/ui/button';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  hasSubMenu?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({
  href,
  icon,
  label,
  isActive,
  hasSubMenu = false,
  isOpen = false,
  onClick,
}: SidebarItemProps) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between py-3 px-4 text-sm transition-all duration-200 relative',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'hover:bg-sidebar-primary/10 text-sidebar-foreground/90'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "transition-colors duration-200",
          isActive ? "text-sidebar-primary-foreground" : "text-sidebar-primary/90"
        )}>
          {icon}
        </div>
        <span>{label}</span>
      </div>
      {hasSubMenu && (
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
            isActive ? "text-sidebar-primary-foreground" : "text-sidebar-primary/90"
          )}
        />
      )}
    </Link>
  );
};

interface MiniCalendarProps {
  onDateSelect: (date: Date) => void;
}

// Mini Calendar Component
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
  
  // Function to handle date click
  const handleDateClick = (year: number, month: number, day: number) => {
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    onDateSelect(newDate);
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
    <div className="px-4 pb-3 pt-3 border-b border-sidebar-border/20 bg-transparent">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sidebar-primary text-base font-medium capitalize">
          {capitalize(getMonthNameInLanguage(currentDate))} {year}
        </div>
        <div className="flex space-x-1.5">
          <button 
            onClick={goToPrevMonth}
            className="p-1 hover:bg-sidebar-accent/15 rounded-full transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={goToNextMonth}
            className="p-1 hover:bg-sidebar-accent/15 rounded-full transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      
      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2 text-xs text-sidebar-foreground/50">
        <div className="text-center">вс</div>
        <div className="text-center">пн</div>
        <div className="text-center">вт</div>
        <div className="text-center">ср</div>
        <div className="text-center">чт</div>
        <div className="text-center">пт</div>
        <div className="text-center">сб</div>
      </div>
      
      {/* Calendar grid - modify button sizes */}
      <div className="grid grid-cols-7 gap-1">
        {/* Previous month days */}
        {Array.from({ length: daysFromPrevMonth }).map((_, index) => {
          const day = daysInPrevMonth - daysFromPrevMonth + index + 1;
          const prevMonth = month - 1 < 0 ? 11 : month - 1;
          const prevYear = month - 1 < 0 ? year - 1 : year;
          
          return (
            <button
              key={`prev-${index}`}
              className="h-6 w-6 text-center text-xs opacity-40 hover:opacity-60 text-sidebar-foreground/70 hover:bg-sidebar-accent/5 rounded-full transition-all"
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
                "h-6 w-6 text-center text-xs rounded-full flex items-center justify-center transition-all",
                isCurrentDay && !isSelectedDay && "text-sidebar-foreground font-bold",
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
              className="h-6 w-6 text-center text-xs opacity-40 hover:opacity-60 text-sidebar-foreground/70 hover:bg-sidebar-accent/5 rounded-full transition-all"
              onClick={() => handleDateClick(nextYear, nextMonth, day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    staff: false,
    clients: false,
  });

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Handle date selection from mini calendar
  const handleDateSelect = (date: Date) => {
    // Format the date parameter as needed for your API
    const formattedDate = date.toISOString().split('T')[0]; // e.g., "2025-03-25"
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
          {/* Logo/Title Section */}
          <div className="px-4 pt-5 pb-4 flex items-center justify-between">
            <h1 className="text-lg font-medium text-sidebar-primary truncate">
              {user?.businessName || 'Pied piper'}
            </h1>
            <div className="h-7 w-7 rounded-full bg-sidebar-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium text-sidebar-primary">Pro</span>
            </div>
          </div>
          
          {/* Mini Calendar */}
          <div className="mb-2">
            <MiniCalendar onDateSelect={handleDateSelect} />
          </div>

          {/* Navigation Menu - Scrollable */}
          <div className="flex-grow overflow-y-auto pt-1">
            <SidebarItem
              href="/dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Dashboard"
              isActive={pathname === '/dashboard'}
            />

            <SidebarItem
              href="/services"
              icon={<Scissors className="h-5 w-5" />}
              label="Services"
              isActive={pathname.includes('/services')}
            />

            <SidebarItem
              href="/staff"
              icon={<Users className="h-5 w-5" />}
              label="Staff"
              isActive={pathname.includes('/staff') && !pathname.includes('/calendar')}
            />

            <SidebarItem
              href="/calendar"
              icon={<Calendar className="h-5 w-5" />}
              label="Calendar"
              isActive={pathname.includes('/calendar')}
            />

            <SidebarItem
              href="/clients"
              icon={<Users className="h-5 w-5" />}
              label="Clients"
              isActive={pathname.includes('/clients')}
              hasSubMenu={true}
              isOpen={openMenus.clients}
              onClick={() => toggleMenu('clients')}
            />

            <SidebarItem
              href="/analytics"
              icon={<LineChart className="h-5 w-5" />}
              label="Analytics"
              isActive={pathname.includes('/analytics')}
            />
          </div>

          {/* User Profile - Fixed at bottom */}
          <div className="border-t border-sidebar-border/20 px-4 py-3.5 bg-black mt-1">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-full bg-sidebar-primary/10 border border-sidebar-border/20 flex items-center justify-center">
                <span className="text-xs font-medium text-sidebar-foreground">
                  {user?.email?.[0]?.toUpperCase() || 'R'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sidebar-primary/80 text-xs truncate">{user?.email || 'richard@gmail.com'}</div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="text-sidebar-primary/80 hover:text-sidebar-primary transition-colors"
                >
                  <LogOut className="h-4 w-4" />
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

