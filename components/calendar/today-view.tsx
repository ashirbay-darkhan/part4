'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    // Show full hour format (e.g., "9:00" instead of just "9")
    return { primary: `${hours}`, secondary: '00' };
  } else if (minutes === 30) {
    // Show consistent format for half-hour (e.g., "9:30" instead of just "30")
    return { primary: '', secondary: '30' };
  } else {
    // Return empty for quarter hours
    return { primary: '', secondary: '' };
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

interface TodayViewProps {
  onBackToWeekView?: () => void;
}

export function TodayView({ onBackToWeekView }: TodayViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Time slots for the day
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  
  // Fetch data function
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
      
      setStaffMembers(staffData);
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError('Failed to load calendar data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.businessId]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData, currentDate]);
  
  // Filter appointments for the current date
  const todayAppointments = useMemo(() => 
    appointments.filter(appointment => 
      isSameDay(new Date(appointment.date), currentDate)
    ), [appointments, currentDate]
  );
  
  // Navigation functions
  const goToToday = useCallback(() => setCurrentDate(new Date()), []);
  
  const goToPreviousDay = useCallback(() => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  }, [currentDate]);
  
  const goToNextDay = useCallback(() => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  }, [currentDate]);
  
  // Refresh appointments after changes
  const refreshAppointments = useCallback(async () => {
    if (!user?.businessId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const updatedAppointments = await getBusinessAppointments(user.businessId);
      setAppointments(updatedAppointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      setError('Failed to refresh appointments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.businessId]);
  
  // Format date for display
  const formattedDate = format(currentDate, "d MMMM, EEEE");
  const isToday = isSameDay(currentDate, new Date());
  
  // Render time slot cell - extracted to reduce code duplication
  const renderTimeSlotCell = useCallback((staffId: string, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return (
      <div 
        key={`${staffId}-${time}`} 
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
  
  // Staff columns header and scrollable content area
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Calendar header with controls - fixed at top */}
      <div className="px-2 py-1 border-b flex items-center justify-between sticky top-0 z-30 bg-white">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            disabled={isToday}
            className="bg-white border-gray-300 text-black hover:bg-gray-100"
            aria-label="Go to today"
          >
            Today
          </Button>
          
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPreviousDay} 
              className="text-gray-700"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextDay} 
              className="text-gray-700"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="font-medium text-lg">
            {formattedDate}
          </h2>
          
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            Today View
          </span>
          
          {onBackToWeekView && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBackToWeekView}
              className="ml-2"
              aria-label="Switch to week view"
            >
              Back to Week
            </Button>
          )}
          
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500 ml-2" />
          )}
        </div>
      </div>
      
      {/* Unified scrollable container - The only scrollable area */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden" role="grid" aria-label="Today's schedule">
        {/* Staff columns header - sticky */}
        <div className="flex border-b sticky top-0 z-20 bg-white">
          <div className="w-20 flex-shrink-0 border-r border-gray-300" role="presentation"></div>
          {staffMembers.map(staff => (
            <div 
              key={staff.id} 
              className="flex-1 min-w-[180px] p-3 flex flex-col items-center justify-center border-r border-gray-300"
              role="columnheader"
              aria-label={`Staff: ${staff.name}`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                <span className="text-sm font-medium">{staff.name.charAt(0)}</span>
              </div>
              <p className="text-sm font-medium">{staff.name}</p>
              <p className="text-xs text-gray-500">Staff</p>
            </div>
          ))}
        </div>
        
        {/* Grid content with minimum height to ensure all hours are shown */}
        <div className="flex flex-1 min-h-[1000px]">
          {/* Time labels column - sticky - add padding-top to align with staff header height */}
          <div className="w-20 flex-shrink-0 border-r border-gray-300 bg-white shadow-sm z-10 sticky left-0 pt-[20px]" role="rowheader">
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
                    <div className="absolute top-0 right-2 text-xs -translate-y-1/2 flex items-center">
                      {minutes === 0 ? (
                        // Full hour format: "08:00"
                        <div className="flex">
                          <span className="font-medium text-gray-800">{timeLabel.primary}</span>
                          <span className="text-gray-400">:{timeLabel.secondary}</span>
                        </div>
                      ) : (
                        // Half hour format: just "30"
                        <span className="text-gray-400">{timeLabel.secondary}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Staff columns with appointments */}
          {staffMembers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-gray-500">
              No staff members available. Please add staff to view the calendar.
            </div>
          ) : (
            staffMembers.map((staff, index) => {
              // Filter appointments for this staff member
              const staffAppointments = todayAppointments.filter(
                appt => appt.employeeId === staff.id
              );
              
              return (
                <div 
                  key={staff.id} 
                  className={`flex-1 min-w-[180px] border-r border-gray-300 relative pt-[20px] ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                  role="gridcell"
                  aria-label={`Schedule for ${staff.name}`}
                >
                  {/* Time slot grid */}
                  {timeSlots.map(time => renderTimeSlotCell(staff.id, time))}
                
                  {/* Appointments */}
                  {staffAppointments.map(appointment => {
                    const style = calculateAppointmentStyle(appointment);
                    
                    return (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onClick={() => refreshAppointments()}
                        onStatusChange={refreshAppointments}
                        style={style}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
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
    </div>
  );
} 