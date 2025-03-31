import { Metadata } from 'next';
import CalendarClient from './calendar-client';

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'View and manage your appointments',
};

export default function CalendarPage() {
  return (
    <div className="h-full overflow-hidden bg-white">
      <CalendarClient />
    </div>
  );
}