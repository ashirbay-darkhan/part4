'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, addWeeks, subWeeks, isWeekend } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
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
import { Appointment, User, AppointmentStatus } from '@/types';
import { useAuth } from '@/lib/auth/authContext';

// Business hours configuration
const BUSINESS_HOURS = {
  start: 10, // 10:00 AM
  end: 22,   // 10:00 PM
};

// Utility to generate time slots based on business hours
const generateTimeSlots = () => {
  const slots = [];
  
  for (let hour = BUSINESS_HOURS.start; hour <= BUSINESS_HOURS.end; hour++) {
    slots.push(`${hour}:00`);
    slots.push(`${hour}:30`);
  }
  
  return slots;
};

// Utility to format time for display
const formatTimeDisplay = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  if (minutes === 0) {
    return `${displayHours} ${period}`;
  }
  return undefined; // Only display hours, not half-hours
};

// Utility to format minutes display
const formatMinutesDisplay = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (minutes > 0) {
    return minutes.toString();
  }
  return undefined;
};

// Utility to calculate appointment position and height
const calculateAppointmentStyle = (appointment: Appointment) => {
  const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
  const [endHour, endMinute] = appointment.endTime.split(':').map(Number);
  
  // Calculate position from top
  const dayStartMinutes = BUSINESS_HOURS.start * 60;
  const appointmentStartMinutes = startHour * 60 + startMinute;
  const appointmentEndMinutes = endHour * 60 + endMinute;
  
  // Each hour is 60px in height, each minute is 1px
  const topPosition = (appointmentStartMinutes - dayStartMinutes);
  const height = appointmentEndMinutes - appointmentStartMinutes;
  
  return {
    top: `${topPosition}px`,
    height: `${height}px`,
  };
};

export function WeekCalendarView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Calculate week days based on current date
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);
  
  // Time slots for the day
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  
  // Fetch staff and appointments data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.businessId) return;
      
      try {
        setIsLoading(true);
        
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
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.businessId]);
  
  // Filter appointments based on selected staff and date range
  const filteredAppointments = useMemo(() => {
    if (!selectedStaffId) return [];
    
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    return appointments.filter(appointment => {
      // Only show appointments for selected staff
      if (appointment.employeeId !== selectedStaffId) return false;
      
      // Filter by date range - either day or week
      const appointmentDate = parseISO(appointment.date);
      
      if (viewMode === 'day') {
        return isSameDay(appointmentDate, currentDate);
      } else {
        return appointmentDate >= weekStart && appointmentDate <= weekEnd;
      }
    });
  }, [appointments, selectedStaffId, currentDate, viewMode]);
  
  // Navigation functions
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    } else {
      setCurrentDate(prev => subWeeks(prev, 1));
    }
  };
  
  const goToNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
    } else {
      setCurrentDate(prev => addWeeks(prev, 1));
    }
  };
  
  // Handle appointment click
  const handleAppointmentClick = (appointment: Appointment) => {
    // This will be handled by the AppointmentCard component
  };
  
  // Refresh appointments after changes
  const refreshAppointments = async () => {
    if (!user?.businessId) return;
    
    try {
      setIsLoading(true);
      const updatedAppointments = await getBusinessAppointments(user.businessId);
      setAppointments(updatedAppointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get days to display based on view mode
  const displayDays = viewMode === 'day' 
    ? [currentDate] 
    : weekDays;
  
  // Get title for the calendar header
  const calendarTitle = viewMode === 'day'
    ? format(currentDate, 'MMMM d, yyyy')
    : `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`;
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Calendar header with controls */}
      <div className="p-3 border-b flex flex-col sm:flex-row items-center justify-between gap-2 sticky top-0 z-20 bg-white">
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
            <Button variant="ghost" size="icon" onClick={goToPrevious} className="text-gray-700">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNext} className="text-gray-700">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="font-medium text-base">
            {calendarTitle}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Staff selection dropdown */}
          <Select 
            value={selectedStaffId} 
            onValueChange={setSelectedStaffId}
          >
            <SelectTrigger className="w-[180px] bg-white border-gray-300">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffMembers.map(staff => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* View mode toggle */}
          <div className="flex">
            <Button 
              variant={viewMode === 'day' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('day')}
              className={`rounded-r-none border-gray-300 ${viewMode === 'day' ? 'bg-blue-600' : 'bg-white text-black'}`}
            >
              Day
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setViewMode('week')}
              className={`rounded-l-none border-gray-300 ${viewMode === 'week' ? 'bg-blue-600' : 'bg-white text-black'}`}
            >
              Week
            </Button>
          </div>

          <Button variant="outline" size="icon" className="bg-white border-gray-300 text-gray-700">
            <CalendarIcon className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="icon" className="bg-white border-gray-300 text-gray-700">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Day headers row */}
      <div className="flex border-b border-gray-200 sticky top-[60px] z-10 bg-white">
        <div className="w-16 flex-shrink-0 border-r border-gray-200"></div>
        <div className="flex-1 overflow-x-auto">
          <div className="flex min-w-max">
            {displayDays.map((day, dayIndex) => (
              <div
                key={`header-${day.toISOString()}`}
                className="flex-1 min-w-[120px] h-14 flex flex-col items-center justify-center"
              >
                <div className={`text-sm font-normal text-gray-800 ${
                  isSameDay(day, new Date()) ? 'text-blue-600' : ''
                }`}>
                  {format(day, 'EEEE')}
                </div>
                <div className={`text-xl font-medium ${
                  isSameDay(day, new Date()) ? 'text-blue-600' : ''
                }`}>
                  {format(day, 'd MMM')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Calendar body - Scrollable area */}
      <div className="flex flex-1 overflow-hidden">
        {/* This div makes both time column and days columns scroll together */}
        <div className="flex flex-1 overflow-y-auto scrollbar-hide">
          {/* Time labels column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-white">
            <div className="relative">
              {timeSlots.map((time, i) => {
                const hour = formatTimeDisplay(time);
                const minutes = formatMinutesDisplay(time);
                return (
                  <div 
                    key={time} 
                    className={`h-[60px] relative border-b border-gray-200`}
                  >
                    {hour && (
                      <div className="absolute -top-2.5 right-2 text-xs text-gray-500 font-normal">
                        {hour}
                      </div>
                    )}
                    {minutes && (
                      <div className="absolute top-[20px] right-2 text-xs text-gray-500 font-normal">
                        {minutes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Days columns */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex h-full min-w-max">
              {displayDays.map((day, dayIndex) => {
                const isWeekendDay = isWeekend(day);
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`flex-1 min-w-[120px] ${
                      isWeekendDay ? 'bg-gray-50' : 'bg-white'
                    } ${
                      isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Day content with time slots */}
                    <div className="relative">
                      {/* Time slots background */}
                      {timeSlots.map((time, i) => (
                        <div 
                          key={`${day.toISOString()}-${time}`} 
                          className="h-[60px] border-b border-gray-200"
                        />
                      ))}
                      
                      {/* Appointments */}
                      {filteredAppointments
                        .filter(appointment => isSameDay(parseISO(appointment.date), day))
                        .map(appointment => {
                          const style = calculateAppointmentStyle(appointment);
                          
                          return (
                            <AppointmentCard
                              key={appointment.id}
                              appointment={appointment}
                              onClick={() => handleAppointmentClick(appointment)}
                              onStatusChange={refreshAppointments}
                              style={style}
                            />
                          );
                        })
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
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