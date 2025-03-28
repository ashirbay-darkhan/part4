'use client';

import { useMemo } from 'react';
import { 
  Users, 
  Calendar, 
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
import { useAuth } from '@/lib/auth/authContext';
import { getBusinessAppointments, getBusinessClients } from '@/lib/api';
import { BookingLinkCard } from '@/components/dashboard/booking-link-card';
import { getTodayAppointments } from '@/lib/utils/date-utils';
import { cn } from '@/lib/utils';

// Create the dashboard skeleton component
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="border border-accent/10 shadow-md overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
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
      <Card className="col-span-1 border border-accent/10 shadow-md overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
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
      <Card className="col-span-1 border border-accent/10 shadow-md overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
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

// Extract stat card into reusable component with more professional colors
const StatCard = ({ title, value, subtitle, icon: Icon, trend = 'neutral' }: StatCardProps) => (
  <Card className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
      <CardTitle className="text-sm font-medium text-gray-600">
        {title}
      </CardTitle>
      <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <p className={cn(
        "text-xs mt-2 flex items-center gap-1 font-medium",
        trend === 'up' ? 'text-green-600' : 
        trend === 'down' ? 'text-red-600' : 
        'text-gray-500'
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

// Extract recent bookings list to separate component with professional colors
const RecentBookings = ({ appointments, clients }: RecentBookingsProps) => {
  // Get most recent appointments by sorting
  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [appointments]);

  return (
    <Card className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardHeader className="flex justify-between items-start border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="text-gray-800">Recent Bookings</CardTitle>
          </div>
          <CardDescription className="text-gray-500">Your most recent appointment bookings</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all">
          View All
        </Button>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="space-y-3">
          {recentAppointments.length > 0 ? (
            recentAppointments.map((appointment: Appointment) => {
              const apptClient = clients.find((c: Client) => c.id === appointment.clientId);
              const apptDate = new Date(appointment.date);
              
              return (
                <div key={appointment.id} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-md transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {apptClient?.name.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{apptClient?.name || 'Client'}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        <span>Map {apptDate.getDate()} • </span>
                        <Clock className="h-3 w-3 mx-1 text-gray-400" />
                        <span>{appointment.startTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-800">
                    ₸ {appointment.price.toLocaleString()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-800">No recent bookings found</p>
              <p className="text-xs text-gray-500 mt-1">Your recent bookings will appear here</p>
              <Button variant="outline" size="sm" className="mt-4 bg-white text-gray-700 border-gray-200 hover:bg-gray-50">
                Create New Booking
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  // Get user data from auth context
  const { user } = useAuth();
  
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
    <div className="space-y-8 pt-4">
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