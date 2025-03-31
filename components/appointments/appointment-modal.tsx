'use client';

import { useState, useEffect } from 'react';
import { format, addMinutes, parse } from 'date-fns';
import { Calendar, Clock, Pencil, X, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { AppointmentStatus, Appointment, Service, Client } from '@/types';
import { getStatusDetails, updateAppointment } from '@/lib/api';
import { toast } from 'sonner';
import { TimePickerDemo } from '@/components/ui/time-picker';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdate: (updatedAppointment: Appointment) => void;
  services: Service[];
  clients: Client[];
}

export function AppointmentModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
  services,
  clients,
}: AppointmentModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localAppointment, setLocalAppointment] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60); // Default to 60 minutes
  const [price, setPrice] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus>('Pending');

  useEffect(() => {
    if (appointment) {
      setLocalAppointment(appointment);
      setNotes(appointment.comment || '');
      
      // Parse the date string to Date object
      if (appointment.date) {
        setDate(new Date(appointment.date));
      }
      
      // Set the start time
      setStartTime(appointment.startTime || '');
      
      // Set duration
      setDuration(appointment.duration || 60);
      
      // Set price
      setPrice(appointment.price || 0);
      
      // Set status
      setSelectedStatus(appointment.status || 'Pending');
    }
  }, [appointment]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  // Get the client and service based on the appointment
  const client = clients.find(c => c.id === localAppointment?.clientId);
  const service = services.find(s => s.id === localAppointment?.serviceId);

  // Calculate end time based on start time and duration
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    if (!start) return '';
    
    try {
      const startDate = parse(start, 'HH:mm', new Date());
      const endDate = addMinutes(startDate, durationMinutes);
      return format(endDate, 'HH:mm');
    } catch (error) {
      console.error('Error calculating end time:', error);
      return '';
    }
  };

  // Handle time selection
  const handleTimeChange = (time: string) => {
    setStartTime(time);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!localAppointment || !date) return;
    
    setIsSaving(true);
    
    try {
      // Calculate the new end time
      const endTime = calculateEndTime(startTime, duration);
      
      // Format the date to YYYY-MM-DD
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Prepare the updated appointment data
      const updatedData = {
        ...localAppointment,
        date: formattedDate,
        startTime,
        endTime,
        duration,
        price,
        status: selectedStatus,
        comment: notes,
      };
      
      // Call the API to update the appointment
      const updatedAppointment = await updateAppointment(localAppointment.id, updatedData);
      
      toast.success('Appointment updated successfully');
      
      // Update the local state with the updated appointment
      setLocalAppointment(updatedAppointment);
      onUpdate(updatedAppointment);
      
      // Exit edit mode
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    } finally {
      setIsSaving(false);
    }
  };

  // Get status badge based on the status
  const getStatusBadge = (status: AppointmentStatus) => {
    let color;
    
    switch (status) {
      case 'Pending':
        color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        break;
      case 'Confirmed':
        color = 'bg-blue-100 text-blue-800 border-blue-200';
        break;
      case 'Arrived':
        color = 'bg-green-100 text-green-800 border-green-200';
        break;
      case 'Completed':
        color = 'bg-purple-100 text-purple-800 border-purple-200';
        break;
      case 'Cancelled':
        color = 'bg-red-100 text-red-800 border-red-200';
        break;
      case 'No-Show':
        color = 'bg-gray-100 text-gray-800 border-gray-200';
        break;
      default:
        color = 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
    return (
      <Badge variant="outline" className={`${color} border`}>
        {status}
      </Badge>
    );
  };

  if (!localAppointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Appointment Details</DialogTitle>
            {getStatusBadge(localAppointment.status || 'Pending')}
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage appointment information
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Service Information */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Service</div>
            <div className="font-medium flex items-center">
              {service?.name || 'Unknown service'}
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Client</div>
            <div className="font-medium">{client?.name || 'Unknown client'}</div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Date</div>
            {isEditing ? (
              <div className="flex flex-col space-y-1 w-full">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal w-full"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                {localAppointment.date
                  ? format(new Date(localAppointment.date), 'PPP')
                  : 'No date set'}
              </div>
            )}
          </div>

          {/* Time */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Time</div>
            {isEditing ? (
              <div className="flex flex-col space-y-1">
                <TimePickerDemo 
                  value={startTime}
                  onChange={handleTimeChange}
                />
              </div>
            ) : (
              <div className="font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                {localAppointment.startTime && localAppointment.endTime
                  ? `${localAppointment.startTime} - ${localAppointment.endTime}`
                  : 'No time set'}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Duration</div>
            {isEditing ? (
              <div className="flex flex-col space-y-1">
                <Select
                  value={duration.toString()}
                  onValueChange={value => setDuration(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="font-medium">
                {localAppointment.duration
                  ? `${localAppointment.duration} minutes`
                  : '60 minutes'}
              </div>
            )}
          </div>

          {/* Price */}
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Price</div>
            {isEditing ? (
              <div className="flex items-center space-x-1">
                <span className="text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={price.toString()}
                  onChange={e => setPrice(parseInt(e.target.value || '0'))}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="font-medium">
                ₹ {localAppointment.price ? localAppointment.price : '0'}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            {isEditing ? (
              <Select
                value={selectedStatus}
                onValueChange={value => setSelectedStatus(value as AppointmentStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Arrived">Arrived</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="No-Show">No-Show</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div>{getStatusBadge(localAppointment.status || 'Pending')}</div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm font-medium text-muted-foreground">Notes</div>
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this appointment..."
                className="w-full h-24"
              />
            ) : (
              <div className="text-sm max-h-24 overflow-y-auto bg-muted p-2 rounded-md">
                {localAppointment.comment || 'No notes added'}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
