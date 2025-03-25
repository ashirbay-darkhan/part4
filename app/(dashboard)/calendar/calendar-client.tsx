'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarView } from '@/components/calendar/calendar-view';
import { TodayView } from '@/components/calendar/today-view';
import { parse, parseISO } from 'date-fns';

export default function CalendarClient() {
  const [view, setView] = useState<'week' | 'today'>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const searchParams = useSearchParams();

  // Handle URL date parameter
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        // First approach: try parsing with parseISO (for ISO format like "2025-03-29")
        let parsedDate = parseISO(dateParam);
        
        // If the parsed date is invalid or results in a different date than expected
        // we'll try a more explicit approach to avoid timezone issues
        if (isNaN(parsedDate.getTime()) || dateParam !== parsedDate.toISOString().split('T')[0]) {
          // Parse the date explicitly from YYYY-MM-DD format
          const [year, month, day] = dateParam.split('-').map(Number);
          // Note: month is 0-indexed in JavaScript Date
          parsedDate = new Date(year, month - 1, day);
        }
        
        // Final check if date is valid
        if (!isNaN(parsedDate.getTime())) {
          // Ensure we preserve the local date exactly as specified
          parsedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
          
          setSelectedDate(parsedDate);
          
          // Automatically switch to today view when a date is selected from mini-calendar
          setView('today');
        }
      } catch (error) {
        console.error('Invalid date format in URL', error);
      }
    }
  }, [searchParams]);

  // Handler to switch to today view
  const handleShowTodayView = () => {
    setView('today');
  };

  // Handler to switch back to week view
  const handleShowWeekView = () => {
    setView('week');
  };

  return (
    <>
      {view === 'week' ? (
        <CalendarView 
          onTodayClick={handleShowTodayView} 
          selectedDate={selectedDate}
        />
      ) : (
        <TodayView 
          onBackToWeekView={handleShowWeekView} 
          selectedDate={selectedDate}
        />
      )}
    </>
  );
} 