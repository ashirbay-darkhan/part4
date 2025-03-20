'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  Users, 
  ChevronDown, 
  LineChart, 
  Banknote, 
  ShoppingBag, 
  Calendar,
  BadgeDollarSign,
  Package,
  Heart,
  LogOut,
  Menu,
  X,
  Scissors,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/authContext';
import { Button } from '@/components/ui/button';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  hasSubMenu?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({
  href,
  icon,
  label,
  isActive,
  hasSubMenu = false,
  isOpen = false,
  onClick,
}: SidebarItemProps) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-pawly-light-blue dark:bg-pawly-teal text-pawly-dark-blue dark:text-white'
          : 'hover:bg-gray-100 dark:hover:bg-pawly-teal/20 text-pawly-dark-blue dark:text-white'
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {hasSubMenu && (
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      )}
    </Link>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    staff: false,
    clients: false,
  });

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Extract current month and year for calendar
  const currentDate = new Date();
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r 
        border-slate-200 dark:border-gray-800 flex flex-col h-screen overflow-hidden
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="w-64 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 flex flex-col h-screen overflow-hidden">

          {/* Calendar */}
          <div className="px-3 py-4 border-b border-slate-200 dark:border-pawly-dark-blue/80">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-pawly-dark-blue dark:text-white">{month} {year}</span>
              <div className="flex gap-1">
                <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-pawly-teal/20 text-pawly-dark-blue dark:text-white">
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-pawly-teal/20 text-pawly-dark-blue dark:text-white">
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
              </div>
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 text-center text-xs mb-2 text-pawly-dark-blue dark:text-gray-300">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>
            
            {/* Calendar days - this is just a placeholder */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {Array.from({ length: 35 }).map((_, i) => {
                const day = i - 3; // Начинаем с -3, чтобы первый день месяца начинался с правильного дня недели
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "h-6 w-6 flex items-center justify-center rounded-full",
                      day === currentDate.getDate() - 1 
                        ? "bg-pawly-light-blue dark:bg-pawly-teal text-pawly-dark-blue dark:text-white" 
                        : day > 0 && day <= 28 
                          ? "hover:bg-slate-100 dark:hover:bg-pawly-teal/20 cursor-pointer text-pawly-dark-blue dark:text-white" 
                          : "text-gray-300 dark:text-gray-600"
                    )}
                  >
                    {day > 0 && day <= 31 ? day : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <SidebarItem
              href="/dashboard"
              icon={<LineChart className="h-5 w-5 text-pawly-dark-blue dark:text-white" />}
              label="Dashboard"
              isActive={pathname === '/dashboard'}
            />

            <SidebarItem
              href="/services"
              icon={<Scissors className="h-5 w-5 text-pawly-dark-blue dark:text-white" />}
              label="Services"
              isActive={pathname.includes('/services')}
            />

            <SidebarItem
              href="/staff"
              icon={<Users className="h-5 w-5 text-pawly-dark-blue dark:text-white" />}
              label="Staff Management"
              isActive={pathname.includes('/staff') && !pathname.includes('/calendar')}
            />

            <SidebarItem
              href="/calendar"
              icon={<Calendar className="h-5 w-5 text-pawly-dark-blue dark:text-white" />}
              label="Calendar"
              isActive={pathname.includes('/calendar')}
            />

            <SidebarItem
              href="/clients"
              icon={<Users className="h-5 w-5 text-pawly-dark-blue dark:text-white" />}
              label="Clients"
              isActive={pathname.includes('/clients')}
              hasSubMenu={true}
              isOpen={openMenus.clients}
              onClick={() => toggleMenu('clients')}
            />

            <SidebarItem
              href="/analytics"
              icon={<LineChart className="h-5 w-5 text-pawly-dark-blue dark:text-white" />}
              label="Analytics"
              isActive={pathname.includes('/analytics')}
            />
          </div>

          {/* User Profile & Logout Button at bottom of sidebar */}
          <div className="p-3 border-t border-slate-200 dark:border-gray-800">
            <div className="flex items-center mb-2">
              <div className="flex-1">
                <div className="text-pawly-dark-blue dark:text-white font-medium">{user?.name || 'User'}</div>
                <div className="text-gray-500 dark:text-gray-300 text-xs">{user?.email || 'user@example.com'}</div>
              </div>
            </div>

            {/* Logout Button */}
            <Button 
              onClick={handleLogout}
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white hover:bg-gray-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Exit account</span>
            </Button>
          </div>

        </div>
      </div>


      {/* Mobile toggle button */}
      <button 
        className="fixed bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg md:hidden z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </>
  );
}

