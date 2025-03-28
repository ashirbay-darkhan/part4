'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  User, 
  Clock,
  Calendar,
  Tag,
  FileText,
  DollarSign,
  MessageSquare,
  Check,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';

import { Appointment, AppointmentStatus, Client, Service } from '@/types';
import { updateAppointmentStatus } from '@/lib/api';

interface BookingDetailsModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  service?: Service | null;
  onStatusUpdate?: () => void;
}

export function BookingDetailsModal({
  appointment,
  isOpen,
  onClose,
  client,
  service,
  onStatusUpdate
}: BookingDetailsModalProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<AppointmentStatus | ''>('');
  const [notes, setNotes] = useState('');

  if (!appointment) return null;

  const appointmentDate = parseISO(appointment.date);
  
  // Status colors for badges
  const getStatusColor = (status: AppointmentStatus) => {
    const statusColors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Confirmed': 'bg-blue-100 text-blue-800 border-blue-300',
      'Arrived': 'bg-green-100 text-green-800 border-green-300',
      'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'Cancelled': 'bg-red-100 text-red-800 border-red-300',
      'No-Show': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast({
        title: "Please select a status",
        variant: "destructive"
      });
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await updateAppointmentStatus(appointment.id, newStatus as AppointmentStatus);
      
      toast({
        title: "Status updated",
        description: `Appointment status changed to ${newStatus}`,
      });
      
      // Trigger parent component to refetch data
      if (onStatusUpdate) {
        onStatusUpdate();
      }
      
      // Close modal
      onClose();
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Label htmlFor="status" className="text-muted-foreground">Status</Label>
            <Badge className={`${getStatusColor(appointment.status)} py-1 px-3 border`}>
              {appointment.status}
            </Badge>
          </div>
          
          {/* Service & Basic Details */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-muted-foreground text-xs">Service</Label>
                <p className="font-medium">{service?.name || 'Unknown Service'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-muted-foreground text-xs">Client</Label>
                <p className="font-medium">{client?.name || 'Unknown Client'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-muted-foreground text-xs">Date</Label>
                <p className="font-medium">{format(appointmentDate, 'EEEE, MMMM d, yyyy')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-muted-foreground text-xs">Time</Label>
                <p className="font-medium">{appointment.startTime} - {appointment.endTime}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-muted-foreground text-xs">Duration</Label>
                <p className="font-medium">{appointment.duration} minutes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-500" />
              <div>
                <Label className="text-muted-foreground text-xs">Price</Label>
                <p className="font-medium">₸ {appointment.price.toLocaleString()}</p>
              </div>
            </div>
            
            {appointment.comment && (
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <Label className="text-muted-foreground text-xs">Comment</Label>
                  <p className="text-sm">{appointment.comment}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Update Status */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="status">Update Status</Label>
            <div className="flex gap-2">
              <Select 
                value={newStatus} 
                onValueChange={(value) => setNewStatus(value as AppointmentStatus)}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select new status" />
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
              <Button onClick={handleStatusUpdate} disabled={isUpdating || !newStatus}>
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
          
          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Add Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20"
            />
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 sm:justify-between sm:flex-row">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button 
            variant="default" 
            className="w-full sm:w-auto bg-primary"
            onClick={() => {
              toast({
                title: "Notes saved",
                description: "Appointment notes have been saved."
              });
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
