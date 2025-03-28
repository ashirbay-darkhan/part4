import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

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