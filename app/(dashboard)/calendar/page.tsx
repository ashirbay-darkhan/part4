import { Metadata } from 'next';
import CalendarClient from './calendar-client';

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'View and manage your appointments',
};

export default function CalendarPage() {
  return (
    <div className="fixed top-16 bottom-0 left-52 right-0 bg-white z-10">
      <CalendarClient />
    </div>
  );
}