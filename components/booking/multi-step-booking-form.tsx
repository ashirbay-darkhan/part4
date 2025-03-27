'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, addMinutes, isAfter } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
  Info,
  AlertCircle
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Service, BusinessUser } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

// Define steps
type BookingStep = 'service' | 'datetime' | 'info' | 'review';

// Form schema
const bookingFormSchema = z.object({
  serviceId: z.string({
    required_error: "Please select a service",
  }),
  staffId: z.string({
    required_error: "Please select a staff member",
  }),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string({
    required_error: "Please select a time",
  }),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number",
  }),
  email: z.string().email({
    message: "Please enter a valid email",
  }).optional().or(z.literal('')),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// Available time slots - we'll filter these based on availability
const BASE_TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
];

interface MultiStepBookingFormProps {
  businessId: string;
  businessName: string;
  services: Service[];
  staff: BusinessUser[];
}

export default function MultiStepBookingForm({ 
  businessId, 
  businessName, 
  services,
  staff 
}: MultiStepBookingFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<BusinessUser | null>(null);
  const [availableStaff, setAvailableStaff] = useState<BusinessUser[]>(staff);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(BASE_TIME_SLOTS);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  
  // Initialize form
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceId: "",
      staffId: "",
      name: "",
      phone: "",
      email: "",
      notes: "",
    },
    mode: "onChange"
  });

  const watchedDate = form.watch('date');
  const watchedServiceId = form.watch('serviceId');
  const watchedStaffId = form.watch('staffId');
  
  // Step progress
  const steps: BookingStep[] = ['service', 'datetime', 'info', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  
  // Handle service selection
  useEffect(() => {
    if (watchedServiceId) {
      const service = services.find(s => s.id === watchedServiceId);
      setSelectedService(service || null);
      
      // Filter staff that can perform this service
      const filteredStaff = staff.filter(staffMember => 
        !staffMember.serviceIds || 
        staffMember.serviceIds.includes(watchedServiceId)
      );
      setAvailableStaff(filteredStaff);
      
      // Reset staff selection if current staff can't perform this service
      const currentStaffId = form.getValues("staffId");
      if (currentStaffId) {
        const staffCanPerformService = filteredStaff.some(s => s.id === currentStaffId);
        if (!staffCanPerformService) {
          form.setValue("staffId", "");
          setSelectedStaff(null);
        }
      }
    }
  }, [watchedServiceId, services, staff, form]);
  
  // Handle staff selection
  useEffect(() => {
    if (watchedStaffId) {
      const staffMember = staff.find(s => s.id === watchedStaffId);
      setSelectedStaff(staffMember || null);
    } else {
      setSelectedStaff(null);
    }
  }, [watchedStaffId, staff]);
  
  // Load existing appointments when date & staff change
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!watchedDate || !watchedStaffId || !selectedService) return;
      
      setIsLoadingTimeSlots(true);
      try {
        const formattedDate = format(watchedDate, 'yyyy-MM-dd');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(
          `${API_URL}/appointments?date=${formattedDate}&employeeId=${watchedStaffId}&businessId=${businessId}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        const appointments = await response.json();
        setExistingAppointments(appointments);
        
        // Filter available time slots
        const bookedSlots = new Set(appointments.map((apt: any) => apt.startTime));
        
        // Also consider the service duration to block out slots that would overlap
        const blockedTimeSlots = new Set<string>();
        
        appointments.forEach((apt: any) => {
          // Get the start and end times
          const [startHour, startMinute] = apt.startTime.split(':').map(Number);
          const [endHour, endMinute] = apt.endTime.split(':').map(Number);
          
          // Calculate start and end in minutes since midnight
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          
          // Block all slots that would overlap with this appointment
          BASE_TIME_SLOTS.forEach(slot => {
            const [slotHour, slotMinute] = slot.split(':').map(Number);
            const slotMinutes = slotHour * 60 + slotMinute;
            
            // Check if this slot would start during an existing appointment
            if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
              blockedTimeSlots.add(slot);
            }
            
            // Check if an appointment starting at this slot would overlap with existing
            const slotEndMinutes = slotMinutes + selectedService.duration;
            if (slotMinutes < startMinutes && slotEndMinutes > startMinutes) {
              blockedTimeSlots.add(slot);
            }
          });
        });
        
        // Filter out slots that are blocked
        const availableSlots = BASE_TIME_SLOTS.filter(slot => !blockedTimeSlots.has(slot));
        
        // Also filter out past time slots if the date is today
        const today = new Date();
        const isToday = format(today, 'yyyy-MM-dd') === formattedDate;
        
        if (isToday) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          const filteredSlots = availableSlots.filter(slot => {
            const [hour, minute] = slot.split(':').map(Number);
            return (hour > currentHour) || (hour === currentHour && minute > currentMinute + 30); // Add buffer
          });
          
          setAvailableTimeSlots(filteredSlots);
        } else {
          setAvailableTimeSlots(availableSlots);
        }
        
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Could not load available times. Please try again.');
        setAvailableTimeSlots(BASE_TIME_SLOTS);
      } finally {
        setIsLoadingTimeSlots(false);
      }
    };
    
    fetchAppointments();
  }, [watchedDate, watchedStaffId, selectedService, businessId]);
  
  // Navigate to next step
  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      window.scrollTo(0, 0);
    }
  };
  
  // Navigate to previous step
  const prevStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      window.scrollTo(0, 0);
    }
  };
  
  // Check if current step is valid
  const isStepValid = () => {
    switch (currentStep) {
      case 'service':
        return !!form.getValues('serviceId');
      case 'datetime':
        return !!form.getValues('staffId') && !!form.getValues('date') && !!form.getValues('time');
      case 'info':
        return !!form.getValues('name') && !!form.getValues('phone');
      case 'review':
        return true;
      default:
        return false;
    }
  };
  
  // Get end time based on start time and service duration
  const getEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = addMinutes(startDate, duration);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  // Handle form submission
  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Get selected service for duration and price
      const service = services.find(s => s.id === data.serviceId);
      if (!service) {
        toast.error("Selected service not found");
        return;
      }
      
      // Calculate end time
      const endTime = getEndTime(data.time, service.duration);
      
      // Format date as ISO string date part (YYYY-MM-DD)
      const formattedDate = format(data.date, 'yyyy-MM-dd');
      
      // Create appointment object
      const appointment = {
        date: formattedDate,
        startTime: data.time,
        endTime: endTime,
        duration: service.duration,
        serviceId: data.serviceId,
        employeeId: data.staffId,
        status: "Pending",
        price: service.price,
        businessId: businessId,
        comment: data.notes || ''
      };
      
      // First, create or find the client
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Check if client exists by phone number
      const clientResponse = await fetch(`${API_URL}/clients?phone=${encodeURIComponent(data.phone)}&businessId=${businessId}`);
      const existingClients = await clientResponse.json();
      
      let clientId;
      
      if (existingClients.length > 0) {
        // Use existing client
        clientId = existingClients[0].id;
        
        // Update client information if needed
        if (existingClients[0].name !== data.name || 
            (data.email && existingClients[0].email !== data.email)) {
          await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: data.name,
              email: data.email || existingClients[0].email,
              lastVisit: new Date().toISOString()
            }),
          });
        }
      } else {
        // Create new client
        const newClientResponse = await fetch(`${API_URL}/clients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            phone: data.phone,
            email: data.email || "",
            notes: data.notes || "",
            businessId: businessId,
            totalVisits: 0,
            lastVisit: new Date().toISOString()
          }),
        });
        
        if (!newClientResponse.ok) {
          throw new Error('Failed to create client');
        }
        
        const newClient = await newClientResponse.json();
        clientId = newClient.id;
      }
      
      // Now create the appointment
      const appointmentResponse = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...appointment,
          clientId
        }),
      });
      
      if (!appointmentResponse.ok) {
        throw new Error('Failed to create appointment');
      }
      
      // Show success message and redirect
      toast.success('Appointment booked successfully!');
      
      // Redirect to confirmation page
      router.push(`/book/${businessId}/confirmation`);
      
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          <div className={cn("font-medium", currentStep === 'service' ? "text-blue-600" : "")}>Service</div>
          <div className={cn("font-medium", currentStep === 'datetime' ? "text-blue-600" : "")}>Date & Time</div>
          <div className={cn("font-medium", currentStep === 'info' ? "text-blue-600" : "")}>Your Info</div>
          <div className={cn("font-medium", currentStep === 'review' ? "text-blue-600" : "")}>Review</div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Service Selection */}
          {currentStep === 'service' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Choose a Service</h2>
                <p className="text-gray-500">Select the service you'd like to book</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {services.map((service) => (
                  <Card 
                    key={service.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-all border-2",
                      watchedServiceId === service.id ? "border-blue-500 bg-blue-50" : "border-transparent"
                    )}
                    onClick={() => form.setValue('serviceId', service.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <div className="font-medium text-green-700">{formatCurrency(service.price)}</div>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{service.duration} min</span>
                      </div>
                      
                      {service.description && (
                        <p className="text-gray-600 text-sm mt-2">{service.description}</p>
                      )}
                      
                      {watchedServiceId === service.id && (
                        <div className="flex justify-end mt-2">
                          <Check className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-end mt-6">
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid()}
                  className="w-full sm:w-auto"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 2: Staff, Date & Time Selection */}
          {currentStep === 'datetime' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Choose a Specialist</h2>
                <p className="text-gray-500">Select who you'd like to book with</p>
              </div>
              
              {/* Back button */}
              <button 
                onClick={() => setCurrentStep('service')}
                className="inline-flex items-center text-gray-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span>Back to services</span>
              </button>

              {/* Date Selection - moved before staff selection */}
              <div>
                <h3 className="text-lg font-medium mb-3">Select Date</h3>
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="border rounded-md p-4">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            // Reset time selection when date changes
                            form.setValue('time', '');
                          }}
                          disabled={(date) => 
                            date < new Date(new Date().setHours(0, 0, 0, 0)) || // No past dates
                            date.getDay() === 0 || // No Sundays
                            date.getDay() === 6 // No Saturdays
                          }
                          initialFocus
                          className="mx-auto"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Staff Selection - after date selection */}
              <div>
                <h3 className="text-lg font-medium mb-3">Choose a Specialist</h3>
                
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  {availableStaff.map((staffMember) => {
                    const isSelected = watchedStaffId === staffMember.id;
                    
                    return (
                      <Card 
                        key={staffMember.id}
                        className={cn(
                          "border-2",
                          isSelected ? "border-blue-500" : "border-gray-200"
                        )}
                      >
                        {/* Staff Info */}
                        <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => form.setValue('staffId', staffMember.id)}
                        >
                          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                            {staffMember.avatar ? (
                              <img 
                                src={staffMember.avatar} 
                                alt={staffMember.name}
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <span className="text-lg font-medium">{staffMember.name.charAt(0)}</span>
                            )}
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-lg">{staffMember.name}</h4>
                            <p className="text-gray-500">staff</p>
                            <p className="font-medium text-gray-800 mt-1">
                              KZT {selectedService?.price.toLocaleString() || 0}
                            </p>
                          </div>
                          
                          <div className="ml-auto">
                            <div 
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                                ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}
                            >
                              {isSelected && <Check className="h-4 w-4 text-white" />}
                            </div>
                          </div>
                        </div>
                        
                        {/* Time Slots (only show for selected staff) */}
                        {isSelected && watchedDate && (
                          <div className="border-t px-4 py-3 bg-gray-50">
                            <p className="text-sm text-gray-700 mb-3">
                              <CalendarIcon className="inline-block w-4 h-4 mr-1" />
                              <span>Available times for {format(watchedDate, 'EEEE, MMMM d')}:</span>
                            </p>
                            
                            <FormField
                              control={form.control}
                              name="time"
                              render={({ field }) => (
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                  {isLoadingTimeSlots ? (
                                    // Loading state
                                    Array(8).fill(0).map((_, i) => (
                                      <Skeleton key={i} className="h-10 w-full" />
                                    ))
                                  ) : availableTimeSlots.length > 0 ? (
                                    // Show time slots
                                    availableTimeSlots.map((time) => (
                                      <Button
                                        key={time}
                                        type="button"
                                        variant={field.value === time ? "default" : "outline"}
                                        className={field.value === time ? "bg-blue-600" : ""}
                                        onClick={() => field.onChange(time)}
                                      >
                                        {time}
                                      </Button>
                                    ))
                                  ) : (
                                    // No available slots
                                    <div className="col-span-full py-2 text-center">
                                      <p className="text-gray-500">No available times on this date</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid()}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: Personal Information */}
          {currentStep === 'info' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Your Information</h2>
                <p className="text-gray-500">Tell us a bit about yourself</p>
              </div>
              
              <Card>
                <CardContent className="p-6 space-y-4">
                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <div className="relative">
                          <div className="absolute left-3 top-2.5 text-gray-400">
                            <User className="h-4 w-4" />
                          </div>
                          <FormControl>
                            <Input
                              placeholder="Your name"
                              className="pl-9"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <div className="relative">
                          <div className="absolute left-3 top-2.5 text-gray-400">
                            <Phone className="h-4 w-4" />
                          </div>
                          <FormControl>
                            <Input
                              placeholder="Your phone number"
                              className="pl-9"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>
                          We'll send booking confirmation to this number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <div className="relative">
                          <div className="absolute left-3 top-2.5 text-gray-400">
                            <Mail className="h-4 w-4" />
                          </div>
                          <FormControl>
                            <Input
                              placeholder="Your email"
                              className="pl-9"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <div className="relative">
                          <div className="absolute left-3 top-2.5 text-gray-400">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <FormControl>
                            <Textarea
                              placeholder="Any special requests or notes"
                              className="pl-9 min-h-24"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid()}
                >
                  Review Booking
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 4: Review & Confirm */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Review & Confirm</h2>
                <p className="text-gray-500">Please review your booking details before confirming</p>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Service Details</h3>
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setCurrentStep('service')}
                          className="h-auto p-0"
                        >
                          Edit
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Service</p>
                          <p className="font-medium">{selectedService?.name}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Price</p>
                          <p className="font-medium text-green-600">
                            {selectedService ? formatCurrency(selectedService.price) : ''}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Duration</p>
                          <p className="font-medium">{selectedService?.duration} minutes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-b pb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Appointment Details</h3>
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setCurrentStep('datetime')}
                          className="h-auto p-0"
                        >
                          Edit
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Staff</p>
                          <p className="font-medium">{selectedStaff?.name}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p className="font-medium">
                            {watchedDate ? format(watchedDate, 'EEEE, MMMM d, yyyy') : ''}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Time</p>
                          <p className="font-medium">
                            {form.getValues('time')}
                            {selectedService && form.getValues('time') && (
                              <> - {getEndTime(form.getValues('time'), selectedService.duration)}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Your Information</h3>
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setCurrentStep('info')}
                          className="h-auto p-0"
                        >
                          Edit
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-medium">{form.getValues('name')}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">{form.getValues('phone')}</p>
                        </div>
                        
                        {form.getValues('email') && (
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{form.getValues('email')}</p>
                          </div>
                        )}
                        
                        {form.getValues('notes') && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-500">Notes</p>
                            <p className="font-medium">{form.getValues('notes')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-start">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 text-sm">
                    By confirming this booking, you agree to the cancellation policy. 
                    Please arrive 10 minutes before your appointment time.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8"
                >
                  {isSubmitting ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}