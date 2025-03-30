'use client';

import { Suspense } from 'react';
import { BookingFormContent } from '@/components/booking-form/booking-form-content';
import { Skeleton } from '@/components/ui/skeleton';

// Simple loading component
function Loading() {
  return (
    <div className="space-y-4 w-full">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-full max-w-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export default function BookingFormPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Form</h1>
        <p className="text-muted-foreground">
          Share your booking link with clients and customize your booking form appearance
        </p>
      </div>
      
      <Suspense fallback={<Loading />}>
        <BookingFormContent />
      </Suspense>
    </div>
  );
} 