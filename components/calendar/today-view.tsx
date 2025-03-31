'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, MoreHorizontal, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/authContext';
import { getBusinessAppointments, getBusinessStaff, getBusinessServices } from '@/lib/api';
import { Appointment, BusinessUser, Service } from '@/types';
import { toast } from 'sonner';
import { AppointmentDetail } from '@/app/(dashboard)/calendar/components/appointment-detail';

interface TodayViewProps {
  onBackToWeekView: () => void;
  selectedDate: Date;
}

export function TodayView({ onBackToWeekView, selectedDate }: TodayViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffMembers, setStaffMembers] = useState<BusinessUser[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const { user } = useAuth();

  // Function to navigate to previous day
  const goToPreviousDay = () => {
    const newDate = addDays(selectedDate, -1);
    window.history.pushState({}, '', `/calendar?date=${format(newDate, 'yyyy-MM-dd')}`);
    window.dispatchEvent(new Event('popstate'));
  };

  // Function to navigate to next day
  const goToNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    window.history.pushState({}, '', `/calendar?date=${format(newDate, 'yyyy-MM-dd')}`);
    window.dispatchEvent(new Event('popstate'));
  };

  // Get working hours for all staff - expanded to 8:00-22:00
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

  // Fetch staff and appointments for the selected date
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.businessId) return;

      setIsLoading(true);
      try {
        // Fetch staff, appointments, and services in parallel
        const [allStaff, allAppointments, allServices] = await Promise.all([
          getBusinessStaff(user.businessId),
          getBusinessAppointments(user.businessId),
          getBusinessServices(user.businessId)
        ]);
        
        // Filter out admin users (only keep staff members)
        const staffOnly = allStaff.filter(staff => staff.role !== 'admin');
        
        // Filter appointments for the selected date
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const appointmentsForDate = allAppointments.filter(
          (appointment) => appointment.date === formattedDate
        );
        
        // Sort by start time
        appointmentsForDate.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        setStaffMembers(staffOnly);
        setAppointments(appointmentsForDate);
        setServices(allServices);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load calendar data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, user]);

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

  // Get appointment at specific time slot for a staff member
  const getAppointmentAtTimeSlot = (staffId: string, timeSlot: string) => {
    return appointments.find(
      appointment => 
        appointment.employeeId === staffId && 
        (appointment.startTime === timeSlot || 
         (appointment.startTime < timeSlot && appointment.endTime > timeSlot))
    );
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

  // Determine if an appointment should be rendered at this timeslot
  const shouldRenderAppointment = (staffId: string, timeSlot: string, index: number) => {
    const appointment = getAppointmentAtTimeSlot(staffId, timeSlot);
    if (!appointment) return false;
    
    // Only render the appointment at its start time slot
    return appointment.startTime === timeSlot;
  };

  // Calculate appointment height based on duration
  const calculateAppointmentHeight = (appointment: Appointment) => {
    // Each 30min slot is 32px tall
    const slotHeight = 32;
    const durationInMinutes = appointment.duration || 30;
    const slots = durationInMinutes / 30;
    return slots * slotHeight;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10">
        <Button variant="ghost" onClick={onBackToWeekView} className="text-gray-700">
          <ChevronLeft className="h-5 w-5 mr-1" /> Back to Week
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-60 text-center">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="w-24"></div>
      </div>

      {/* Day view */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-60 py-10">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 py-10 text-gray-500">
            <p>No staff members found</p>
          </div>
        ) : (
          <div className="flex">
            {/* Time column - fixed on the left */}
            <div className="sticky left-0 bg-white z-10 border-r min-w-[60px]">
              <div className="h-16 border-b"></div> {/* Empty space for staff headers */}
              {timeSlots.map((slot, index) => (
                <div key={`time-${index}`} className="h-8 flex items-center justify-end pr-2">
                  {slot.isHour ? (
                    <div className="flex items-baseline">
                      <span className="text-sm font-medium text-gray-700">{slot.hour}</span>
                      <span className="text-xs text-gray-400 ml-0.5">00</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">30</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Staff columns */}
            <div className="flex flex-1 overflow-x-auto">
              {staffMembers.map((staff) => (
                <div key={staff.id} className="min-w-[200px] border-r flex-1">
                  {/* Staff header */}
                  <div className="h-16 p-3 border-b flex flex-col items-center justify-center bg-gray-50">
                    <div className="text-center font-medium">
                      <div className="text-xs text-gray-500 mb-1">
                        {staff.name?.charAt(0) || 'S'}
                      </div>
                      <div>{staff.name || 'Staff'}</div>
                      <div className="text-xs text-gray-500">
                        {staff.role === 'staff' ? 'Staff' : staff.role || 'Staff'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Time slots for this staff */}
                  <div className="relative">
                    {timeSlots.map((slot, index) => {
                      const appointment = shouldRenderAppointment(staff.id, slot.time, index) 
                        ? getAppointmentAtTimeSlot(staff.id, slot.time) 
                        : null;
                        
                      return (
                        <div key={`${staff.id}-${slot.time}`} className="h-8 border-b relative">
                          {appointment && (
                            <div 
                              className={`absolute left-1 right-1 bg-white border rounded-sm border-l-4 ${getStatusColor(appointment.status)} shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10`}
                              style={{
                                height: `${calculateAppointmentHeight(appointment)}px`,
                              }}
                              onClick={() => handleOpenAppointment(appointment)}
                            >
                              <div className="p-1.5">
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
                              
                              <button 
                                className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-gray-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAppointment(appointment);
                                }}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Appointment detail modal */}
      <AppointmentDetail
        appointment={selectedAppointment}
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onUpdate={handleAppointmentUpdate}
      />
    </div>
  );
}
