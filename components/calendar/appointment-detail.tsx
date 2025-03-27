import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Copy,
  CreditCard,
  Phone,
  User,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  getClient, 
  getService, 
  updateAppointment, 
  updateAppointmentStatus,
  deleteAppointment,
  updatePaymentStatus
} from '@/lib/api';

import { Appointment, AppointmentStatus, Client, Service } from '@/types';

interface AppointmentDetailProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange?: () => Promise<void>;
  onUpdate?: () => Promise<void>;
}

export function AppointmentDetailView({ 
  appointment: initialAppointment,
  onClose, 
  onStatusChange,
  onUpdate
}: AppointmentDetailProps) {
  // State management
  const [appointment, setAppointment] = useState<Appointment>(initialAppointment);
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [status, setStatus] = useState<AppointmentStatus>(initialAppointment.status);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState(initialAppointment.comment || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [updatingStatus, setUpdatingStatus] = useState<AppointmentStatus | null>(null);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    date: initialAppointment.date,
    startTime: initialAppointment.startTime,
    endTime: initialAppointment.endTime,
    duration: calculateDuration(initialAppointment.startTime, initialAppointment.endTime),
    serviceId: initialAppointment.serviceId
  });

  // Available time slots
  const TIME_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00"
  ];

  // Calculate duration from start and end time
  function calculateDuration(startTime: string, endTime: string): string {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const start = new Date();
    start.setHours(startHour, startMinute, 0);
    
    const end = new Date();
    end.setHours(endHour, endMinute, 0);
    
    const durationMinutes = differenceInMinutes(end, start);
    return (durationMinutes / 60).toFixed(1);
  }

  // Fetch appointment details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch client and service data in parallel
        const [clientData, serviceData] = await Promise.all([
          getClient(initialAppointment.clientId),
          getService(initialAppointment.serviceId)
        ]);
        
        setClient(clientData);
        setService(serviceData);
        setComment(initialAppointment.comment || '');
        
        // Set payment status (in a real app, this would come from the API)
        setPaymentStatus('unpaid');
        
      } catch (error) {
        console.error('Error fetching appointment details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [initialAppointment]);

  // Handle status change
  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    try {
      setUpdatingStatus(newStatus);
      
      // Update local state immediately
      setStatus(newStatus);
      
      // Also update the appointment object to reflect the change in UI
      setAppointment(prev => ({
        ...prev,
        status: newStatus
      }));
      
      // Update in backend
      const updatedAppointment = await updateAppointmentStatus(appointment.id, newStatus);
      
      // If we got a response from the API, update our local state with it
      if (updatedAppointment) {
        setAppointment(updatedAppointment);
      }
      
      // Update parent components if callbacks are provided
      if (onStatusChange) {
        await onStatusChange();
      }
      
      if (onUpdate) {
        await onUpdate();
      }
      
    } catch (error) {
      console.error('Error updating appointment status:', error);
      // Revert to original status on error
      setStatus(initialAppointment.status);
      setAppointment(initialAppointment);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationHours: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    
    const durationMinutes = durationHours * 60;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    return `${endHours}:${endMinutes}`;
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    // Keep focus in editing mode - prevent dropdowns from closing the modal
    if (field === 'serviceId' || field === 'startTime') {
      // Ensure we're still in editing mode
      setIsEditing(true);
    }
    
    setEditForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // If start time or duration changes, update end time
      if (field === 'startTime' || field === 'duration') {
        const endTime = calculateEndTime(newForm.startTime, parseFloat(newForm.duration));
        return { ...newForm, endTime };
      }
      
      return newForm;
    });
  };

  // Handle comment change
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    
    // Auto-save comment (would be implemented with a debounce in a real app)
    updateAppointment(appointment.id, { comment: e.target.value })
      .catch(error => console.error('Error saving comment:', error));
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      
      await updateAppointment(appointment.id, {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        comment,
        serviceId: editForm.serviceId
      });
      
      // Call the onUpdate prop if provided
      if (onUpdate) {
        await onUpdate();
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating appointment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = async () => {
    try {
      await updatePaymentStatus(appointment.id, true);
      setPaymentStatus('paid');
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  // Handle appointment deletion
  const handleDeleteAppointment = async () => {
    try {
      setIsDeleting(true);
      await deleteAppointment(appointment.id);
      onClose();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      setIsDeleting(false);
    }
  };

  // Format appointment date
  const formattedDate = format(parseISO(appointment.date), 'EEEE, MMMM d, yyyy');

  // Status button styles
  const getStatusButtonStyle = (buttonStatus: AppointmentStatus) => {
    const isActive = status === buttonStatus;
    const isUpdating = updatingStatus === buttonStatus;
    
    const styles = {
      'Pending': {
        bg: isActive ? 'bg-orange-500' : 'bg-white',
        text: isActive ? 'text-white' : 'text-gray-700',
        border: isActive ? 'border-orange-500' : 'border-gray-200',
        hover: isActive ? '' : 'hover:bg-gray-50',
        icon: isUpdating ? 
          <span className="animate-spin h-4 w-4 mr-1.5"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4"/></svg></span> : 
          <Clock className="h-4 w-4 mr-1.5" />
      },
      'Arrived': {
        bg: isActive ? 'bg-green-500' : 'bg-white',
        text: isActive ? 'text-white' : 'text-gray-700',
        border: isActive ? 'border-green-500' : 'border-gray-200',
        hover: isActive ? '' : 'hover:bg-gray-50',
        icon: isUpdating ? 
          <span className="animate-spin h-4 w-4 mr-1.5"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4"/></svg></span> : 
          <CheckCircle className="h-4 w-4 mr-1.5" />
      },
      'No-Show': {
        bg: isActive ? 'bg-red-500' : 'bg-white',
        text: isActive ? 'text-white' : 'text-gray-700',
        border: isActive ? 'border-red-500' : 'border-gray-200',
        hover: isActive ? '' : 'hover:bg-gray-50',
        icon: isUpdating ? 
          <span className="animate-spin h-4 w-4 mr-1.5"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4"/></svg></span> : 
          <XCircle className="h-4 w-4 mr-1.5" />
      },
      'Confirmed': {
        bg: isActive ? 'bg-blue-500' : 'bg-white',
        text: isActive ? 'text-white' : 'text-gray-700',
        border: isActive ? 'border-blue-500' : 'border-gray-200',
        hover: isActive ? '' : 'hover:bg-gray-50',
        icon: isUpdating ? 
          <span className="animate-spin h-4 w-4 mr-1.5"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 4"/></svg></span> : 
          <CheckCircle className="h-4 w-4 mr-1.5" />
      }
    };
    
    return styles[buttonStatus as keyof typeof styles];
  };

  // Ensure we update the UI before closing
  const handleClose = async () => {
    try {
      // Call onUpdate if provided to refresh the UI
      if (onUpdate) {
        await onUpdate();
      }
      
      // Then close the modal
      onClose();
    } catch (error) {
      console.error('Error updating before closing:', error);
      onClose();
    }
  };

  return (
    <div className="flex flex-col bg-white overflow-auto rounded-lg">
      {/* Header with title and close button */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-medium">Appointment Details</h2>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-500"
        >
          ×
        </button>
      </div>

      {/* Status buttons - full width */}
      <div className="p-4 flex items-center gap-3 border-b">
        {Object.entries({
          'Pending': getStatusButtonStyle('Pending'),
          'Arrived': getStatusButtonStyle('Arrived'),
          'No-Show': getStatusButtonStyle('No-Show'),
          'Confirmed': getStatusButtonStyle('Confirmed')
        }).map(([statusName, style]) => (
          <button 
            key={statusName}
            onClick={() => handleStatusChange(statusName as AppointmentStatus)}
            className={cn(
              "px-4 py-2 rounded-md border flex items-center justify-center text-sm transition-colors",
              style.bg, style.text, style.border, style.hover
            )}
            disabled={updatingStatus !== null}
          >
            {style.icon}
            {statusName}
          </button>
        ))}
      </div>

      {/* 2x2 Grid Layout */}
      <div className="grid grid-cols-2 divide-x divide-y">
        {/* Top-Left: Appointment Details */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Appointment Details</h3>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-blue-500 flex items-center text-sm"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-500 text-sm"
              >
                Cancel
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <Input 
                  type="date"
                  value={editForm.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  className="w-full h-8 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Time</label>
                <Select 
                  value={editForm.startTime}
                  onValueChange={(value) => handleFormChange('startTime', value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px]" onClick={(e) => e.stopPropagation()}>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time} className="text-sm">
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2">
                <Button 
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  size="sm"
                  className="text-xs h-7"
                >
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Date</div>
                <div className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                  <span className="text-sm">{formattedDate}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Time</div>
                <div className="flex items-center">
                  <Clock className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                  <span className="text-sm">{appointment.startTime} - {appointment.endTime}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Service</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{service?.name || 'Manicure'}</span>
                  <Badge className="bg-gray-100 text-gray-800 text-xs">
                    {editForm.duration}h
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Client Information */}
        <div className="p-4">
          <h3 className="text-lg font-medium mb-4">Client</h3>
          
          <div className="flex items-start mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mr-3 flex-shrink-0">
              <span className="text-lg">{client?.name?.[0] || 'H'}</span>
            </div>
            <div>
              <h3 className="text-base font-medium">{client?.name || 'Haicut'}</h3>
              <div className="flex items-center text-gray-500 text-sm">
                <Phone className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                <a href={`tel:${client?.phone || '+77474894939'}`} className="hover:text-blue-600">
                  {client?.phone || '+77474894939'}
                </a>
              </div>
            </div>
            
            <Badge className={cn(
              "ml-auto text-xs",
              status === 'Pending' ? "bg-amber-100 text-amber-800 border-amber-200" :
              status === 'Arrived' ? "bg-green-100 text-green-800 border-green-200" :
              status === 'No-Show' ? "bg-red-100 text-red-800 border-red-200" :
              status === 'Confirmed' ? "bg-blue-100 text-blue-800 border-blue-200" :
              "bg-gray-100 text-gray-800 border-gray-200"
            )}>
              {status}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Client Information</div>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
              <div>
                <div className="text-xs text-gray-500">Total Visits</div>
                <div className="font-medium">{client?.totalVisits || '0'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Last Visit</div>
                <div>{client?.lastVisit ? format(new Date(client.lastVisit), 'MMM d, yyyy') : 'First visit'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-Left: Payment Details */}
        <div className="p-4">
          <h3 className="text-lg font-medium mb-4">Payment Details</h3>
          
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <div>
                <div className="font-medium text-sm">{service?.name || 'Manicure'}</div>
                <div className="text-xs text-gray-500">
                  {editForm.duration}h with {client?.name || 'Haicut'}
                </div>
              </div>
              <div className="font-medium">₺{service?.price || 2000}</div>
            </div>
          </div>
          
          <Separator className="my-3" />
          
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold">Total</span>
            <span className="font-bold">₺{service?.price || 2000}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <Badge className={cn(
              "text-xs",
              paymentStatus === 'paid' 
                ? "bg-green-100 text-green-800 border-green-200" 
                : "bg-amber-100 text-amber-800 border-amber-200"
            )}>
              {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
            </Badge>
            
            {paymentStatus === 'unpaid' && (
              <Button 
                onClick={handleMarkAsPaid}
                className="bg-black hover:bg-gray-800 text-white h-8 text-xs"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Mark as Paid
              </Button>
            )}
          </div>
        </div>

        {/* Bottom-Right: Notes */}
        <div className="p-4">
          <h3 className="text-lg font-medium mb-3">Comments</h3>
          <Textarea 
            value={comment}
            onChange={handleCommentChange}
            placeholder="Add notes about this appointment..."
            className="w-full resize-none h-[100px] text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Comments are saved automatically
          </p>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 border-red-200 hover:bg-red-50 text-xs h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAppointment} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add an export alias for backward compatibility
export const GridAppointmentDetail = AppointmentDetailView;