'use client';

import { useState, useEffect } from 'react';
import { BusinessUser, WorkingHours } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { X, ChevronLeft, ChevronRight, PlusCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import React from 'react';

interface StaffScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: BusinessUser;
  onSave: (staffId: string, workingHours: WorkingHours[]) => Promise<void>;
}

// Custom DialogContent without the close button
const DialogContentNoClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 border rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContentNoClose.displayName = "DialogContentNoClose";

export function StaffScheduleModal({ isOpen, onClose, staff, onSave }: StaffScheduleModalProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<WorkingHours | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [selectedDaysForBatch, setSelectedDaysForBatch] = useState<number[]>([]);
  
  // Initialize working hours from staff data
  useEffect(() => {
    if (staff && staff.workingHours) {
      setWorkingHours([...staff.workingHours]);
    } else {
      // Default working hours if none are set
      const defaultHours: WorkingHours[] = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i + 1,
        isWorking: i < 5, // Monday to Friday by default
        startTime: '09:00',
        endTime: '17:00'
      }));
      setWorkingHours(defaultHours);
    }
    
    // Set initial selected day to current day of week
    const today = new Date();
    const dayOfWeek = getMondayBasedDayOfWeek(today);
    const dayConfig = staff?.workingHours?.find(h => h.dayOfWeek === dayOfWeek);
    
    if (dayConfig) {
      setSelectedDay(dayConfig);
      setSelectedDayOfWeek(dayOfWeek);
    }
  }, [staff]);
  
  // Get day of week number that's Monday-based (1-7 where 1 is Monday, 7 is Sunday)
  const getMondayBasedDayOfWeek = (date: Date): number => {
    const sunday = date.getDay();
    return sunday === 0 ? 7 : sunday;
  };

  // Get Monday-based day of week (0-6 where 0 is Monday, 6 is Sunday)
  const getMondayBasedDayIndex = (date: Date): number => {
    const sunday = date.getDay();
    return sunday === 0 ? 6 : sunday - 1;
  };
  
  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0-6, 0 is Monday)
    const firstDayOfWeek = getMondayBasedDayIndex(firstDay);
    
    // Generate days array
    const days = [];
    
    // Add previous month days to fill first week
    if (firstDayOfWeek > 0) {
      const prevMonth = new Date(year, month, 0);
      const prevMonthDays = prevMonth.getDate();
      
      for (let i = prevMonthDays - firstDayOfWeek + 1; i <= prevMonthDays; i++) {
        days.push({
          date: new Date(year, month - 1, i),
          isPrevMonth: true
        });
      }
    }
    
    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isPrevMonth: false,
        isNextMonth: false
      });
    }
    
    // Add next month days to complete last week
    const daysFromNextMonth = 7 - (days.length % 7 || 7);
    if (daysFromNextMonth < 7) {
      for (let i = 1; i <= daysFromNextMonth; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isNextMonth: true
        });
      }
    }
    
    return days;
  };
  
  const calendarDays = generateCalendarDays();
  
  // Handle month navigation
  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dayOfWeek = getMondayBasedDayOfWeek(date);
    const dayConfig = workingHours.find(h => h.dayOfWeek === dayOfWeek);
    
    if (dayConfig) {
      setSelectedDay(dayConfig);
      setSelectedDayOfWeek(dayOfWeek);
    }
  };
  
  // Handle day of week selection from default schedule
  const handleDayOfWeekSelect = (dayOfWeek: number) => {
    const dayConfig = workingHours.find(h => h.dayOfWeek === dayOfWeek);
    if (dayConfig) {
      setSelectedDay(dayConfig);
      setSelectedDayOfWeek(dayOfWeek);
    }
  };

  // Update working hours for a specific day
  const updateDayHours = (dayOfWeek: number, updates: Partial<WorkingHours>) => {
    setWorkingHours(prev => 
      prev.map(day => 
        day.dayOfWeek === dayOfWeek 
          ? { ...day, ...updates }
          : day
      )
    );
  };

  // Toggle day working status
  const toggleDayWorking = (working: boolean) => {
    if (selectedDayOfWeek === null) return;
    
    // Update the working hours state
    setWorkingHours(prev => 
      prev.map(day => 
        day.dayOfWeek === selectedDayOfWeek 
          ? { ...day, isWorking: working }
          : day
      )
    );
    
    // Update the selected day to reflect the change immediately
    if (selectedDay) {
      setSelectedDay({
        ...selectedDay,
        isWorking: working
      });
    }
  };

  // Toggle break time
  const toggleBreakTime = () => {
    if (!selectedDay || selectedDayOfWeek === null) return;
    
    setWorkingHours(prev => 
      prev.map(day => {
        if (day.dayOfWeek === selectedDayOfWeek) {
          if (day.breakStart) {
            // Remove break
            const { breakStart, breakEnd, ...rest } = day;
            return rest;
          } else {
            // Add default break
            return {
              ...day,
              breakStart: '12:00',
              breakEnd: '13:00'
            };
          }
        }
        return day;
      })
    );
  };
  
  // Toggle batch day selection
  const toggleBatchDay = (dayOfWeek: number) => {
    setSelectedDaysForBatch(prev => {
      if (prev.includes(dayOfWeek)) {
        return prev.filter(d => d !== dayOfWeek);
      } else {
        return [...prev, dayOfWeek];
      }
    });
  };
  
  // Apply settings to multiple days
  const applyToBatchDays = () => {
    if (!selectedDay || !selectedDaysForBatch.length) return;
    
    setWorkingHours(prev => 
      prev.map(day => {
        if (selectedDaysForBatch.includes(day.dayOfWeek)) {
          return {
            ...day,
            isWorking: selectedDay.isWorking,
            startTime: selectedDay.startTime,
            endTime: selectedDay.endTime,
            breakStart: selectedDay.breakStart,
            breakEnd: selectedDay.breakEnd
          };
        }
        return day;
      })
    );
    
    toast({
      title: "Success",
      description: `Applied schedule to ${selectedDaysForBatch.length} days`,
    });
  };

  // Handle save
  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Ensure all working hours are properly formatted
      const formattedHours = workingHours.map(day => ({
        ...day,
        startTime: day.startTime || '09:00',
        endTime: day.endTime || '17:00',
        // Make sure break times are included only when needed
        ...(day.breakStart && day.breakEnd ? 
          { breakStart: day.breakStart, breakEnd: day.breakEnd } : {})
      }));
      
      console.log('Saving hours:', formattedHours);
      await onSave(staff.id, formattedHours);
      
      toast({
        title: "Schedule Saved",
        description: "Your schedule changes have been saved successfully.",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get day name from day of week number (where 1 is Monday)
  const getDayName = (dayOfWeek: number): string => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[(dayOfWeek - 1) % 7];
  };
  
  // Get short day name (where 1 is Monday)
  const getShortDayName = (dayOfWeek: number): string => {
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return days[(dayOfWeek - 1) % 7];
  };
  
  // Format time for display (e.g., "08:00")
  const formatTime = (time: string): string => {
    return time || '';
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContentNoClose className="min-h-[95vh] max-w-[80vw] min-w-[80vw] p-0 overflow-hidden">
        <DialogHeader className="p-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg text-blue-800">
              {staff?.name}'s Schedule
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                {staff?.name?.split(' ').map(part => part[0]).join('')}
              </div>
            </DialogTitle>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row">
          {/* Left Side - Calendar */}
          <div className="w-full md:w-1/2 p-4 border-r">
            <h3 className="font-medium text-blue-800 mb-2 text-sm">Select Working Days</h3>
            
            {/* Month navigation */}
            <div className="flex justify-between items-center mb-2">
              <button onClick={goToPrevMonth} className="text-gray-600 hover:text-gray-900">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-base font-medium">{format(currentMonth, 'MMMM yyyy')}</h3>
              <button onClick={goToNextMonth} className="text-gray-600 hover:text-gray-900">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            {/* Calendar */}
            <div className="mb-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 text-center mb-1">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day, i) => (
                  <div key={day} className="text-xs font-medium text-gray-600">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const date = day.date;
                  const dayOfWeek = getMondayBasedDayOfWeek(date);
                  const dayConfig = workingHours.find(h => h.dayOfWeek === dayOfWeek);
                  const isWorkingDay = dayConfig?.isWorking || false;
                  const isSelected = selectedDayOfWeek === dayOfWeek;
                  
                  let dayClass = "flex items-center justify-center w-8 h-8 rounded-full text-sm cursor-pointer ";
                  
                  if (day.isPrevMonth || day.isNextMonth) {
                    dayClass += "text-gray-400 ";
                  }
                  
                  if (isSelected) {
                    dayClass += "bg-blue-600 text-white ";
                  } else if (isWorkingDay) {
                    dayClass += "border border-blue-400 bg-blue-50 text-blue-800 ";
                  } else {
                    dayClass += "border border-gray-200 hover:bg-gray-100 ";
                  }
                  
                  return (
                    <div 
                      key={i}
                      onClick={() => handleDateSelect(date)}
                      className="flex justify-center items-center"
                    >
                      <div className={dayClass}>
                        {format(date, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Default Schedule */}
            <h3 className="font-medium text-blue-800 mb-2 text-sm">Default Schedule</h3>
            <div className="space-y-1 overflow-y-auto max-h-[180px] pr-1">
              {workingHours.map((day) => (
                <div 
                  key={day.dayOfWeek} 
                  className={`
                    p-2 rounded-md border cursor-pointer transition-colors text-sm
                    ${selectedDayOfWeek === day.dayOfWeek ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'} 
                  `}
                  onClick={() => handleDayOfWeekSelect(day.dayOfWeek)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">{getDayName(day.dayOfWeek)}</span>
                    {day.isWorking ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {formatTime(day.startTime)} - {formatTime(day.endTime)}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Day Off
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Side - Selected Day Settings */}
          <div className="w-full md:w-1/2 p-4">
            {selectedDay ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">{getDayName(selectedDayOfWeek || 1)}</h2>
                  
                  <div 
                    className={`flex items-center gap-2 mb-4 p-3 border rounded-md cursor-pointer
                      ${selectedDay.isWorking 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'} 
                      hover:bg-opacity-80 transition-colors`}
                    onClick={() => toggleDayWorking(!selectedDay.isWorking)}
                  >
                    <div className="relative w-11 h-6 flex-shrink-0">
                      <div 
                        className={`absolute inset-0 rounded-full transition-colors duration-200 ease-in-out ${
                          selectedDay.isWorking ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      />
                      <div 
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                          selectedDay.isWorking ? 'translate-x-5' : ''
                        }`}
                      />
                    </div>
                    <label className="text-sm font-medium cursor-pointer select-none flex-1 flex items-center justify-between">
                      <span>Working Day</span>
                      {selectedDay.isWorking ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Active</span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </label>
                  </div>
                </div>
                
                {selectedDay.isWorking && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Start Time</label>
                        <div className="relative">
                          <Input 
                            type="time"
                            value={selectedDay.startTime}
                            onChange={(e) => {
                              // Update selected day immediately for UI feedback
                              setSelectedDay({
                                ...selectedDay,
                                startTime: e.target.value
                              });
                              // Then update the workingHours state
                              updateDayHours(selectedDayOfWeek || 1, { startTime: e.target.value });
                            }}
                            className="h-8 text-sm pr-8 [&::-webkit-calendar-picker-indicator]:hidden"
                          />
                          <button 
                            className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.preventDefault();
                              // Find the input element and open its time picker
                              const input = e.currentTarget.previousSibling as HTMLInputElement;
                              input.showPicker();
                            }}
                            type="button"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">End Time</label>
                        <div className="relative">
                          <Input 
                            type="time"
                            value={selectedDay.endTime}
                            onChange={(e) => {
                              // Update selected day immediately for UI feedback
                              setSelectedDay({
                                ...selectedDay,
                                endTime: e.target.value
                              });
                              // Then update the workingHours state
                              updateDayHours(selectedDayOfWeek || 1, { endTime: e.target.value });
                            }}
                            className="h-8 text-sm pr-8 [&::-webkit-calendar-picker-indicator]:hidden"
                          />
                          <button 
                            className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.preventDefault();
                              // Find the input element and open its time picker
                              const input = e.currentTarget.previousSibling as HTMLInputElement;
                              input.showPicker();
                            }}
                            type="button"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {selectedDay.breakStart ? (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium">Break Time</label>
                          <button 
                            onClick={toggleBreakTime}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">Start</label>
                            <div className="relative">
                              <Input 
                                type="time"
                                value={selectedDay.breakStart}
                                onChange={(e) => {
                                  // Update selected day immediately for UI feedback
                                  setSelectedDay({
                                    ...selectedDay,
                                    breakStart: e.target.value
                                  });
                                  // Then update the workingHours state
                                  updateDayHours(selectedDayOfWeek || 1, { breakStart: e.target.value });
                                }}
                                className="h-8 text-sm pr-8 [&::-webkit-calendar-picker-indicator]:hidden"
                              />
                              <button 
                                className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Find the input element and open its time picker
                                  const input = e.currentTarget.previousSibling as HTMLInputElement;
                                  input.showPicker();
                                }}
                                type="button"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">End</label>
                            <div className="relative">
                              <Input 
                                type="time"
                                value={selectedDay.breakEnd}
                                onChange={(e) => {
                                  // Update selected day immediately for UI feedback
                                  setSelectedDay({
                                    ...selectedDay,
                                    breakEnd: e.target.value
                                  });
                                  // Then update the workingHours state
                                  updateDayHours(selectedDayOfWeek || 1, { breakEnd: e.target.value });
                                }}
                                className="h-8 text-sm pr-8 [&::-webkit-calendar-picker-indicator]:hidden"
                              />
                              <button 
                                className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Find the input element and open its time picker
                                  const input = e.currentTarget.previousSibling as HTMLInputElement;
                                  input.showPicker();
                                }}
                                type="button"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={toggleBreakTime}
                        className="text-blue-600 hover:text-blue-800 text-xs mt-2 flex items-center"
                      >
                        <PlusCircle className="h-3 w-3 mr-1" />
                        Add a break
                      </button>
                    )}
                    
                    <div className="mt-4 pt-3 border-t">
                      <h3 className="text-xs font-medium mb-2">Apply to multiple days</h3>
                      <div className="grid grid-cols-7 gap-1 mb-3">
                        {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                          const isSelected = selectedDaysForBatch.includes(dayOfWeek);
                          return (
                            <button
                              key={dayOfWeek}
                              onClick={() => toggleBatchDay(dayOfWeek)}
                              className={`
                                rounded-full h-7 w-7 flex items-center justify-center text-xs font-medium
                                ${isSelected 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                              `}
                            >
                              {getShortDayName(dayOfWeek)}
                            </button>
                          );
                        })}
                      </div>
                      
                      <Button
                        onClick={applyToBatchDays}
                        disabled={selectedDaysForBatch.length === 0}
                        className="w-full text-xs h-8"
                        variant="outline"
                      >
                        Apply to selected days ({selectedDaysForBatch.length})
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select a day to view and edit its schedule
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="p-3 pt-3 border-t flex justify-end">
          <Button variant="outline" onClick={onClose} className="mr-2 h-8 text-sm">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="w-20 h-8 text-sm">
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContentNoClose>
    </Dialog>
  );
}
