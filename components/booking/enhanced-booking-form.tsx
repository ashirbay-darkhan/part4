"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Clock, User, Phone, Mail, MessageSquare, Calendar as CalendarIcon, Check, Info, ArrowLeft, Star, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { createAppointment } from '@/lib/api';

// Custom calendar component
interface CustomCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  disabledDays?: (date: Date) => boolean;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ selectedDate, onDateChange, disabledDays }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());
  
  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start, end });
  };
  
  const days = getDaysInMonth(currentMonth);
  
  // Get day of week for the first day of the month (Monday = 0, Sunday = 6)
  const getStartDay = (date: Date) => {
    const day = startOfMonth(date).getDay();
    // Convert to Monday = 0, Sunday = 6
    return day === 0 ? 6 : day - 1;
  };
  
  const startDay = getStartDay(currentMonth);
  
  // Previous and next month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  // Check if a date is disabled
  const isDisabled = (date: Date) => {
    if (!disabledDays) return false;
    return disabledDays(date);
  };
  
  // Days of the week - starting with Monday
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  
  // Generate calendar grid
  const generateCalendarGrid = () => {
    const result = [];
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    
    // Calculate the first day to display (might be from the previous month)
    // If first day of month is Monday (1), we don't need to show any days from previous month
    // If it's any other day, we need to show some days from the previous month
    const firstDay = startDay > 0 ? new Date(firstDayOfMonth) : firstDayOfMonth;
    firstDay.setDate(firstDay.getDate() - startDay);
    
    // Generate a flat array of 42 days (6 weeks × 7 days)
    for (let i = 0; i < 42; i++) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() + i);
      
      // Only include days from the current month
      if (date.getMonth() === currentMonth.getMonth()) {
        result.push(date);
      } else {
        result.push(null); // Placeholder for days not in current month
      }
    }
    
    // Split into weeks
    const weeks = [];
    for (let i = 0; i < 6; i++) {
      const week = result.slice(i * 7, (i + 1) * 7);
      // Only include weeks that have at least one day
      if (week.some(day => day !== null)) {
        weeks.push(week);
      }
    }
    
    return weeks;
  };
  
  const weeks = generateCalendarGrid();
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="text-center font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      
      {/* Weekday headers */}
      <div className="flex justify-around mb-2">
        {weekDays.map(day => (
          <div key={day} className="w-9 text-center text-gray-500 font-medium text-sm">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-x-0 gap-y-1 mt-1">
        
        {/* Calendar days - flattened to ensure proper grid alignment */}
        {weeks.flat().map((day, index) => {
          if (!day) {
            // Empty cell for days not in current month
            return <div key={`empty-${index}`} className="h-9 w-9 mx-auto" />;
          }
          
          const isSelected = isSameDay(day, selectedDate);
          const isDisabledDay = isDisabled(day);
          
          return (
            <button
              key={`day-${index}`}
              type="button"
              className={`h-9 w-9 mx-auto rounded-full flex items-center justify-center text-sm
                ${isSelected ? 'bg-black text-white' : ''}
                ${!isSelected && !isDisabledDay ? 'hover:bg-gray-100' : ''}
                ${isDisabledDay ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => !isDisabledDay && onDateChange(day)}
              disabled={isDisabledDay}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
  description: string;
}

interface Category {
  name: string;
  services: Service[];
  isOpen: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  avatar: string | null;
  role?: string;
  serviceIds?: string[];
  rating?: number;
  reviewCount?: number;
  workingHours?: {
    dayOfWeek: number;
    isWorking: boolean;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    timeSlots?: string[];
  }[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface StaffAvailability {
  staffId: string;
  date: string;
  slots: TimeSlot[];
}

interface EnhancedBookingFormProps {
  businessId: string;
  businessName: string;
  services: Service[];
  staff: StaffMember[];
}

const EnhancedBookingForm: React.FC<EnhancedBookingFormProps> = ({ 
  businessId, 
  businessName, 
  services = [], 
  staff = [] 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [staffAvailability, setStaffAvailability] = useState<Record<string, StaffAvailability>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Group services by category
  useEffect(() => {
    const groupedServices = services.reduce((acc: { [key: string]: Service[] }, service) => {
      const category = service.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {});

    const categoriesArray = Object.entries(groupedServices).map(([name, services]) => ({
      name,
      services,
      isOpen: false
    }));

    setCategories(categoriesArray);
  }, [services]);

  // Toggle category dropdown
  const toggleCategory = (categoryName: string) => {
    setCategories(prevCategories => 
      prevCategories.map(category => ({
        ...category,
        isOpen: category.name === categoryName ? !category.isOpen : category.isOpen
      }))
    );
  };

  // Add this function to fetch appointments
  const fetchAppointments = async (date: string, staffId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${API_URL}/appointments?date=${date}&employeeId=${staffId}&businessId=${businessId}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return await response.json();
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  };

  // Get available time slots for a specific staff member and date
  const getStaffTimeSlots = (staffId: string, date: string) => {
    // Get the day of week (0-6, where 0 is Sunday)
    const dayOfWeek = new Date(date).getDay();
    // Convert to 1-7 where 1 is Monday
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    // Find the staff member
    const staffMember = staff.find(s => s.id === staffId);
    
    if (!staffMember || !staffMember.workingHours) {
      return [];
    }

    // Get working hours for this day
    const workingHours = staffMember.workingHours.find(wh => wh.dayOfWeek === adjustedDayOfWeek);
    
    if (!workingHours || !workingHours.isWorking) {
      return [];
    }

    // Parse working hours
    const [startHour, startMinute] = workingHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = workingHours.endTime.split(':').map(Number);
    const workStart = startHour * 60 + startMinute;
    const workEnd = endHour * 60 + endMinute;
    
    // Parse break times if they exist
    const breakStart = workingHours.breakStart ? 
      workingHours.breakStart.split(':').map(Number).reduce((h, m) => h * 60 + m, 0) : null;
    const breakEnd = workingHours.breakEnd ? 
      workingHours.breakEnd.split(':').map(Number).reduce((h, m) => h * 60 + m, 0) : null;
    
    // Get all appointments for this staff member on this date
    const appointments = Object.values(staffAvailability || {})
      .filter(avail => avail && avail.staffId === staffId && avail.date === date)
      .flatMap(avail => avail.slots || [])
      .filter(slot => !slot.available)
      .map(slot => {
        const [slotHour, slotMinute] = slot.time.split(':').map(Number);
        const startMinutes = slotHour * 60 + slotMinute;
        const endMinutes = startMinutes + (selectedService?.duration || 30);
        return { start: startMinutes, end: endMinutes };
      });
    
    // Generate all potential time slots for this day (every 30 minutes)
    const availableSlots = [];
    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];
    const currentMinutes = isToday ? (now.getHours() * 60 + now.getMinutes()) : 0;
    
    // Start from the beginning of working hours and check every 30 minutes
    for (let timeMinutes = workStart; timeMinutes < workEnd; timeMinutes += 30) {
      // Skip if this slot is in the past (for today only)
      if (isToday && timeMinutes <= currentMinutes) {
        continue;
      }
      
      const slotEndMinutes = timeMinutes + (selectedService?.duration || 30);
      
      // Skip if the appointment would end after working hours
      if (slotEndMinutes > workEnd) {
        continue;
      }
      
      // Skip if during break time
      if (breakStart !== null && breakEnd !== null) {
        const duringBreak = (timeMinutes >= breakStart && timeMinutes < breakEnd) || 
                           (slotEndMinutes > breakStart && slotEndMinutes <= breakEnd) ||
                           (timeMinutes <= breakStart && slotEndMinutes >= breakEnd);
        if (duringBreak) {
          continue;
        }
      }
      
      // Check if slot conflicts with any existing appointment
      const hasConflict = appointments.some(apt => {
        return (timeMinutes >= apt.start && timeMinutes < apt.end) || 
               (slotEndMinutes > apt.start && slotEndMinutes <= apt.end) ||
               (timeMinutes <= apt.start && slotEndMinutes >= apt.end);
      });
      
      if (!hasConflict) {
        const hour = Math.floor(timeMinutes / 60);
        const minute = timeMinutes % 60;
        availableSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    
    return availableSlots;
  };

  // Update useEffect to fetch real appointments
  useEffect(() => {
    const loadAppointments = async () => {
      if (selectedService) {
        const availabilityData: Record<string, StaffAvailability> = {};
        
        for (const staffMember of staff) {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const todayString = today.toISOString().split('T')[0];
          const tomorrowString = tomorrow.toISOString().split('T')[0];
          
          // Fetch today's appointments
          const todayAppointments = await fetchAppointments(todayString, staffMember.id);
          
          // Fetch tomorrow's appointments
          const tomorrowAppointments = await fetchAppointments(tomorrowString, staffMember.id);
          
          // Mark slots as not available based on appointments
          const todaySlots: TimeSlot[] = [];
          const tomorrowSlots: TimeSlot[] = [];
          
          // Process today's appointments
          todayAppointments.forEach((apt: any) => {
            const [startHour, startMinute] = apt.startTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = startMinutes + apt.duration;
            
            // Create a slot entry for each booked appointment
            todaySlots.push({
              time: apt.startTime,
              available: false
            });
          });
          
          // Process tomorrow's appointments
          tomorrowAppointments.forEach((apt: any) => {
            const [startHour, startMinute] = apt.startTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = startMinutes + apt.duration;
            
            // Create a slot entry for each booked appointment
            tomorrowSlots.push({
              time: apt.startTime,
              available: false
            });
          });
          
          // Store the booked slots for today and tomorrow
          availabilityData[`${staffMember.id}-${todayString}`] = {
            staffId: staffMember.id,
            date: todayString,
            slots: todaySlots
          };
          
          availabilityData[`${staffMember.id}-${tomorrowString}`] = {
            staffId: staffMember.id,
            date: tomorrowString,
            slots: tomorrowSlots
          };
        }
        
        setStaffAvailability(availabilityData);
      }
    };

    loadAppointments();
  }, [selectedService, staff, businessId]);

  // Handle next step
  const nextStep = async () => {
    if (currentStep === 3) {
      // Validate form data
      if (!formData.name || !formData.phone) {
        setSubmitError('Please fill in all required fields');
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        // Calculate end time based on service duration
        const [hours, minutes] = selectedTime!.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + selectedService!.duration);
        
        const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

        // Create new client appointment
        const appointment = {
          clientId: Date.now().toString(), // Generate temporary client ID
          employeeId: selectedStaff!.id,
          serviceId: selectedService!.id,
          date: selectedDate,
          startTime: selectedTime!,
          endTime: endTime,
          duration: selectedService!.duration,
          status: 'Pending' as const,
          price: selectedService!.price,
          businessId: businessId,
          comment: formData.notes || undefined
        };

        // Create new client
        const client = {
          id: appointment.clientId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email || '',
          totalVisits: 0,
          businessId: businessId,
          notes: formData.notes || undefined
        };

        // Save client and appointment
        await Promise.all([
          fetch('http://localhost:3001/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
          }),
          createAppointment(appointment)
        ]);

        setCurrentStep(4);
      } catch (error) {
        console.error('Error saving appointment:', error);
        setSubmitError('Failed to save appointment. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `KZT ${amount.toLocaleString()}`;
  };

  // Add this helper function to generate time slots
  const generateTimeSlots = (startTime: string, endTime: string, breakStart?: string, breakEnd?: string) => {
    const slots: string[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const [breakStartHour, breakStartMinute] = breakStart ? breakStart.split(':').map(Number) : [0, 0];
    const [breakEndHour, breakEndMinute] = breakEnd ? breakEnd.split(':').map(Number) : [0, 0];

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Skip break time
      if (breakStart && breakEnd) {
        const isBreakTime = 
          (currentHour > breakStartHour || (currentHour === breakStartHour && currentMinute >= breakStartMinute)) &&
          (currentHour < breakEndHour || (currentHour === breakEndHour && currentMinute < breakEndMinute));
        
        if (!isBreakTime) {
          slots.push(timeString);
        }
      } else {
        slots.push(timeString);
      }

      // Increment by 30 minutes
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }

    return slots;
  };

  // Get earliest available date for a staff member
  const getEarliestAvailability = (staffId: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayString = today.toISOString().split('T')[0];
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    // Check today's availability
    const todaySlots = getStaffTimeSlots(staffId, todayString);
    
    if (todaySlots.length > 0) {
      return { 
        date: "today",
        slots: todaySlots.map(time => ({ time, available: true }))
      };
    }
    
    // Check tomorrow's availability
    const tomorrowSlots = getStaffTimeSlots(staffId, tomorrowString);
    
    if (tomorrowSlots.length > 0) {
      return {
        date: "tomorrow",
        slots: tomorrowSlots.map(time => ({ time, available: true }))
      };
    }
    
    return null;
  };

  // Calculate progress based on current step (now we have 3 main steps)
  const progress = (currentStep / 3) * 100;

  // Format date to display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Handle calendar date change
  const handleCalendarDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedCalendarDate(date);
      setSelectedDate(format(date, 'yyyy-MM-dd'));
      setSelectedTime(null); // Reset time when date changes
    }
  };
  
  // Handle staff and time selection
  const handleTimeSelection = (staff: StaffMember, time: string) => {
    setSelectedStaff(staff);
    setSelectedTime(time);
  };
  
  // Get available time slots for a specific date and staff
  const getAvailableTimeSlotsForDate = (staffId: string, date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return getStaffTimeSlots(staffId, formattedDate);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{businessName}</h1>
          <p className="text-lg text-gray-600">Book your appointment online</p>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-8">
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-gray-800 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-3 grid grid-cols-3 text-sm">
            <div className={`text-center ${currentStep >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Service</div>
            <div className={`text-center ${currentStep >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Staff & Time</div>
            <div className={`text-center ${currentStep >= 3 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Your Info</div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-md shadow-sm overflow-hidden border border-gray-100">
          <div className="h-0.5 bg-gray-800"></div>
          
          <div className="p-6 md:p-8">
            {/* Step 1: Service Selection */}
            {currentStep === 1 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Service</h2>
                  <p className="text-gray-500">Select the service you'd like to book</p>
                </div>
                
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.name} className="border border-gray-200 rounded-md overflow-hidden">
                      {/* Category Header */}
                      <button
                        className="w-full px-4 py-3 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
                        onClick={() => toggleCategory(category.name)}
                      >
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900">{category.name}</h3>
                          <span className="ml-2 text-sm text-gray-500">
                            ({category.services.length} {category.services.length === 1 ? 'service' : 'services'})
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                            category.isOpen ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Services List */}
                      <div
                        className={`transition-all duration-200 ease-in-out ${
                          category.isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                        }`}
                      >
                        <div className="divide-y divide-gray-100">
                          {category.services.map((service) => (
                            <div 
                              key={service.id}
                              className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50
                              ${selectedService && selectedService.id === service.id 
                                ? 'bg-gray-50 border-l-4 border-gray-800' 
                                : ''}`}
                              onClick={() => setSelectedService(service)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                                    {selectedService && selectedService.id === service.id && (
                                      <div className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-white">
                                        <Check className="h-3 w-3" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center text-sm text-gray-500 mt-1">
                                    <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                    <span>{service.duration} min</span>
                                  </div>
                                  {service.description && (
                                    <p className="text-gray-600 text-sm mt-2">{service.description}</p>
                                  )}
                                </div>
                                
                                <div className="ml-4 flex-shrink-0">
                                  <span className="font-medium text-gray-900">{formatCurrency(service.price)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Staff & Time Selection (unified in one step like in the second image) */}
            {currentStep === 2 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Specialist</h2>
                  <p className="text-gray-500">Select who you'd like to book with</p>
                </div>

                {/* Back button */}
                <button 
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center text-gray-700 mb-6"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  <span>Back to services</span>
                </button>
                
                {/* Calendar for date selection */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-3">Select Date</h3>
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <CustomCalendar 
                      selectedDate={selectedCalendarDate}
                      onDateChange={handleCalendarDateChange}
                      disabledDays={(date) => 
                        date < new Date(new Date().setHours(0, 0, 0, 0)) || // No past dates
                        date.getDay() === 0 // No Sundays - getDay() returns 0 for Sunday
                      }
                    />
                  </div>
                </div>
                
                {/* Staff List with Availability */}
                <div className="space-y-6">
                  {staff
                    .filter(person => getAvailableTimeSlotsForDate(person.id, selectedCalendarDate).length > 0)
                    .map((person) => {
                    const isSelected = selectedStaff?.id === person.id;
                    
                    return (
                      <div 
                        key={person.id} 
                        className={`border rounded-md overflow-hidden transition-all
                          ${isSelected ? 'border-gray-800' : 'border-gray-200'}`}
                      >
                        {/* Staff Info */}
                        <div className="p-4 flex items-start">
                          <div className="flex-shrink-0 mr-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden
                              ${isSelected ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>
                              {person.avatar ? (
                                <img src={person.avatar} alt={person.name} className="object-cover w-full h-full" />
                              ) : (
                                <span className="text-lg font-medium">{person.name.split(' ')[0].charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div onClick={() => setSelectedStaff(person)}>
                                <h3 className="font-medium text-gray-900">{person.name}</h3>
                                <p className="text-sm text-gray-500">{person.role || "Specialist"}</p>
                                
                                {person.rating && (
                                  <div className="flex items-center mt-1">
                                    <div className="flex text-yellow-400">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} fill="currentColor" className="w-3.5 h-3.5" />
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-500 ml-1">
                                      {person.reviewCount || 0} {person.reviewCount === 1 ? 'review' : 'reviews'}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="mt-1">
                                  <span className="text-gray-900 font-medium">
                                    {selectedService ? formatCurrency(selectedService.price) : ''}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="ml-4">
                                <div 
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center
                                    ${isSelected ? 'border-gray-800 bg-gray-800' : 'border-gray-300'}`}
                                  onClick={() => setSelectedStaff(person)}
                                >
                                  {isSelected && (
                                    <div className="w-3 h-3 rounded-full bg-white"></div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <div className="mb-2">
                                <span className="text-sm text-gray-700 font-medium">
                                  Available times for {format(selectedCalendarDate, 'EEEE, MMMM d')}:
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getAvailableTimeSlotsForDate(person.id, selectedCalendarDate).map((time) => {
                                  const isTimeSelected = isSelected && selectedTime === time;
                                  return (
                                    <button
                                      key={time}
                                      className={`py-2 px-4 rounded-full text-sm font-medium transition-all
                                        ${isTimeSelected 
                                          ? 'bg-black text-white' 
                                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                      onClick={() => handleTimeSelection(person, time)}
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary at bottom */}
                {selectedStaff && selectedTime && (
                  <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-700">Selected: <span className="font-medium">{selectedService?.name}</span></p>
                        <p className="text-gray-700 mt-1">
                          {selectedStaff.name} · {selectedTime} · {format(selectedCalendarDate, 'MMMM d, yyyy')}
                        </p>
                        <p className="text-gray-900 font-medium mt-1">{selectedService ? formatCurrency(selectedService.price) : ''}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedService?.duration} min
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Client Information */}
            {currentStep === 3 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Information</h2>
                  <p className="text-gray-500">Tell us a bit about yourself</p>
                </div>
                
                <div className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-gray-800 focus:border-gray-800 block w-full pl-10 p-2.5"
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-gray-800 focus:border-gray-800 block w-full pl-10 p-2.5"
                        placeholder="Your phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">We'll send booking confirmation to this number</p>
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-gray-800 focus:border-gray-800 block w-full pl-10 p-2.5"
                        placeholder="Your email (optional)"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                        <MessageSquare className="h-5 w-5 text-gray-400" />
                      </div>
                      <textarea
                        rows={4}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-gray-800 focus:border-gray-800 block w-full pl-10 p-2.5"
                        placeholder="Any special requests or notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      ></textarea>
                    </div>
                  </div>

                  {/* Booking Summary */}
                  <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="font-medium">{selectedService?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Specialist:</span>
                        <span className="font-medium">{selectedStaff?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date & Time:</span>
                        <span className="font-medium">{formatDate(selectedDate)} at {selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium">{selectedService ? formatCurrency(selectedService.price) : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Policy Notice */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md flex items-start">
                  <div className="flex-shrink-0 mr-3 mt-0.5">
                    <Info className="h-5 w-5 text-gray-500" />
                  </div>
                  <p className="text-sm text-gray-700">
                    By confirming this booking, you agree to the cancellation policy. Please arrive 10 minutes before your appointment time.
                  </p>
                </div>
              </div>
            )}

            {/* Confirmation Success (Step 4) */}
            {currentStep === 4 && (
              <div className="py-6">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Check className="h-10 w-10 text-gray-800" />
                  </div>
                </div>
                
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                  <p className="text-gray-600">Your appointment has been successfully booked</p>
                </div>
                
                <div className="rounded-md bg-gray-50 border border-gray-200 p-4 mb-6">
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-gray-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900">Appointment Details</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        We've sent the details to your phone number
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-8">
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">BUSINESS</h3>
                    <p className="text-gray-900 font-medium">{businessName}</p>
                  </div>
                </div>
                
                <div className="rounded-md bg-gray-50 border border-gray-200 p-4 mb-8">
                  <h3 className="font-medium text-gray-900 mb-2">
                    What's Next?
                  </h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li className="flex items-start">
                      <ChevronRight className="h-3.5 w-3.5 mt-1 mr-2 flex-shrink-0" />
                      <span>Please arrive 10 minutes before your appointment</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="h-3.5 w-3.5 mt-1 mr-2 flex-shrink-0" />
                      <span>If you need to cancel or reschedule, please call the business directly</span>
                    </li>
                  </ul>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <button 
                    className="w-full py-3 px-6 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700 transition-colors"
                    onClick={() => setCurrentStep(1)}
                  >
                    Book Another Appointment
                  </button>
                  
                  <button 
                    className="w-full py-3 px-6 bg-white text-gray-900 font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Return to Website
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="px-6 pb-6 md:px-8 md:pb-8 pt-4 flex justify-between border-t border-gray-100">
              {currentStep > 1 ? (
                <button 
                  onClick={prevStep}
                  className="px-5 py-2.5 flex items-center text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  Back
                </button>
              ) : (
                <div></div>
              )}
              
              <button 
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && !selectedService) || 
                  (currentStep === 2 && (!selectedStaff || !selectedTime)) ||
                  (currentStep === 3 && isSubmitting)
                }
                className="px-6 py-2.5 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === 3 ? (
                  isSubmitting ? 'Saving...' : 'Confirm Booking'
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Footer for final step */}
          {currentStep === 4 && (
            <div className="px-6 pb-6 md:px-8 md:pb-8 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
              Thank you for booking with us!
            </div>
          )}
        </div>
        
        {/* Footer summary on step 2 */}
        {currentStep === 2 && selectedStaff && selectedTime && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:hidden">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{selectedService?.name}</p>
                  <p className="text-sm text-gray-500">{selectedStaff.name}, {selectedTime}, {format(selectedCalendarDate, 'MMM d')}</p>
                </div>
                <button 
                  onClick={nextStep}
                  className="px-6 py-2.5 bg-black text-white font-medium rounded-md transition-colors"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="px-6 pb-4 text-red-600 text-sm">
            {submitError}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedBookingForm;