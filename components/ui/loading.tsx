import { Skeleton } from '@/components/ui/skeleton';

export function Loading() {
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