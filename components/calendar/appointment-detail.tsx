import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ClockIcon,
  PhoneIcon, 
  MessageSquare,
  CheckCircle,
  XCircle,
  UserIcon,
  Save,
  Loader2,
  Edit2Icon,
  CreditCard,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar-fallback';
import { cn } from '@/lib/utils';
import { 
  getClient, 
  getService, 
  updateAppointment, 
  updateAppointmentStatus,
  deleteAppointment
} from '@/lib/api';

import { Appointment, AppointmentStatus, Client, Service } from '@/types';

interface AppointmentDetailProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange?: () => Promise<void>;
  onUpdate?: () => Promise<void>;
}

export function ImprovedAppointmentDetail({ 
  appointment, 
  onClose, 
  onStatusChange,
  onUpdate
}: AppointmentDetailProps) {
  // State management
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [comment, setComment] = useState(appointment.comment || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isCommentDirty, setIsCommentDirty] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    duration: calculateDuration(appointment.startTime, appointment.endTime)
  });

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
        setIsError(false);
        
        // Fetch client and service data in parallel
        const [clientData, serviceData] = await Promise.all([
          getClient(appointment.clientId),
          getService(appointment.serviceId)
        ]);
        
        setClient(clientData);
        setService(serviceData);
        setComment(appointment.comment || '');
      } catch (error) {
        console.error('Error fetching appointment details:', error);
        setIsError(true);
        setToast({
          message: 'Failed to load appointment details',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [appointment]);

  // Handle auto-save comment when it changes (with debounce)
  useEffect(() => {
    if (!isCommentDirty) return;
    
    const timer = setTimeout(async () => {
      try {
        await updateAppointment(appointment.id, { comment });
        setToast({
          message: 'Comment saved',
          type: 'success'
        });
      } catch (error) {
        console.error('Error saving comment:', error);
        setToast({
          message: 'Failed to save comment',
          type: 'error'
        });
      } finally {
        setIsCommentDirty(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [comment, isCommentDirty, appointment.id]);

  // Handle status change
  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    try {
      setStatus(newStatus);
      await updateAppointmentStatus(appointment.id, newStatus);
      
      // Call the onStatusChange prop if provided
      if (onStatusChange) {
        await onStatusChange();
      }
      
      setToast({
        message: `Appointment marked as ${newStatus}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setToast({
        message: 'Failed to update status',
        type: 'error'
      });
      setStatus(appointment.status); // Revert to original status
    }
  };

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // If start time or duration changes, update end time
      if (field === 'startTime' || field === 'duration') {
        const [hours, minutes] = newForm.startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0);
        
        const durationHours = parseFloat(newForm.duration);
        const durationMinutes = durationHours * 60;
        
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        const endHours = endDate.getHours().toString().padStart(2, '0');
        const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
        
        return { 
          ...newForm, 
          endTime: `${endHours}:${endMinutes}` 
        };
      }
      
      return newForm;
    });
  };

  // Handle comment change
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    setIsCommentDirty(true);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      
      await updateAppointment(appointment.id, {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        status,
        comment
      });
      
      // Call the onUpdate prop if provided
      if (onUpdate) {
        await onUpdate();
      }
      
      setIsEditing(false);
      setToast({
        message: 'Appointment updated successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      setToast({
        message: 'Failed to update appointment',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = () => {
    setPaymentStatus('paid');
    setToast({
      message: 'Appointment marked as paid',
      type: 'success'
    });
  };

  // Handle appointment deletion
  const handleDeleteAppointment = async () => {
    try {
      setIsDeleting(true);
      await deleteAppointment(appointment.id);
      setToast({
        message: 'Appointment deleted successfully',
        type: 'success'
      });
      onClose();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      setToast({
        message: 'Failed to delete appointment',
        type: 'error'
      });
      setIsDeleting(false);
    }
  };

  // Format appointment date
  const appointmentDate = new Date(appointment.date);
  const formattedDate = format(appointmentDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = `${appointment.startTime} - ${appointment.endTime}`;

  // Status button styles
  const getStatusButtonStyle = (buttonStatus: AppointmentStatus) => ({
    variant: status === buttonStatus ? 'default' : 'outline',
    className: cn(
      status === buttonStatus && {
        'Pending': 'bg-amber-600',
        'Arrived': 'bg-green-600',
        'No-Show': 'bg-red-600',
        'Confirmed': 'bg-blue-600'
      }[buttonStatus]
    )
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Loading appointment details...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-medium mb-2">Error Loading Details</h3>
        <p className="text-gray-600 mb-4 text-center">
          We couldn't load the appointment details. Please try again.
        </p>
        <Button onClick={onClose} variant="outline">Close</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Status bar at top */}
      <div className="p-4 flex items-center justify-between border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Button
            variant={getStatusButtonStyle('Pending').variant as any}
            size="sm"
            className={getStatusButtonStyle('Pending').className}
            onClick={() => handleStatusChange('Pending')}
          >
            <ClockIcon className="w-4 h-4 mr-1" /> Pending
          </Button>
          
          <Button
            variant={getStatusButtonStyle('Arrived').variant as any}
            size="sm"
            className={getStatusButtonStyle('Arrived').className}
            onClick={() => handleStatusChange('Arrived')}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Arrived
          </Button>
          
          <Button
            variant={getStatusButtonStyle('No-Show').variant as any}
            size="sm"
            className={getStatusButtonStyle('No-Show').className}
            onClick={() => handleStatusChange('No-Show')}
          >
            <XCircle className="w-4 h-4 mr-1" /> No-Show
          </Button>
          
          <Button
            variant={getStatusButtonStyle('Confirmed').variant as any}
            size="sm"
            className={getStatusButtonStyle('Confirmed').className}
            onClick={() => handleStatusChange('Confirmed')}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Confirmed
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
          <XCircle className="w-4 h-4" />
        </Button>
      </div>

      {/* Main content - Two columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-auto">
        {/* Left column - Client Info & Appointment Details */}
        <div className="border-r border-gray-200 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Client and appointment info */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Avatar 
                  name={client?.name || 'Client'} 
                  className="w-12 h-12 mr-4" 
                />
                <div>
                  <h2 className="font-medium text-xl">{client?.name || 'Client'}</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <PhoneIcon className="w-3.5 h-3.5 mr-1.5" />
                    <a href={`tel:${client?.phone || '+1234567890'}`} className="hover:text-blue-600 transition-colors">
                      {client?.phone || '+1234567890'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Appointment date and time */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium">{formattedTime}</span>
                    <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {editForm.duration}h
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="pl-0 text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit2Icon className="w-3.5 h-3.5 mr-1.5" />
                    Edit appointment
                  </Button>
                </div>
              </Card>
            </div>
            
            {/* Edit form - conditionally displayed */}
            {isEditing && (
              <Card className="p-4">
                <h3 className="font-medium text-sm mb-3">Edit Appointment</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <Input 
                      type="date"
                      value={editForm.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      className="w-full p-2 text-sm rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Duration (hours)</label>
                    <Select 
                      value={editForm.duration}
                      onValueChange={(value) => handleFormChange('duration', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5 h</SelectItem>
                        <SelectItem value="1.0">1.0 h</SelectItem>
                        <SelectItem value="1.5">1.5 h</SelectItem>
                        <SelectItem value="2.0">2.0 h</SelectItem>
                        <SelectItem value="2.5">2.5 h</SelectItem>
                        <SelectItem value="3.0">3.0 h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                    <Input 
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => handleFormChange('startTime', e.target.value)}
                      className="w-full p-2 text-sm rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Time</label>
                    <Input 
                      type="time"
                      value={editForm.endTime}
                      disabled
                      className="w-full p-2 text-sm rounded-md bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</> : 
                    <><Save className="w-4 h-4 mr-1" /> Save changes</>}
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Client stats & visit history (summarized) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-sm mb-2">Client Overview</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Total Visits</p>
                  <p className="font-medium">{client?.totalVisits || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Visit</p>
                  <p className="font-medium">
                    {client?.lastVisit ? format(new Date(client.lastVisit), 'MMM d, yyyy') : 'First visit'}
                  </p>
                </div>
                {client?.email && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-blue-600">{client.email}</p>
                  </div>
                )}
                {client?.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-gray-700">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment section */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Payment Details</h3>
                <Badge className={paymentStatus === 'paid' ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                  {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">{service?.name || 'Service'}</span>
                <span className="font-medium">{service?.price ? `₺${service.price}` : '₺0'}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">{service?.price ? `₺${service.price}` : '₺0'}</span>
              </div>
              
              {paymentStatus === 'unpaid' && (
                <Button 
                  className="w-full" 
                  onClick={handleMarkAsPaid}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Right column - Comments and Actions */}
        <div className="overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Service details */}
            <div>
              <h3 className="font-medium text-base mb-3">Service</h3>
              <Card className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-800">{service?.name || 'Service'}</h4>
                  <p className="text-gray-800 font-medium">{service?.price ? `₺${service.price}` : '₺0'}</p>
                </div>
                <p className="text-gray-500 text-sm">{editForm.duration} hour with {client?.name || 'Client'}</p>
                {service?.description && (
                  <p className="text-gray-600 text-sm mt-2 italic">{service.description}</p>
                )}
              </Card>
            </div>

            {/* Comments Section */}
            <div className="space-y-2">
              <h3 className="font-medium text-base">Comments</h3>
              <Textarea 
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add notes about this appointment..."
                className="w-full resize-none h-[150px] border-gray-200 text-sm rounded-lg"
              />
              <p className="text-xs text-gray-400 italic flex items-center">
                {isCommentDirty ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...</>
                ) : (
                  'Comments are saved automatically'
                )}
              </p>
            </div>

            {/* Quick actions */}
            <div>
              <h3 className="font-medium text-base mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-3 border-gray-200"
                  onClick={() => window.open(`tel:${client?.phone}`)}
                >
                  <PhoneIcon className="h-5 w-5 mb-1 text-blue-600" />
                  <span className="text-sm">Call Client</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-3 border-gray-200"
                  onClick={() => {
                    // Create a duplicate appointment logic would go here
                    setToast({
                      message: 'Creating new appointment for this client',
                      type: 'info'
                    });
                  }}
                >
                  <UserIcon className="h-5 w-5 mb-1 text-purple-600" />
                  <span className="text-sm">New Appointment</span>
                </Button>
              </div>
            </div>

            {/* Reminder section */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-1.5 text-blue-600" />
                Client Reminders
              </h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start">
                  <ArrowRight className="h-3.5 w-3.5 mt-1 mr-2 flex-shrink-0" />
                  <span>Ask if they want to schedule their next appointment</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-3.5 w-3.5 mt-1 mr-2 flex-shrink-0" />
                  <span>Check if their contact information is up to date</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with action buttons */}
      <div className="p-4 border-t flex justify-between items-center bg-gray-50">
        <Button 
          variant="outline" 
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
        >
          {isDeleting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Deleting...</> : 'Delete appointment'}
        </Button>
        
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this appointment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAppointment} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {/* Toast notifications */}
      {toast && (
        <div className={cn(
          "fixed bottom-4 right-4 p-4 rounded-md shadow-lg animate-in fade-in duration-300 max-w-sm",
          toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        )}>
          <div className="flex items-center">
            <div className="mr-2">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </div>
            <div>{toast.message}</div>
            <button
              className="ml-4 text-gray-700 hover:text-gray-900"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add an export alias for backward compatibility
export const AppointmentDetailView = ImprovedAppointmentDetail;