import { Skeleton } from '@/components/ui/skeleton';
import BookingFormClientWrapper from './client-wrapper';

// Enhanced loading component that better matches the BookingFormContent structure
function Loading() {
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Booking Link Card Skeleton */}
      <div className="border rounded-lg shadow-md p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="py-4 space-y-4">
          <div className="flex space-x-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
          <Skeleton className="h-10 w-full mt-4" />
          <div className="flex justify-between items-center mt-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
      
      {/* Business Image Card Skeleton */}
      <div className="border rounded-lg shadow-md p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-md" /> {/* Image placeholder */}
          <div className="space-y-1">
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-10 w-full mt-2" /> {/* Upload button */}
        </div>
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
      
      <BookingFormClientWrapper fallback={<Loading />} />
    </div>
  );
} 