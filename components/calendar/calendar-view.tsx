'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks, isWeekend } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppointmentCard } from './appointment-card';
import { getBusinessAppointments, getBusinessStaff } from '@/lib/api';
import { Appointment, User } from '@/types';
import { useAuth } from '@/lib/auth/authContext';

// Constants for calendar display
const HOUR_HEIGHT = 60; // pixels per hour
const HALF_HOUR_HEIGHT = HOUR_HEIGHT / 2; // pixels per half hour
const QUARTER_HOUR_HEIGHT = HOUR_HEIGHT / 4; // pixels per quarter hour
const MINUTE_HEIGHT = HOUR_HEIGHT / 60; // pixels per minute

// Business hours configuration
const BUSINESS_HOURS = {
  start: 8, // 8:00
  end: 22, // 22:00
};

// Generate time slots with 15-minute increments
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = BUSINESS_HOURS.start; hour <= BUSINESS_HOURS.end; hour++) {
    slots.push(`${hour}:00`);
    slots.push(`${hour}:15`); // Add quarter-hour increments
    slots.push(`${hour}:30`); // Add half-hour increments
    slots.push(`${hour}:45`); // Add three-quarter-hour increments
  }
  return slots;
};

// Format time display in 24-hour format
const formatTimeDisplay = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  
  if (minutes === 0) {
    return { primary: `${hours}`, secondary: '00' };
  } else if (minutes === 15) {
    return { primary: '', secondary: '15' };
  } else if (minutes === 30) {
    return { primary: '', secondary: '30' };
  } else {
    return { primary: '', secondary: '45' };
  }
};

// Calculate appointment position and height
const calculateAppointmentStyle = (appointment: Appointment) => {
  const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
  const [endHour, endMinute] = appointment.endTime.split(':').map(Number);
  
  // Calculate minutes from beginning of business hours
  const startMinutesFromOpen = (startHour - BUSINESS_HOURS.start) * 60 + startMinute;
  const endMinutesFromOpen = (endHour - BUSINESS_HOURS.start) * 60 + endMinute;
  const durationMinutes = endMinutesFromOpen - startMinutesFromOpen;
  
  // Handle edge cases
  if (durationMinutes <= 0) {
    console.warn('Invalid appointment duration:', appointment);
    return {
      top: `${startMinutesFromOpen * MINUTE_HEIGHT}px`,
      height: `${QUARTER_HOUR_HEIGHT}px`, // Minimum height
      zIndex: 10,
    };
  }
  
  // Convert to pixels using our defined constants
  return {
    top: `${startMinutesFromOpen * MINUTE_HEIGHT}px`,
    height: `${durationMinutes * MINUTE_HEIGHT}px`,
    zIndex: 10, // Ensure appointments appear above the time slot hover effects
  };
};

interface CalendarViewProps {
  onTodayClick?: () => void;
}

export function CalendarView({ onTodayClick }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);
  
  // Time slots for the day
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  
  // Fetch staff and appointments data
  const fetchData = useCallback(async () => {
    if (!user?.businessId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch staff and appointments in parallel
      const [staffData, appointmentsData] = await Promise.all([
        getBusinessStaff(user.businessId),
        getBusinessAppointments(user.businessId)
      ]);
      
      // Filter out admin users from staff list
      const nonAdminStaff = staffData.filter(staff => staff.role !== 'admin');
      setStaffMembers(nonAdminStaff);
      setAppointments(appointmentsData);
      
      // Auto-select the first staff member if none is selected
      if (!selectedStaffId && nonAdminStaff.length > 0) {
        setSelectedStaffId(nonAdminStaff[0].id);
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
    if (!selectedStaffId) return [];
    
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    return appointments.filter(appointment => {
      // Only show appointments for selected staff
      if (appointment.employeeId !== selectedStaffId) return false;
      
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
  
  // Refresh appointments after changes
  const refreshAppointments = useCallback(async () => {
    if (!user?.businessId) return;
    
    try {
      setIsLoading(true);
      const updatedAppointments = await getBusinessAppointments(user.businessId);
      setAppointments(updatedAppointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      setError('Failed to refresh appointments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.businessId]);
  
  // Get title for the calendar header
  const calendarTitle = `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`;
  
  // Render time slot cell - extracted to reduce code duplication
  const renderTimeSlotCell = useCallback((day: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return (
      <div 
        key={`${day.toISOString()}-${time}`} 
        className={`border-b group relative ${
          minutes === 0 
            ? 'border-gray-300' 
            : minutes === 30 
              ? 'border-gray-200' 
              : 'border-gray-100'
        } hover:bg-blue-50 transition-colors`}
        style={{ height: `${QUARTER_HOUR_HEIGHT}px` }}
        aria-label={`Time slot ${formattedTime}`}
      >
        {/* Time indicator on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">{formattedTime}</span>
        </div>
      </div>
    );
  }, []);
  
  // Show loading state
  if (isLoading && !appointments.length) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    );
  }
  
  // Show error state
  if (error && !appointments.length) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white">
        <div className="text-red-500 mb-4">⚠️</div>
        <p className="text-gray-800 font-medium mb-2">Error Loading Calendar</p>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline">Try Again</Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Calendar header with controls - fixed at top */}
      <div className="px-2 py-1 border-b flex items-center justify-between gap-2 sticky top-0 z-30 bg-white">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="bg-white border-gray-300 text-black hover:bg-gray-100"
            aria-label="Go to today"
          >
            Today
          </Button>
          
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPrevWeek} 
              className="text-gray-700"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextWeek} 
              className="text-gray-700"
              aria-label="Next week"
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
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffMembers.length === 0 ? (
                <SelectItem value="no-staff" disabled>No staff members available</SelectItem>
              ) : (
                staffMembers.map(staff => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Day headers row - fixed below main header */}
      <div className="flex border-b border-gray-300 sticky top-[32px] z-20 bg-white">
        <div className="w-20 flex-shrink-0 border-r border-gray-300"></div>
        <div className="flex-1">
          <div className="flex divide-x divide-gray-300">
            {weekDays.map((day, index) => (
              <div
                key={day.toISOString()}
                className={`flex-1 h-14 flex flex-col items-center justify-center ${
                  isWeekend(day) ? 'bg-gray-50' : ''
                } ${
                  isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                } ${index === 0 ? 'border-l border-gray-300' : ''}`}
                aria-label={format(day, 'EEEE, MMMM d, yyyy')}
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
      
      {/* Calendar body - Scrollable area with minimum height to ensure all hours are shown */}
      <div className="flex flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide" role="grid" aria-label="Weekly calendar">
        {/* Time labels column */}
        <div className="w-20 flex-shrink-0 border-r border-gray-300 bg-white shadow-sm z-10 sticky left-0" role="rowheader">
          <div className="relative pt-6">
            {timeSlots.map(time => {
              const timeLabel = formatTimeDisplay(time);
              const [hours, minutes] = time.split(':').map(Number);
              // Only show labels for hour and half-hour marks
              const showLabel = minutes === 0 || minutes === 30;
              return (
                <div 
                  key={time} 
                  className={`relative border-b ${
                    minutes === 0 
                      ? 'border-gray-300' 
                      : minutes === 30 
                        ? 'border-gray-200' 
                        : 'border-gray-100'
                  }`}
                  style={{ height: `${QUARTER_HOUR_HEIGHT}px` }}
                  aria-hidden="true"
                >
                  {showLabel && (
                    <div className="absolute top-0 right-2 text-xs -translate-y-1/2 flex">
                      {timeLabel.primary && (
                        <span className="font-medium text-gray-800 mr-0.5">{timeLabel.primary}</span>
                      )}
                      <span className="text-gray-400">{timeLabel.secondary}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Days columns */}
        <div className="flex-1">
          <div className="flex h-full divide-x divide-gray-300 min-h-[1000px]">
            {weekDays.map((day, index) => {
              const isWeekendDay = isWeekend(day);
              const isToday = isSameDay(day, new Date());
              
              // Get appointments for this day
              const dayAppointments = filteredAppointments.filter(
                appointment => isSameDay(parseISO(appointment.date), day)
              );
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`flex-1 ${
                    isWeekendDay ? 'bg-gray-50' : 
                      isToday ? 'bg-blue-50' :
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  } ${index === 0 ? 'border-l border-gray-300' : ''}`}
                  role="gridcell"
                  aria-label={format(day, 'EEEE, MMMM d')}
                >
                  {/* Time slots background */}
                  <div className="relative pt-6">
                    {timeSlots.map(time => renderTimeSlotCell(day, time))}
                    
                    {/* Appointments */}
                    {dayAppointments.map(appointment => {
                      const style = calculateAppointmentStyle(appointment);
                      const adjustedStyle = {
                        ...style,
                        top: `calc(${style.top} + 24px)`,
                      };
                      
                      return (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          onClick={() => refreshAppointments()}
                          onStatusChange={refreshAppointments}
                          style={adjustedStyle}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
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
      
      {/* CSS to hide scrollbars */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
} 