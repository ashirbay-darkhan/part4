'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Appointment, AppointmentStatus } from '@/types';
import { updateAppointmentStatus, getStatusDetails } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Check, AlertCircle, Clock, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { AppointmentDetail } from '@/app/(dashboard)/calendar/components/appointment-detail';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  onStatusChange?: () => void;
  style: React.CSSProperties;
}

export function AppointmentCard({ appointment, onClick, onStatusChange, style }: AppointmentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get status color based on appointment status
  const getStatusColor = (): string => {
    switch (appointment.status) {
      case 'Pending':
        return 'bg-yellow-500';
      case 'Confirmed':
        return 'bg-blue-500';
      case 'Arrived':
        return 'bg-green-500';
      case 'Completed':
        return 'bg-purple-500';
      case 'Cancelled':
        return 'bg-red-500';
      case 'No-Show':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (newStatus === appointment.status) return;

    setIsUpdating(true);
    try {
      await updateAppointmentStatus(appointment.id, newStatus);
      toast.success(`Appointment status updated to ${newStatus}`);
      
      // Call the parent's status change handler if provided
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle appointment edit
  const handleEditAppointment = () => {
    setIsModalOpen(true);
  };

  // Handle appointment update from modal
  const handleAppointmentUpdate = () => {
    // Call the parent's status change handler if provided
    if (onStatusChange) {
      onStatusChange();
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <div
        className="absolute left-1 right-1 bg-white border rounded-md shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
        style={style}
        onClick={handleEditAppointment}
      >
        {/* Status indicator */}
        <div className={`h-1 w-full ${getStatusColor()}`}></div>
        
        <div className="flex-1 p-2 flex flex-col justify-between">
          {/* Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1 text-gray-500" />
              <span className="text-xs text-gray-700 font-medium">
                {appointment.startTime} - {appointment.endTime}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleEditAppointment();
                }}>
                  <Edit className="h-3.5 w-3.5 mr-2" />
                  <span>Edit</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('Arrived');
                  }}
                  disabled={isUpdating || appointment.status === 'Arrived'}
                >
                  <Check className="h-3.5 w-3.5 mr-2 text-green-500" />
                  <span>Mark as Arrived</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('Completed');
                  }}
                  disabled={isUpdating || appointment.status === 'Completed'}
                >
                  <Check className="h-3.5 w-3.5 mr-2 text-blue-500" />
                  <span>Mark as Completed</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('No-Show');
                  }}
                  disabled={isUpdating || appointment.status === 'No-Show'}
                  className="text-red-500"
                >
                  <AlertCircle className="h-3.5 w-3.5 mr-2" />
                  <span>Mark as No-Show</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Service/Client details - truncated to fit */}
          <div className="mt-1">
            <p className="font-medium text-sm truncate">{appointment.serviceId}</p>
            <p className="text-xs text-gray-500 truncate">{appointment.clientId}</p>
            
            {appointment.comment && (
              <p className="text-xs text-gray-500 mt-1 truncate">{appointment.comment}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Appointment detail modal */}
      <AppointmentDetail
        appointment={appointment}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleAppointmentUpdate}
      />
    </>
  );
}
