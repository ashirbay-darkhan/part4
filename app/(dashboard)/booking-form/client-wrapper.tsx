'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the BookingFormContent component
const BookingFormContent = dynamic(
  () => import('@/components/booking-form/booking-form-content').then(mod => ({ default: mod.BookingFormContent })),
  {
    ssr: false // Disable server-side rendering for this component
  }
);

interface BookingFormClientWrapperProps {
  fallback: React.ReactNode;
}

export default function BookingFormClientWrapper({ fallback }: BookingFormClientWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      <BookingFormContent />
    </Suspense>
  );
} 