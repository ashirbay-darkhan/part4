'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  BarChart, 
  CalendarDays,
  ArrowUpRight, 
  Download,
  ListFilter
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useBusinessData } from '@/lib/hooks/useBusinessData';
import { getBusinessAppointments, getBusinessClients, getBusinessServices, getBusinessStaff } from '@/lib/api';
import { Appointment, AppointmentStatus, Client, Service, User } from '@/types';
import { BookingDetailsModal } from '@/components/dashboard/booking-details-modal';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { AppointmentsByStatusChart } from '@/components/dashboard/appointments-by-status-chart';

// Define main filter types
type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';
type SortField = 'date' | 'client' | 'service' | 'staff' | 'price' | 'status';
type SortOrder = 'asc' | 'desc';

// Import necessary props types to fix linter errors
interface StatisticsData {
  totalAppointments: number;
  totalRevenue: number;
  averageValue: number;
  completionRate: number;
  statusCounts: Record<AppointmentStatus, number>;
  topServices: Array<{ id: string; name: string; count: number; revenue: number }>;
}

interface SummaryCardsProps {
  statistics: StatisticsData;
  isLoading: boolean;
  dateRangeLabel: string;
}

// Custom hook for using localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Initialize on first render
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T) => {
    try {
      // Save state
      setStoredValue(value);
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('month');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  
  // Use our custom localStorage hook for the active tab
  const [activeTab, setActiveTab] = useLocalStorage<string>('analytics_active_tab', 'appointments');
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Fetch data
  const { 
    data: appointments = [], 
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments
  } = useBusinessData<Appointment>(getBusinessAppointments, {
    cacheKey: 'analyticsAppointments',
    cacheDuration: 2 * 60 * 1000 // 2 minutes
  });
  
  const { 
    data: clients = [], 
    isLoading: isLoadingClients
  } = useBusinessData<Client>(getBusinessClients, {
    cacheKey: 'analyticsClients',
    cacheDuration: 2 * 60 * 1000
  });
  
  const { 
    data: services = [], 
    isLoading: isLoadingServices
  } = useBusinessData<Service>(getBusinessServices, {
    cacheKey: 'analyticsServices',
    cacheDuration: 2 * 60 * 1000
  });
  
  const { 
    data: staffMembers = [], 
    isLoading: isLoadingStaff
  } = useBusinessData<User>(getBusinessStaff, {
    cacheKey: 'analyticsStaff',
    cacheDuration: 2 * 60 * 1000
  });
  
  const isLoading = isLoadingAppointments || isLoadingClients || isLoadingServices || isLoadingStaff;

  // Date range filter logic
  const getDateRange = useCallback(() => {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    switch (selectedDateRange) {
      case 'today':
        return { start: todayStart, end: new Date(today.setHours(23, 59, 59, 999)) };
      
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return { start: weekStart, end: weekEnd };
      
      case 'month':
        return { 
          start: startOfMonth(today), 
          end: endOfMonth(today)
        };
      
      case 'custom':
        return { 
          start: customDateStart ? new Date(customDateStart) : new Date(0),
          end: customDateEnd ? new Date(customDateEnd) : new Date()
        };
      
      default:
        return { start: new Date(0), end: new Date() };
    }
  }, [selectedDateRange, customDateStart, customDateEnd]);
  
  // Get description for the current date range
  const getDateRangeLabel = useCallback(() => {
    switch (selectedDateRange) {
      case 'today':
        return 'today';
      case 'week':
        return 'this week';
      case 'month':
        return 'from last month';
      case 'custom':
        if (customDateStart && customDateEnd) {
          return `from ${format(new Date(customDateStart), 'MMM dd')} to ${format(new Date(customDateEnd), 'MMM dd')}`;
        }
        return 'in selected period';
      default:
        return 'all time';
    }
  }, [selectedDateRange, customDateStart, customDateEnd]);

  // Filter appointments based on date range and search query
  const filteredAppointments = useMemo(() => {
    if (isLoading) return [];
    
    const { start, end } = getDateRange();
    
    return appointments.filter(appointment => {
      // Date filtering
      const appointmentDate = new Date(appointment.date);
      const isInDateRange = isWithinInterval(appointmentDate, { start, end });
      
      if (!isInDateRange) return false;
      
      // Status filtering
      if (statusFilter !== 'all' && appointment.status !== statusFilter) {
        return false;
      }
      
      // Search filtering
      if (searchQuery) {
        const client = clients.find(c => c.id === appointment.clientId);
        const service = services.find(s => s.id === appointment.serviceId);
        
        const searchLower = searchQuery.toLowerCase();
        const clientNameMatch = client?.name.toLowerCase().includes(searchLower) || false;
        const serviceNameMatch = service?.name.toLowerCase().includes(searchLower) || false;
        const dateMatch = appointment.date.toLowerCase().includes(searchLower);
        const timeMatch = appointment.startTime.toLowerCase().includes(searchLower);
        const statusMatch = appointment.status.toLowerCase().includes(searchLower);
        
        return clientNameMatch || serviceNameMatch || dateMatch || timeMatch || statusMatch;
      }
      
      return true;
    });
  }, [appointments, clients, services, searchQuery, selectedDateRange, customDateStart, customDateEnd, getDateRange, statusFilter, isLoading]);

  // Sort the filtered appointments
  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          comparison = dateA.getTime() - dateB.getTime();
          break;
          
        case 'client':
          const clientA = clients.find(c => c.id === a.clientId)?.name || '';
          const clientB = clients.find(c => c.id === b.clientId)?.name || '';
          comparison = clientA.localeCompare(clientB);
          break;
          
        case 'service':
          const serviceA = services.find(s => s.id === a.serviceId)?.name || '';
          const serviceB = services.find(s => s.id === b.serviceId)?.name || '';
          comparison = serviceA.localeCompare(serviceB);
          break;
          
        case 'staff':
          const staffA = staffMembers.find(s => s.id === a.employeeId)?.name || '';
          const staffB = staffMembers.find(s => s.id === b.employeeId)?.name || '';
          comparison = staffA.localeCompare(staffB);
          break;
          
        case 'price':
          comparison = a.price - b.price;
          break;
          
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredAppointments, sortField, sortOrder, clients, services, staffMembers]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (isLoading) {
      return {
        totalAppointments: 0,
        totalRevenue: 0,
        averageValue: 0,
        completionRate: 0,
        statusCounts: {} as Record<AppointmentStatus, number>,
        topServices: [] as { id: string; name: string; count: number; revenue: number }[]
      };
    }
    
    const totalAppointments = filteredAppointments.length;
    const totalRevenue = filteredAppointments.reduce((sum, appt) => sum + appt.price, 0);
    const averageValue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    
    // Count appointments by status
    const statusCounts: Record<AppointmentStatus, number> = {
      'Pending': 0,
      'Confirmed': 0,
      'Arrived': 0,
      'Completed': 0,
      'Cancelled': 0,
      'No-Show': 0
    };
    
    filteredAppointments.forEach(appt => {
      statusCounts[appt.status] = (statusCounts[appt.status] || 0) + 1;
    });
    
    // Calculate completion rate (Completed / (Total - Cancelled - Pending))
    const relevantAppointments = totalAppointments - (statusCounts['Cancelled'] || 0) - (statusCounts['Pending'] || 0);
    const completionRate = relevantAppointments > 0 
      ? ((statusCounts['Completed'] || 0) / relevantAppointments) * 100 
      : 0;
    
    // Top services by count and revenue
    const serviceStats = new Map<string, { count: number; revenue: number }>();
    
    filteredAppointments.forEach(appt => {
      const serviceId = appt.serviceId;
      const current = serviceStats.get(serviceId) || { count: 0, revenue: 0 };
      
      serviceStats.set(serviceId, {
        count: current.count + 1,
        revenue: current.revenue + appt.price
      });
    });
    
    const topServices = Array.from(serviceStats.entries())
      .map(([id, stats]) => ({
        id,
        name: services.find(s => s.id === id)?.name || 'Unknown Service',
        count: stats.count,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalAppointments,
      totalRevenue,
      averageValue,
      completionRate,
      statusCounts,
      topServices
    };
  }, [filteredAppointments, services, isLoading]);

  // Group appointments by date for the chart
  const chartData = useMemo(() => {
    if (isLoading) return [];
    
    const dateMap = new Map<string, { totalRevenue: number; count: number }>();
    
    filteredAppointments.forEach(appointment => {
      const date = appointment.date;
      const current = dateMap.get(date) || { totalRevenue: 0, count: 0 };
      
      dateMap.set(date, {
        totalRevenue: current.totalRevenue + appointment.price,
        count: current.count + 1
      });
    });
    
    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        formattedDate: format(parseISO(date), 'MMM dd'),
        revenue: data.totalRevenue,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredAppointments, isLoading]);

  // Group appointments by status for the pie chart
  const statusChartData = useMemo(() => {
    return Object.entries(statistics.statusCounts)
      .map(([status, count]) => ({
        name: status,
        value: count
      }))
      .filter(item => item.value > 0);
  }, [statistics.statusCounts]);

  // Handle appointment click
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  }, []);

  // Export data as CSV
  const exportToCSV = useCallback(() => {
    if (sortedAppointments.length === 0) {
      toast({
        title: "No data to export",
        description: "Please adjust your filters to show some appointments first.",
        variant: "destructive"
      });
      return;
    }
    
    // Format appointments data for CSV
    const csvData = sortedAppointments.map(appointment => {
      const client = clients.find(c => c.id === appointment.clientId);
      const service = services.find(s => s.id === appointment.serviceId);
      
      return {
        Date: appointment.date,
        Time: appointment.startTime,
        Client: client?.name || 'Unknown',
        Service: service?.name || 'Unknown',
        Duration: `${appointment.duration} min`,
        Price: appointment.price,
        Status: appointment.status
      };
    });
    
    // Convert to CSV format
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `appointments_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: "Your appointments data has been exported as CSV."
    });
  }, [sortedAppointments, clients, services, toast]);

  // Handle refresh button click
  const handleRefresh = () => {
    refetchAppointments();
    toast({
      title: "Refreshing data",
      description: "Your analytics data is being updated."
    });
  };

  if (appointmentsError) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-4">
        <div className="text-destructive text-xl">Error loading analytics data</div>
        <Button onClick={handleRefresh} variant="default" className="bg-accent hover:bg-accent/90">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track, analyze, and export your business performance data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} size="sm">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs 
        defaultValue={activeTab} 
        className="space-y-5"
        onValueChange={handleTabChange}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Select 
              value={selectedDateRange} 
              onValueChange={(value) => setSelectedDateRange(value as DateRange)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedDateRange === 'custom' && (
              <div className="flex gap-1">
                <Input
                  type="date"
                  className="w-auto h-9 text-sm"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                />
                <Input
                  type="date"
                  className="w-auto h-9 text-sm"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <SummaryCards 
            statistics={statistics} 
            isLoading={isLoading} 
            dateRangeLabel={getDateRangeLabel()}
          />
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Financial performance for {selectedDateRange === 'all' ? 'all time' : `the selected ${selectedDateRange === 'custom' ? 'period' : selectedDateRange}`}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <RevenueChart data={chartData} isLoading={isLoading} />
              </CardContent>
            </Card>
            
            <Card className="shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle>Appointments by Status</CardTitle>
                <CardDescription>Distribution across different statuses for {selectedDateRange === 'all' ? 'all time' : `the selected ${selectedDateRange === 'custom' ? 'period' : selectedDateRange}`}</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <AppointmentsByStatusChart data={statusChartData} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
          
          {/* Top Services Section */}
          <Card className="shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4 border-b">
              <CardTitle>Top Services</CardTitle>
              <CardDescription>Your most booked services in {selectedDateRange === 'all' ? 'all time' : `the selected ${selectedDateRange === 'custom' ? 'period' : selectedDateRange}`}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg. Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(3).fill(0).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="h-4 w-32 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 w-16 bg-gray-100 animate-pulse rounded ml-auto"></div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 w-20 bg-gray-100 animate-pulse rounded ml-auto"></div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 w-16 bg-gray-100 animate-pulse rounded ml-auto"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : statistics.topServices.length > 0 ? (
                    statistics.topServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell className="text-right">{service.count}</TableCell>
                        <TableCell className="text-right">₸ {service.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₸ {(service.revenue / service.count).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No service data available for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appointments" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select 
                value={statusFilter} 
                onValueChange={(value) => setStatusFilter(value as AppointmentStatus | 'all')}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Arrived">Arrived</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="No-Show">No-Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-64">
              <Input
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Appointments Table */}
          <Card className="shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Appointments</CardTitle>
                  <CardDescription>
                    {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ListFilter className="h-4 w-4 mr-2" />
                      Sort by
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSortField('date');
                        setSortOrder(sortField === 'date' && sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      Date {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSortField('client');
                        setSortOrder(sortField === 'client' && sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      Client {sortField === 'client' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSortField('service');
                        setSortOrder(sortField === 'service' && sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      Service {sortField === 'service' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSortField('staff');
                        setSortOrder(sortField === 'staff' && sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      Staff {sortField === 'staff' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSortField('price');
                        setSortOrder(sortField === 'price' && sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      Price {sortField === 'price' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setSortField('status');
                        setSortOrder(sortField === 'status' && sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                    >
                      Status {sortField === 'status' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(5).fill(0).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="h-4 w-24 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-28 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-32 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-28 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-16 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-16 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 w-20 bg-gray-100 animate-pulse rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : sortedAppointments.length > 0 ? (
                    sortedAppointments.map((appointment) => {
                      const client = clients.find(c => c.id === appointment.clientId);
                      const service = services.find(s => s.id === appointment.serviceId);
                      const staff = staffMembers.find(s => s.id === appointment.employeeId);
                      const appointmentDate = parseISO(appointment.date);
                      
                      // Status colors
                      const statusColor = {
                        'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                        'Confirmed': 'bg-blue-100 text-blue-800 border-blue-300',
                        'Arrived': 'bg-green-100 text-green-800 border-green-300',
                        'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        'Cancelled': 'bg-red-100 text-red-800 border-red-300',
                        'No-Show': 'bg-gray-100 text-gray-800 border-gray-300'
                      }[appointment.status];
                      
                      return (
                        <TableRow 
                          key={appointment.id} 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleAppointmentClick(appointment)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{format(appointmentDate, 'MMM dd, yyyy')}</span>
                              <span className="text-muted-foreground text-sm">{appointment.startTime}</span>
                            </div>
                          </TableCell>
                          <TableCell>{client?.name || 'Unknown Client'}</TableCell>
                          <TableCell>{service?.name || 'Unknown Service'}</TableCell>
                          <TableCell>{staff?.name || 'Unknown Staff'}</TableCell>
                          <TableCell>{appointment.duration} min</TableCell>
                          <TableCell>₸ {appointment.price.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColor} py-1 px-2 border`}>
                              {appointment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CalendarDays className="h-8 w-8 text-gray-300" />
                          <p>No appointments found for the selected criteria</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => {
                              setSelectedDateRange('all');
                              setStatusFilter('all');
                              setSearchQuery('');
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Booking Details Modal */}
      {selectedAppointment && (
        <BookingDetailsModal
          appointment={selectedAppointment}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          client={clients.find(c => c.id === selectedAppointment.clientId)}
          service={services.find(s => s.id === selectedAppointment.serviceId)}
          onStatusUpdate={handleRefresh}
        />
      )}
    </div>
  );
}