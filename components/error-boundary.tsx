'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error('Global error caught:', error);
      setError(error.error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-4 text-center bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
          <p className="text-gray-600">
            We're sorry, but an error occurred while loading this page.
          </p>
          {error && (
            <div className="p-4 mt-4 overflow-auto text-left text-sm bg-gray-100 rounded">
              <p className="font-mono">{error.toString()}</p>
            </div>
          )}
          <div className="flex justify-center space-x-4 mt-6">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <Button onClick={() => {
              setHasError(false);
              setError(null);
            }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}