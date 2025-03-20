'use client';

import { useState } from 'react';
import { CalendarView } from '@/components/calendar/calendar-view';
import { TodayView } from '@/components/calendar/today-view';

export default function CalendarClient() {
  const [view, setView] = useState<'week' | 'today'>('week');

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
        <CalendarView onTodayClick={handleShowTodayView} />
      ) : (
        <TodayView onBackToWeekView={handleShowWeekView} />
      )}
    </>
  );
} 