'use client';

import { useState, memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniCalendarProps {
  onDateSelect: (date: Date) => void;
}

const MiniCalendar = memo(({ onDateSelect }: MiniCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Memoize expensive calendar calculations
  const calendarData = useMemo(() => {
    // Get current month and year
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    // Get days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get first day of month
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Get days from previous month
    const daysFromPrevMonth = firstDayOfMonth;
    
    // Get days in previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Get total cells needed
    const totalCells = Math.ceil((daysFromPrevMonth + daysInMonth) / 7) * 7;
    
    // Get days from next month
    const daysFromNextMonth = totalCells - (daysFromPrevMonth + daysInMonth);
    
    return {
      month,
      year,
      daysInMonth,
      firstDayOfMonth,
      daysFromPrevMonth,
      daysInPrevMonth,
      daysFromNextMonth
    };
  }, [currentDate]);
  
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
    setCurrentDate(new Date(calendarData.year, calendarData.month - 1, 1));
  };
  
  // Function to go to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(calendarData.year, calendarData.month + 1, 1));
  };
  
  // Handle clicking on a specific day
  const handleDateClick = (year: number, month: number, day: number) => {
    // Create date for the selected day (month is 0-indexed in JavaScript)
    const date = new Date(year, month, day);
    
    // Set the selected date
    setSelectedDate(date);
    
    // Call the provided callback with the selected date
    onDateSelect(date);
    
    // Update the displayed month/year if the selected date is in a different month
    if (month !== calendarData.month || year !== calendarData.year) {
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
        {Array.from({ length: calendarData.daysFromPrevMonth }).map((_, index) => {
          const day = calendarData.daysInPrevMonth - calendarData.daysFromPrevMonth + index + 1;
          const prevMonth = calendarData.month - 1 < 0 ? 11 : calendarData.month - 1;
          const prevYear = calendarData.month - 1 < 0 ? calendarData.year - 1 : calendarData.year;
          
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
        {Array.from({ length: calendarData.daysInMonth }).map((_, index) => {
          const day = index + 1;
          const isCurrentDay = isToday(calendarData.year, calendarData.month, day);
          const isSelectedDay = isSelected(calendarData.year, calendarData.month, day);
          
          return (
            <button
              key={`current-${index}`}
              className={cn(
                "h-6 w-6 text-center text-[11px] rounded-full flex items-center justify-center transition-all",
                isCurrentDay && !isSelectedDay && "text-sidebar-foreground font-bold ring-1 ring-sidebar-primary/30",
                isSelectedDay && "bg-sidebar-primary text-sidebar-primary-foreground font-bold",
                !isCurrentDay && !isSelectedDay && "hover:bg-sidebar-accent/15 text-sidebar-foreground/90 hover:text-sidebar-foreground"
              )}
              onClick={() => handleDateClick(calendarData.year, calendarData.month, day)}
            >
              {day}
            </button>
          );
        })}
        
        {/* Next month days */}
        {Array.from({ length: calendarData.daysFromNextMonth }).map((_, index) => {
          const day = index + 1;
          const nextMonth = calendarData.month + 1 > 11 ? 0 : calendarData.month + 1;
          const nextYear = calendarData.month + 1 > 11 ? calendarData.year + 1 : calendarData.year;
          
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
          {capitalize(getMonthNameInLanguage(currentDate))} {calendarData.year}
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
});

// Add display name for debugging
MiniCalendar.displayName = "MiniCalendar";

export default MiniCalendar; 