'use client';

import { lazy, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  LineChart, 
  ShoppingBag, 
  ArrowRight,
  Activity,
  Clock,
  LucideIcon,
  RefreshCw
} from 'lucide-react';
import { Appointment, Client } from '@/types';
import { useBusinessData } from '@/lib/hooks/useBusinessData';
import { getBusinessAppointments, getBusinessClients } from '@/lib/api';
import { BookingLinkCard } from '@/components/booking/booking-link-card';
import { 
  getTodayAppointments, 
  formatDate, 
  formatTime 
} from '@/lib/utils/date-utils';

// Lazy load components that are not immediately visible
const WeekCalendarView = lazy(() => 
  import('@/components/calendar/week-view').then(module => ({ 
    default: module.WeekCalendarView 
  }))
);

// Create the dashboard skeleton component inline since we'll create proper file in next PR
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div>
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
      <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium animate-pulse bg-slate-200 h-4 w-24"></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse bg-slate-200 h-8 w-16 mb-2"></div>
            <p className="animate-pulse bg-slate-100 h-3 w-32"></p>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="animate-pulse bg-slate-200 h-6 w-36"></CardTitle>
          <CardDescription className="animate-pulse bg-slate-100 h-4 w-64"></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="animate-pulse bg-slate-200 h-10 w-48"></div>
              <div className="animate-pulse bg-slate-200 h-6 w-16"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

// Define types for props
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
}

// Extract stat card into reusable component
const StatCard = ({ title, value, subtitle, icon: Icon }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-slate-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-slate-500">
        {subtitle}
      </p>
    </CardContent>
  </Card>
);

// Define types for props
interface RecentBookingsProps {
  appointments: Appointment[];
  clients: Client[];
}

// Extract recent bookings list to separate component
const RecentBookings = ({ appointments, clients }: RecentBookingsProps) => {
  // Get most recent appointments by sorting
  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [appointments]);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <CardDescription>
          Your most recent appointment bookings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentAppointments.length > 0 ? (
            recentAppointments.map((appointment: Appointment) => {
              const apptClient = clients.find((c: Client) => c.id === appointment.clientId);
              const apptDate = new Date(appointment.date);
              
              return (
                <div key={appointment.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {apptClient?.name.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{apptClient?.name || 'Unknown Client'}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(apptDate, { month: 'short', day: 'numeric' })} • {formatTime(appointment.startTime)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    ₸ {appointment.price.toLocaleString()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">No recent bookings found</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full" asChild>
          <Link href="/staff">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

// Extract quick actions to separate component
const QuickActions = () => (
  <Card className="col-span-1">
    <CardHeader>
      <CardTitle>Quick Actions</CardTitle>
      <CardDescription>
        Commonly used functions and features
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" className="h-24 flex flex-col" asChild>
          <Link href="/calendar">
            <Calendar className="h-6 w-6 mb-2" />
            <span>View Calendar</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col" asChild>
          <Link href="/staff">
            <Users className="h-6 w-6 mb-2" />
            <span>Manage Staff</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col" asChild>
          <Link href="/analytics">
            <LineChart className="h-6 w-6 mb-2" />
            <span>Analytics</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col" asChild>
          <Link href="/services">
            <ShoppingBag className="h-6 w-6 mb-2" />
            <span>Services</span>
          </Link>
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  // Use our custom hook with proper error handling and caching
  const { 
    data: appointments = [], 
    isLoading: isLoadingAppointments, 
    error: appointmentsError, 
    refetch: refetchAppointments,
    isStale: isAppointmentsStale
  } = useBusinessData<Appointment>(getBusinessAppointments, {
    cacheKey: 'dashboardAppointments',
    cacheDuration: 2 * 60 * 1000 // 2 minutes cache for dashboard
  });
  
  const { 
    data: clients = [], 
    isLoading: isLoadingClients, 
    error: clientsError,
    refetch: refetchClients,
    isStale: isClientsStale
  } = useBusinessData<Client>(getBusinessClients, {
    cacheKey: 'dashboardClients',
    cacheDuration: 2 * 60 * 1000 // 2 minutes cache for dashboard
  });
  
  const isLoading = isLoadingAppointments || isLoadingClients;
  const hasError = appointmentsError || clientsError;
  const isStale = isAppointmentsStale || isClientsStale;
  
  // Memoize expensive calculations
  const today = useMemo(() => new Date(), []);
  
  // Use our utility function instead of inline filter
  const todayAppointments = useMemo(() => 
    getTodayAppointments(appointments),
    [appointments]
  );
  
  // Find next appointment for today
  const nextAppointment = useMemo(() => {
    if (todayAppointments.length === 0) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Convert current time to minutes for comparison
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;
    
    // Find appointments that haven't started yet
    return todayAppointments
      .filter(appt => {
        const [hours, minutes] = appt.startTime.split(':').map(Number);
        const appointmentTimeInMinutes = hours * 60 + minutes;
        return appointmentTimeInMinutes > currentTimeInMinutes;
      })
      .sort((a, b) => {
        const [aHours, aMinutes] = a.startTime.split(':').map(Number);
        const [bHours, bMinutes] = b.startTime.split(':').map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      })[0];
  }, [todayAppointments]);
  
  // Format the date once and memoize it
  const formattedDate = useMemo(() => 
    formatDate(today),
    [today]
  );
  
  // Calculate monthly revenue
  const currentMonthRevenue = useMemo(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return appointments
      .filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return (
          appointmentDate.getMonth() === currentMonth &&
          appointmentDate.getFullYear() === currentYear
        );
      })
      .reduce((total, appointment) => total + appointment.price, 0);
  }, [appointments, today]);
  
  // Handle refreshing data
  const handleRefresh = () => {
    refetchAppointments();
    refetchClients();
  };
  
  // Handle error states properly
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-4">
        <div className="text-destructive text-xl">Error loading dashboard data</div>
        <Button onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    );
  }
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  return (
    <div className="space-y-6">      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Appointments" 
          value={appointments.length} 
          subtitle="+2.5% from last month" 
          icon={Calendar} 
        />
        
        <StatCard 
          title="Total Clients" 
          value={clients.length} 
          subtitle="+12.3% from last month" 
          icon={Users} 
        />
        
        <StatCard 
          title="Today's Appointments" 
          value={todayAppointments.length} 
          subtitle={nextAppointment 
            ? `Next at ${formatTime(nextAppointment.startTime)}` 
            : 'No more appointments today'} 
          icon={Clock} 
        />
        
        <StatCard 
          title="Monthly Revenue" 
          value={`₸ ${currentMonthRevenue.toLocaleString()}`} 
          subtitle="+18.1% from last month" 
          icon={Activity} 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentBookings appointments={appointments} clients={clients} />
        <div className="mb-6">
          <BookingLinkCard />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}