'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  Edit2Icon, 
  MoreHorizontal, 
  PhoneIcon, 
  History, 
  MessageSquare,
  CheckCircle,
  XCircle,
  UserIcon,
  Repeat,
  Bell,
  Clipboard,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Save,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { format, parseISO, addMinutes, differenceInMinutes } from 'date-fns';
import { Appointment, AppointmentStatus, Client, Service } from '@/types';
import { 
  getClient, 
  getService, 
  updateAppointment, 
  updateAppointmentStatus,
  deleteAppointment
} from '@/lib/api';
import { Avatar } from '@/components/ui/avatar-fallback';
import { cn } from '@/lib/utils';
import { Toast } from '@/components/ui/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface AppointmentDetailProps {
  appointment: Appointment;
  onClose: () => void;
}

export function AppointmentDetailView({ appointment, onClose }: AppointmentDetailProps) {
  // State management
  const [client, setClient] = useState<Client | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [comment, setComment] = useState(appointment.comment || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isCommentDirty, setIsCommentDirty] = useState(false);
  const [isForAnotherVisitor, setIsForAnotherVisitor] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    duration: calculateDuration(appointment.startTime, appointment.endTime)
  });
  
  // Section expand states
  const [expandedSections, setExpandedSections] = useState({
    services: true,
    clientInfo: false,
    appointmentData: false,
    statistics: false
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
  
  // Update end time when start time or duration changes
  const updateEndTime = useCallback((startTime: string, durationHours: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    
    const endDate = addMinutes(date, durationHours * 60);
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    return `${endHours}:${endMinutes}`;
  }, []);

  // Toggle section expand/collapse
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

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

  // Auto-save comment when it changes (with debounce)
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
  const handleStatusChange = useCallback(async (newStatus: AppointmentStatus) => {
    try {
      setStatus(newStatus);
      await updateAppointmentStatus(appointment.id, newStatus);
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
  }, [appointment.id, appointment.status]);

  // Handle form field changes
  const handleFormChange = useCallback((field: string, value: string) => {
    setEditForm(prev => {
      const newForm = { ...prev, [field]: value };
      
      // If start time or duration changes, update end time
      if (field === 'startTime' || field === 'duration') {
        const endTime = updateEndTime(
          field === 'startTime' ? value : prev.startTime,
          parseFloat(field === 'duration' ? value : prev.duration)
        );
        return { ...newForm, endTime };
      }
      
      return newForm;
    });
  }, [updateEndTime]);

  // Handle comment change
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    setIsCommentDirty(true);
  }, []);

  // Handle save changes
  const handleSaveChanges = useCallback(async () => {
    try {
      setIsSaving(true);
      
      await updateAppointment(appointment.id, {
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        status,
        comment
      });
      
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
  }, [appointment.id, editForm, status, comment]);

  // Handle appointment deletion
  const handleDeleteAppointment = useCallback(async () => {
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
  }, [appointment.id, onClose]);

  // Format appointment date
  const appointmentDate = useMemo(() => 
    appointment.date ? new Date(appointment.date) : new Date(),
    [appointment.date]
  );
  
  const formattedDate = useMemo(() => 
    format(appointmentDate, 'dd MMMM'),
    [appointmentDate]
  );
  
  const formattedTime = useMemo(() => 
    `${appointment.startTime}-${appointment.endTime}`,
    [appointment.startTime, appointment.endTime]
  );

  // Status button styles with memoization
  const statusButtonStyles = useMemo(() => ({
    'Pending': {
      variant: status === 'Pending' ? 'default' : 'outline',
      className: status === 'Pending' ? 'bg-gray-800' : 'bg-white'
    },
    'Arrived': {
      variant: status === 'Arrived' ? 'default' : 'outline',
      className: status === 'Arrived' ? 'bg-green-600' : 'bg-white'
    },
    'No-Show': {
      variant: status === 'No-Show' ? 'default' : 'outline',
      className: status === 'No-Show' ? 'bg-red-600' : 'bg-white'
    },
    'Confirmed': {
      variant: status === 'Confirmed' ? 'default' : 'outline',
      className: status === 'Confirmed' ? 'bg-blue-600' : 'bg-white'
    }
  }), [status]);

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
            variant={statusButtonStyles['Pending'].variant as any}
            size="sm"
            className={statusButtonStyles['Pending'].className}
            onClick={() => handleStatusChange('Pending')}
          >
            <ClockIcon className="w-4 h-4 mr-1" /> Pending
          </Button>
          
          <Button
            variant={statusButtonStyles['Arrived'].variant as any}
            size="sm"
            className={statusButtonStyles['Arrived'].className}
            onClick={() => handleStatusChange('Arrived')}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Arrived
          </Button>
          
          <Button
            variant={statusButtonStyles['No-Show'].variant as any}
            size="sm"
            className={statusButtonStyles['No-Show'].className}
            onClick={() => handleStatusChange('No-Show')}
          >
            <XCircle className="w-4 h-4 mr-1" /> No-Show
          </Button>
          
          <Button
            variant={statusButtonStyles['Confirmed'].variant as any}
            size="sm"
            className={statusButtonStyles['Confirmed'].className}
            onClick={() => handleStatusChange('Confirmed')}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Confirmed
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
          <XCircle className="w-4 h-4" />
        </Button>
      </div>

      {/* Three-section layout - Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Section 1: Client Info & Appointment Basic Details */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Client and appointment info */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Avatar 
                  name={client?.name || 'Notion clone'} 
                  className="w-12 h-12 mr-4" 
                />
                <div>
                  <h2 className="font-medium text-xl">{client?.name || 'Notion clone'}</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <PhoneIcon className="w-3.5 h-3.5 mr-1.5" />
                    <a href={`tel:${client?.phone || '+7474748939'}`} className="hover:text-blue-600 transition-colors">
                      {client?.phone || '+7474748939'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Appointment date and time */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-gray-700 mb-1">
                  <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="font-medium">{appointment.date || '2025-03-12'}</span>
                </div>
                <p className="text-gray-500 text-sm ml-6 mb-2">
                  {appointment.startTime || '09:30'} - {appointment.endTime || '10:30'} · 
                  <span className="font-medium"> {calculateDuration(appointment.startTime, appointment.endTime)}h</span>
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-600 pl-0.5 hover:bg-gray-100"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2Icon className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            </div>
            
            {/* Edit form - conditionally displayed */}
            {isEditing && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium text-sm mb-3">Edit Appointment</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input 
                      type="date"
                      value={editForm.date}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                      className="w-full p-2 text-sm border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Duration</label>
                    <select 
                      className="w-full p-2 text-sm border rounded-md"
                      value={editForm.duration}
                      onChange={(e) => handleFormChange('duration', e.target.value)}
                    >
                      <option value="0.5">0.5 h.</option>
                      <option value="1">1 h.</option>
                      <option value="1.5">1.5 h.</option>
                      <option value="2">2 h.</option>
                      <option value="2.5">2.5 h.</option>
                      <option value="3">3 h.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                    <input 
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => handleFormChange('startTime', e.target.value)}
                      className="w-full p-2 text-sm border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Time</label>
                    <input 
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => handleFormChange('endTime', e.target.value)}
                      className="w-full p-2 text-sm border rounded-md"
                      disabled
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
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Statistics Section */}
            <Collapsible 
              open={expandedSections.statistics} 
              onOpenChange={() => toggleSection('statistics')}
              className="bg-white rounded-lg"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium text-sm">
                <span>Statistics</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  expandedSections.statistics ? "transform rotate-180" : ""
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Last visit</p>
                    <p>{client?.lastVisit ? format(new Date(client.lastVisit), 'dd.MM HH:mm') : '11.03 17:04'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total visits</p>
                    <p>{client?.totalVisits || '0'}</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Appointment Data Section */}
            <Collapsible 
              open={expandedSections.appointmentData} 
              onOpenChange={() => toggleSection('appointmentData')}
              className="bg-white rounded-lg"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium text-sm">
                <span>Appointment data</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  expandedSections.appointmentData ? "transform rotate-180" : ""
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Date of creation</p>
                    <p>13.03 07:17</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Source</p>
                    <p>"Company form" new widget</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p>Mobile phone</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Website</p>
                    <a href="#" className="text-blue-500 hover:underline flex items-center">
                      app.alteg.io/ <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
        
        {/* Section 2: Service Details */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Service Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-base">Service</h3>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-800">{service?.name || 'Haircut'}</h4>
                  <p className="text-gray-800 font-medium">{service?.price || '3000'} ₺</p>
                </div>
                <p className="text-gray-500 text-sm mt-1">1 hour with {client?.name || 'Client'}</p>
              </div>
              
              <div className="flex justify-between items-center px-1">
                <span className="text-sm text-gray-600">Amount to pay</span>
                <div className="flex items-center">
                  <span className="font-medium mr-2">{service?.price || '3000'} ₺</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs">Pay</Button>
                </div>
              </div>
            </div>

            {/* Popular services */}
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-sm font-medium">Services</span>
                <Input 
                  placeholder="Search" 
                  className="ml-2 h-7 text-xs" 
                />
              </div>
              
              <p className="text-xs text-gray-500">Popular services: Lorem ipsum</p>
              
              <div className="space-y-2">
                <div className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                  <h5 className="font-medium text-sm">{service?.name || 'haircut'}</h5>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{service?.price || '3000'} ₺</span>
                    <span>1 h.</span>
                  </div>
                </div>
                
                <p className="text-xs font-medium mt-2">All services</p>
                <div className="border border-gray-200 rounded-lg p-3 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                  <span className="text-sm">women's haircut</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            {/* Other Visitor Checkbox */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center">
                <Checkbox 
                  id="anotherVisitor" 
                  checked={isForAnotherVisitor}
                  onCheckedChange={(checked) => setIsForAnotherVisitor(!!checked)}
                  className="mr-2"
                />
                <label htmlFor="anotherVisitor" className="text-sm">
                  Appointment for another visitor
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Section 3: Comments and Tools */}
        <div className="w-1/3 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Comments Section */}
            <div className="space-y-2">
              <h3 className="font-medium text-base">Comments</h3>
              <Textarea 
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add a comment..."
                className="w-full resize-none h-[200px] border-gray-200 text-sm rounded-lg"
              />
              <p className="text-xs text-gray-400 italic flex items-center">
                {isCommentDirty ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...</>
                ) : (
                  'Comments are saved automatically'
                )}
              </p>
            </div>

            {/* Tools Section */}
            <div className="space-y-2">
              <h3 className="font-medium text-base">Tools</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                  <div className="flex flex-col items-center">
                    <History className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-sm">Visit history</span>
                  </div>
                </div>
                <div className="text-center p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                  <div className="flex flex-col items-center">
                    <Repeat className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-sm">Repeat</span>
                  </div>
                </div>
                <div className="text-center p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                  <div className="flex flex-col items-center">
                    <Bell className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-sm">Notifications</span>
                  </div>
                </div>
                <div className="text-center p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                  <div className="flex flex-col items-center">
                    <MessageSquare className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-sm">Message</span>
                  </div>
                </div>
                <div className="text-center p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                  <div className="flex flex-col items-center">
                    <FileText className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-sm">Notes</span>
                  </div>
                </div>
                <div className="text-center p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                  <div className="flex flex-col items-center">
                    <Clipboard className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-sm">Reports</span>
                  </div>
                </div>
              </div>
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
        
        {isEditing ? (
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-1" /> Save changes</>}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
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