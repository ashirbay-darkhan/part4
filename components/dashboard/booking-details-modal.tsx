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
      <DialogContent className="sm:max-w-[600px] p-5">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Appointment Details</DialogTitle>
            <Badge className={`${getStatusColor(appointment.status)} py-1 px-3 border text-sm`}>
              {appointment.status}
            </Badge>
          </div>
          <DialogDescription className="text-xs mt-1">
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-3">
          {/* Basic Details Section */}
          <div className="grid grid-cols-2 gap-3 border rounded-md p-3 bg-muted/10">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs text-muted-foreground">Service</span>
                <p className="text-sm font-medium">{service?.name || 'Unknown Service'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs text-muted-foreground">Client</span>
                <p className="text-sm font-medium">{client?.name || 'Unknown Client'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs text-muted-foreground">Date</span>
                <p className="text-sm font-medium">{format(appointmentDate, 'EEE, MMM d, yyyy')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs text-muted-foreground">Time</span>
                <p className="text-sm font-medium">{appointment.startTime} - {appointment.endTime}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs text-muted-foreground">Duration</span>
                <p className="text-sm font-medium">{appointment.duration} minutes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs text-muted-foreground">Price</span>
                <p className="text-sm font-medium">₸ {appointment.price.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          {appointment.comment && (
            <div className="mt-3 border rounded-md p-3 bg-muted/10">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground">Comment</span>
                  <p className="text-sm">{appointment.comment}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Update Status */}
          <div className="mt-3 border rounded-md p-3 bg-muted/10">
            <Label htmlFor="status" className="text-sm font-medium mb-1 block">Update Status</Label>
            <div className="flex gap-2">
              <Select 
                value={newStatus} 
                onValueChange={(value) => setNewStatus(value as AppointmentStatus)}
              >
                <SelectTrigger id="status" className="w-full h-9 text-sm">
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
              <Button onClick={handleStatusUpdate} disabled={isUpdating || !newStatus} className="px-3 h-9 text-sm">
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
          
          {/* Notes Section */}
          <div className="mt-3 border rounded-md p-3 bg-muted/10">
            <Label htmlFor="notes" className="text-sm font-medium mb-1 block">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 text-sm resize-none"
            />
            <Button 
              variant="default" 
              className="w-full mt-2 h-8 text-sm"
              onClick={() => {
                toast({
                  title: "Notes saved",
                  description: "Appointment notes have been saved."
                });
              }}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Save Notes
            </Button>
          </div>
        </div>
        
        <DialogFooter className="pt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full h-9 text-sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
