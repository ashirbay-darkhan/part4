'use client';

import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth/authContext';
import ErrorBoundary from '@/components/error-boundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ErrorBoundary>
  );
}