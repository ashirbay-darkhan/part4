/**
 * Date utilities for the application
 */

/**
 * Get today's appointments from an array of appointments
 * @param appointments Array of appointments to filter
 * @returns Appointments that are scheduled for today
 */
export function getTodayAppointments<T extends { date: string }>(appointments: T[]): T[] {
  const today = new Date();
  const todayString = today.toDateString();
  
  return appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate.toDateString() === todayString;
  });
}

/**
 * Format a date with the specified options
 * @param date Date to format
 * @param options Intl.DateTimeFormatOptions to use for formatting
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time from 24-hour format (HH:MM) to AM/PM format
 * @param time Time string in 24-hour format (e.g., "14:30")
 * @returns Formatted time string in AM/PM format (e.g., "2:30 PM")
 */
export function formatTime(time: string): string {
  // Parse hours and minutes
  const [hours, minutes] = time.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get a date range description (e.g., "Mar 1 - Mar 7, 2025")
 * @param startDate Start date
 * @param endDate End date
 * @returns Formatted date range string
 */
export function getDateRangeDescription(startDate: Date, endDate: Date): string {
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  
  const startFormat: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  };
  
  const endFormat: Intl.DateTimeFormatOptions = {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric'
  };
  
  const startStr = formatDate(startDate, startFormat);
  const endStr = formatDate(endDate, endFormat);
  
  return `${startStr} - ${endStr}`;
}

/**
 * Check if a date is in the past
 * @param date Date to check
 * @returns True if the date is in the past
 */
export function isDateInPast(date: Date | string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today
  
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  checkDate.setHours(0, 0, 0, 0); // Set to start of the check date
  
  return checkDate < today;
}

/**
 * Check if a date is today
 * @param date Date to check
 * @returns True if the date is today
 */
export function isToday(date: Date | string): boolean {
  const today = new Date();
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  
  return today.toDateString() === checkDate.toDateString();
}

/**
 * Calculate the time difference between two time strings in minutes
 * @param startTime Start time in HH:MM format
 * @param endTime End time in HH:MM format
 * @returns Duration in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Get next available time slot based on business hours and booked appointments
 * @param businessHours Business hours in 24-hour format (e.g., { start: 9, end: 17 })
 * @param bookedSlots Array of booked time slots { startTime: string, endTime: string }
 * @param duration Desired appointment duration in minutes
 * @param date Date to find availability for
 * @returns Next available time slot as { startTime: string, endTime: string } or null if no slots available
 */
export function getNextAvailableTimeSlot(
  businessHours: { start: number; end: number },
  bookedSlots: Array<{ startTime: string; endTime: string }>,
  duration: number,
  date: Date = new Date()
): { startTime: string; endTime: string } | null {
  // Check if the date is in the past
  if (isDateInPast(date)) {
    return null;
  }
  
  // Generate all possible time slots with 30 minute intervals
  const possibleSlots = [];
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Skip times in the past if the date is today
      if (isToday(date)) {
        const now = new Date();
        if (hour < now.getHours() || (hour === now.getHours() && minute < now.getMinutes())) {
          continue;
        }
      }
      
      const startMinutes = hour * 60 + minute;
      const endMinutes = startMinutes + duration;
      
      // Check if the appointment fits within business hours
      if (endMinutes <= businessHours.end * 60) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endHour = Math.floor(endMinutes / 60);
        const endMinute = endMinutes % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        possibleSlots.push({ startTime, endTime });
      }
    }
  }
  
  // Check each possible slot against booked slots
  for (const slot of possibleSlots) {
    let isAvailable = true;
    
    for (const bookedSlot of bookedSlots) {
      // Convert times to minutes for easier comparison
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      const bookedStart = timeToMinutes(bookedSlot.startTime);
      const bookedEnd = timeToMinutes(bookedSlot.endTime);
      
      // Check if there's an overlap
      if (
        (slotStart >= bookedStart && slotStart < bookedEnd) || // Slot starts during booked slot
        (slotEnd > bookedStart && slotEnd <= bookedEnd) || // Slot ends during booked slot
        (slotStart <= bookedStart && slotEnd >= bookedEnd) // Slot encompasses booked slot
      ) {
        isAvailable = false;
        break;
      }
    }
    
    if (isAvailable) {
      return slot;
    }
  }
  
  return null;
}

/**
 * Convert time string to minutes since start of day
 * @param time Time string in HH:MM format
 * @returns Minutes since start of day
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
} 