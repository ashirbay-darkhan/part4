// app/book/[businessId]/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function BusinessNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-700">Business Not Found</h2>
        <p className="mt-2 text-gray-500">
          The business you're looking for doesn't exist or may have been removed.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/">
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}