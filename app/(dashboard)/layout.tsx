import { ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Import Sidebar normally since it's essential for navigation
import { Sidebar } from '@/components/layout/sidebar';
// Dynamically import the Header which is less essential for initial render
const Header = dynamic(() => import('@/components/layout/header').then(mod => ({ default: mod.Header })), {
  ssr: true
});

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#FFFFFF] antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-52 relative">
        <Header />
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto relative">
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}