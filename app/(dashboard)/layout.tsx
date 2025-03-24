import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col relative">
        <Header />
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto relative">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-accent/3 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
          
          {/* Decorative bottom accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent/10" />
        </main>
      </div>
    </div>
  );
}