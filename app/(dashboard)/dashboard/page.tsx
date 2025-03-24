'use client';

import { useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  LineChart, 
  Activity,
  Clock,
  LucideIcon,
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Appointment, Client } from '@/types';
import { useBusinessData } from '@/lib/hooks/useBusinessData';
import { getBusinessAppointments, getBusinessClients } from '@/lib/api';
import { BookingLinkCard } from '@/components/dashboard/booking-link-card';
import { getTodayAppointments } from '@/lib/utils/date-utils';
import { cn } from '@/lib/utils';

// Create the dashboard skeleton component
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div>
      <div className="h-8 w-64 bg-accent/5 rounded animate-pulse mb-2"></div>
      <div className="h-4 w-48 bg-accent/5 rounded animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="border border-accent/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium animate-pulse bg-accent/5 h-4 w-24"></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse bg-accent/5 h-8 w-16 mb-2"></div>
            <p className="animate-pulse bg-accent/5 h-3 w-32"></p>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="col-span-1 border border-accent/10">
        <CardHeader>
          <CardTitle className="animate-pulse bg-accent/5 h-6 w-36"></CardTitle>
          <CardDescription className="animate-pulse bg-accent/5 h-4 w-64"></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="animate-pulse bg-accent/5 h-10 w-48"></div>
              <div className="animate-pulse bg-accent/5 h-6 w-16"></div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="col-span-1 border border-accent/10">
        <CardHeader>
          <CardTitle className="animate-pulse bg-accent/5 h-6 w-36"></CardTitle>
          <CardDescription className="animate-pulse bg-accent/5 h-4 w-64"></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse bg-accent/5 h-10 w-full"></div>
          <div className="animate-pulse bg-accent/5 h-10 w-full"></div>
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
  trend?: 'up' | 'down' | 'neutral';
}

// Extract stat card into reusable component
const StatCard = ({ title, value, subtitle, icon: Icon, trend = 'neutral' }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className="h-8 w-8 rounded-md bg-accent/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-accent" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className={cn(
        "text-xs mt-1 flex items-center gap-1",
        trend === 'up' ? 'text-emerald-500' : 
        trend === 'down' ? 'text-rose-500' : 
        'text-muted-foreground'
      )}>
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
    <Card>
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
                <div key={appointment.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                      <span className="text-sm font-medium">
                        {apptClient?.name.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{apptClient?.name || 'Client'}</p>
                      <p className="text-xs text-muted-foreground">
                        Мар {apptDate.getDate()} • {appointment.startTime.replace(/^0+/, '')} AM
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
              <div className="w-12 h-12 rounded-md bg-accent/5 flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-accent/70" />
              </div>
              <p className="text-sm text-muted-foreground">No recent bookings found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  // Use our custom hook with proper error handling and caching
  const { 
    data: appointments = [], 
    isLoading: isLoadingAppointments, 
    error: appointmentsError, 
    refetch: refetchAppointments,
  } = useBusinessData<Appointment>(getBusinessAppointments, {
    cacheKey: 'dashboardAppointments',
    cacheDuration: 2 * 60 * 1000 // 2 minutes cache for dashboard
  });
  
  const { 
    data: clients = [], 
    isLoading: isLoadingClients, 
    error: clientsError,
    refetch: refetchClients,
  } = useBusinessData<Client>(getBusinessClients, {
    cacheKey: 'dashboardClients',
    cacheDuration: 2 * 60 * 1000 // 2 minutes cache for dashboard
  });
  
  const isLoading = isLoadingAppointments || isLoadingClients;
  const hasError = appointmentsError || clientsError;
  
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
        <Button onClick={handleRefresh} variant="default" className="bg-accent hover:bg-accent/90">
          Try Again
        </Button>
      </div>
    );
  }
  
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Total Appointments" 
          value={appointments.length} 
          subtitle="+2.5% from last month" 
          icon={Calendar} 
          trend="up"
        />
        
        <StatCard 
          title="Total Clients" 
          value={clients.length} 
          subtitle="+12.3% from last month" 
          icon={Users} 
          trend="up"
        />
        
        <StatCard 
          title="Today's Appointments" 
          value={todayAppointments.length} 
          subtitle={todayAppointments.length === 0 
            ? "No more appointments today" 
            : nextAppointment 
              ? `Next at ${nextAppointment.startTime}` 
              : 'No more appointments today'} 
          icon={Clock} 
          trend="neutral"
        />
        
        <StatCard 
          title="Monthly Revenue" 
          value={`₸ ${currentMonthRevenue.toLocaleString()}`} 
          subtitle="+18.1% from last month" 
          icon={Activity} 
          trend="up"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentBookings appointments={appointments} clients={clients} />
        <BookingLinkCard />
      </div>
    </div>
  );
}