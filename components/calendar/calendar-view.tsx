'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks, isWeekend } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBusinessAppointments, getBusinessStaff, getBusinessServices } from '@/lib/api';
import { Appointment, BusinessUser, Service } from '@/types';
import { useAuth } from '@/lib/auth/authContext';
import { AppointmentDetail } from '@/app/(dashboard)/calendar/components/appointment-detail';
import { toast } from 'sonner';

// Constants for calendar display
const HALF_HOUR_HEIGHT = 32; // pixels per half hour

interface CalendarViewProps {
  onTodayClick?: () => void;
  selectedDate?: Date;
}

export function CalendarView({ onTodayClick, selectedDate }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffMembers, setStaffMembers] = useState<BusinessUser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update currentDate when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      // Create a new date to avoid timezone issues
      const localDate = new Date(selectedDate);
      // Set to noon to avoid any day shifting from timezone
      localDate.setHours(12, 0, 0, 0);
      setCurrentDate(localDate);
    }
  }, [selectedDate]);
  
  // Calculate week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);
  
  // Get working hours - expanded to 8:00-22:00
  const workingHours = useMemo(() => {
    return {
      start: 8, // Start at 8:00
      end: 22, // End at 22:00
    };
  }, []);

  // Generate time slots with 30-minute increments based on working hours
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = workingHours.start; hour <= workingHours.end; hour++) {
      slots.push({
        hour,
        time: `${hour.toString().padStart(2, '0')}:00`,
        isHour: true
      });
      if (hour < workingHours.end) { // Don't add the :30 slot for the last hour
        slots.push({
          hour,
          time: `${hour.toString().padStart(2, '0')}:30`,
          isHour: false
        });
      }
    }
    return slots;
  }, [workingHours]);
  
  // Fetch staff and appointments data
  const fetchData = useCallback(async () => {
    if (!user?.businessId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch staff, appointments, and services in parallel
      const [staffData, appointmentsData, servicesData] = await Promise.all([
        getBusinessStaff(user.businessId),
        getBusinessAppointments(user.businessId),
        getBusinessServices(user.businessId)
      ]);
      
      // Filter out admin users from staff list
      const nonAdminStaff = staffData.filter(staff => staff.role !== 'admin');
      setStaffMembers(nonAdminStaff);
      setAppointments(appointmentsData);
      setServices(servicesData);
      
      // Auto-select the first staff member if none is selected
      if (selectedStaffId === 'all' && nonAdminStaff.length > 0) {
        setSelectedStaffId('all');
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.businessId, selectedStaffId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Filter appointments based on selected staff and current week
  const filteredAppointments = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    return appointments.filter(appointment => {
      // Filter by staff if specific staff is selected
      if (selectedStaffId !== 'all' && appointment.employeeId !== selectedStaffId) {
        return false;
      }
      
      // Filter by current week
      const appointmentDate = parseISO(appointment.date);
      return appointmentDate >= weekStart && appointmentDate <= weekEnd;
    });
  }, [appointments, selectedStaffId, currentDate]);
  
  // Navigation functions
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    // If onTodayClick is provided, call it to switch to today view
    if (onTodayClick) {
      onTodayClick();
    }
  }, [onTodayClick]);
  
  const goToPrevWeek = useCallback(() => setCurrentDate(prev => subWeeks(prev, 1)), []);
  const goToNextWeek = useCallback(() => setCurrentDate(prev => addWeeks(prev, 1)), []);
  
  // Handle opening appointment detail
  const handleOpenAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  // Handle appointment update
  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(apt =>
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      )
    );
  };
  
  // Get title for the calendar header
  const calendarTitle = `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`;

  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date, staffId?: string) => {
    return filteredAppointments.filter(appointment => {
      const appointmentDate = parseISO(appointment.date);
      const matchesDay = isSameDay(appointmentDate, day);
      
      if (staffId && staffId !== 'all') {
        return matchesDay && appointment.employeeId === staffId;
      }
      
      return matchesDay;
    });
  };

  // Get service name for an appointment
  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  // Get client name for an appointment
  const getClientName = (clientId: string) => {
    // This would ideally fetch from clients data
    // For now, just return the ID as placeholder
    return clientId;
  };

  // Get status color for appointment
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'border-l-yellow-500';
      case 'Confirmed':
        return 'border-l-blue-500';
      case 'Arrived':
        return 'border-l-green-500';
      case 'Completed':
        return 'border-l-purple-500';
      case 'Cancelled':
        return 'border-l-red-500';
      case 'No-Show':
        return 'border-l-gray-500';
      default:
        return 'border-l-gray-500';
    }
  };

  // Calculate appointment position based on time
  const calculateAppointmentPosition = (appointment: Appointment) => {
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    const startMinutes = (hours - workingHours.start) * 60 + minutes;
    const positionTop = startMinutes / 30 * HALF_HOUR_HEIGHT;
    
    // Calculate height based on duration
    const durationInMinutes = appointment.duration || 60;
    const height = (durationInMinutes / 30) * HALF_HOUR_HEIGHT;
    
    return { top: positionTop, height };
  };
  
  // Show loading state
  if (isLoading && !appointments.length) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Calendar header with controls - fixed at top */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2 sticky top-0 z-30 bg-white">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="bg-white border-gray-300 text-black hover:bg-gray-100"
          >
            Today
          </Button>
          
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPrevWeek} 
              className="text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextWeek} 
              className="text-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="font-medium text-base">
            {calendarTitle}
          </h2>
          
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            Week View
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />
          )}
          
          {/* Staff selection dropdown */}
          <Select 
            value={selectedStaffId} 
            onValueChange={setSelectedStaffId}
            disabled={isLoading || staffMembers.length === 0}
          >
            <SelectTrigger className="w-[180px] bg-white border-gray-300">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffMembers.map(staff => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Day headers row - fixed below main header */}
      <div className="flex border-b border-gray-300 sticky top-[56px] z-20 bg-white">
        <div className="w-16 flex-shrink-0 border-r border-gray-300"></div>
        <div className="flex-1">
          <div className="flex divide-x divide-gray-300">
            {weekDays.map((day, index) => (
              <div
                key={day.toISOString()}
                className={`flex-1 h-14 flex flex-col items-center justify-center ${
                  isWeekend(day) ? 'bg-gray-50' : ''
                } ${
                  isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`text-sm font-normal text-gray-800 ${
                  isSameDay(day, new Date()) ? 'text-blue-600' : ''
                }`}>
                  {format(day, 'EEEE')}
                </div>
                <div className={`text-xl font-medium ${
                  isSameDay(day, new Date()) ? 'text-blue-600' : ''
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Calendar body - Scrollable area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-300 sticky left-0 bg-white z-10">
            {timeSlots.map((slot, index) => (
              <div 
                key={`time-${index}`} 
                className={`h-8 relative border-b ${
                  slot.isHour ? 'border-gray-300' : 'border-gray-200'
                }`}
              >
                {slot.isHour && (
                  <div className="absolute top-0 right-2 -translate-y-1/2 flex items-baseline">
                    <span className="font-medium text-sm text-gray-800">{slot.hour}</span>
                    <span className="text-xs text-gray-400 ml-0.5">00</span>
                  </div>
                )}
                {!slot.isHour && (
                  <div className="absolute top-0 right-2 -translate-y-1/2">
                    <span className="text-xs text-gray-400">30</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Days columns */}
          <div className="flex-1 flex">
            {weekDays.map((day) => {
              const isWeekendDay = isWeekend(day);
              const isToday = isSameDay(day, new Date());
              const dayAppointments = getAppointmentsForDay(day, selectedStaffId);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`flex-1 relative ${
                    isWeekendDay ? 'bg-gray-50' : 
                    isToday ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Time slots background */}
                  {timeSlots.map((slot, index) => (
                    <div 
                      key={`${day.toISOString()}-${slot.time}`} 
                      className={`h-8 border-b ${
                        slot.isHour ? 'border-gray-300' : 'border-gray-200'
                      }`}
                    />
                  ))}
                  
                  {/* Appointments */}
                  {dayAppointments.map((appointment) => {
                    const { top, height } = calculateAppointmentPosition(appointment);
                    
                    return (
                      <div
                        key={appointment.id}
                        className={`absolute left-1 right-1 bg-white border rounded-sm border-l-4 ${getStatusColor(appointment.status)} shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                        onClick={() => handleOpenAppointment(appointment)}
                      >
                        <div className="p-1.5 flex flex-col h-full overflow-hidden">
                          <div className="text-xs font-medium">
                            {appointment.startTime} - {appointment.endTime}
                          </div>
                          <div className="font-medium text-sm truncate">
                            {getServiceName(appointment.serviceId)}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {getClientName(appointment.clientId)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Appointment detail modal */}
      <AppointmentDetail
        appointment={selectedAppointment}
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onUpdate={handleAppointmentUpdate}
      />
      
      {/* Error notification */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          <div className="flex items-center">
            <div className="mr-2">⚠️</div>
            <div>
              <p className="font-bold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button 
              className="ml-4 text-red-700 hover:text-red-900" 
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
