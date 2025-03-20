import { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Staff Management | B2B Booking Platform',
  description: 'Manage your staff members',
};

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
} 