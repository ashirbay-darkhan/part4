'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Appointment, Service, Client, AppointmentStatus } from '@/types';
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogHeader
} from '@/components/ui/dialog';
import { 
  Clock, 
  User, 
  Phone, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock3,
  LoaderCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getService, getClient } from '@/lib/api';
import { AppointmentDetailView } from '@/components/calendar/appointment-detail';
import { format, parseISO, differenceInMinutes } from 'date-fns';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  onStatusChange?: () => Promise<void>;
  style?: {
    top: string;
    height: string;
  };
}

export function AppointmentCard({ appointment, onClick, onStatusChange, style }: AppointmentCardProps) {
  // State management with proper types
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Calculate duration in a memoized way
  const duration = useMemo(() => {
    if (!appointment.startTime || !appointment.endTime) return '? min';
    
    const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
    const [endHour, endMinute] = appointment.endTime.split(':').map(Number);
    
    const start = new Date();
    start.setHours(startHour, startMinute, 0);
    
    const end = new Date();
    end.setHours(endHour, endMinute, 0);
    
    const minutes = differenceInMinutes(end, start);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }, [appointment.startTime, appointment.endTime]);
  
  // Fetch data with proper error handling
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Fetch service and client data in parallel
        const [serviceData, clientData] = await Promise.all([
          getService(appointment.serviceId),
          getClient(appointment.clientId)
        ]);
        
        setService(serviceData);
        setClient(clientData);
      } catch (error) {
        console.error('Error fetching appointment data:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [appointment.serviceId, appointment.clientId]);
  
  // Status configuration with better styling and proper icons
  const statusConfig = useMemo(() => ({
    'Pending': { 
      color: 'bg-amber-500', 
      headerColor: 'bg-amber-600', 
      icon: Clock3, 
      text: 'text-amber-900',
      borderColor: 'border-amber-300'
    },
    'Arrived': { 
      color: 'bg-emerald-500', 
      headerColor: 'bg-emerald-600', 
      icon: CheckCircle,
      text: 'text-emerald-900',
      borderColor: 'border-emerald-300'
    },
    'No-Show': { 
      color: 'bg-rose-500', 
      headerColor: 'bg-rose-600', 
      icon: XCircle,
      text: 'text-rose-900',
      borderColor: 'border-rose-300'
    },
    'Confirmed': { 
      color: 'bg-blue-500', 
      headerColor: 'bg-blue-600', 
      icon: CheckCircle,
      text: 'text-blue-900',
      borderColor: 'border-blue-300'
    },
    'Completed': { 
      color: 'bg-violet-500', 
      headerColor: 'bg-violet-600', 
      icon: CheckCircle,
      text: 'text-violet-900',
      borderColor: 'border-violet-300'
    },
    'Cancelled': { 
      color: 'bg-gray-500', 
      headerColor: 'bg-gray-600', 
      icon: XCircle,
      text: 'text-gray-700',
      borderColor: 'border-gray-300'
    }
  }), []);
  
  // Get the current appointment's status configuration
  const currentStatusConfig = useMemo(() => 
    statusConfig[appointment.status as keyof typeof statusConfig] || 
    { color: 'bg-gray-500', headerColor: 'bg-gray-600', icon: AlertCircle, text: 'text-gray-700', borderColor: 'border-gray-300' },
  [statusConfig, appointment.status]);
  
  // Handle opening the dialog with useCallback for optimization
  const handleClick = useCallback(() => {
    setIsDialogOpen(true);
    onClick();
  }, [onClick]);
  
  // Handle closing the dialog with useCallback for optimization
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    if (onStatusChange) {
      onStatusChange();
    }
  }, [onStatusChange]);
  
  // Render the status tag with the StatusIcon component
  const renderStatusTag = useCallback(() => {
    const StatusIcon = currentStatusConfig.icon;
    return (
      <span className={cn(
        currentStatusConfig.color, 
        "text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 shadow-sm"
      )}>
        <StatusIcon className="h-3 w-3" />
        <span className="uppercase tracking-wide text-[10px]">{appointment.status}</span>
      </span>
    );
  }, [appointment.status, currentStatusConfig]);
  
  // Format the appointment date for display
  const formattedDate = useMemo(() => {
    try {
      return format(parseISO(appointment.date), 'EEE, MMM d');
    } catch (e) {
      return 'Unknown date';
    }
  }, [appointment.date]);
  
  return (
    <>
      <div
        className={cn(
          "absolute left-1 right-1 rounded-lg overflow-hidden shadow-sm cursor-pointer",
          "transition-all hover:shadow-md border",
          "transform hover:-translate-y-0.5 hover:scale-[1.01]",
          currentStatusConfig.borderColor,
          hasError ? "opacity-70" : "opacity-100",
          isLoading ? "animate-pulse" : ""
        )}
        style={style}
        onClick={handleClick}
        aria-label={`${service?.name || 'Appointment'} with ${client?.name || 'client'} at ${appointment.startTime}`}
        role="button"
        tabIndex={0}
      >
        {/* Colored header with time */}
        <div className={cn(
          currentStatusConfig.headerColor, 
          "text-white px-3 py-1.5 flex items-center justify-between"
        )}>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span className="font-medium text-xs tracking-tight">
              {appointment.startTime} - {appointment.endTime}
            </span>
          </div>
          {renderStatusTag()}
        </div>
        
        {/* Card content */}
        <div className="p-3 bg-white">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : hasError ? (
            <div className="text-rose-500 text-xs flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Could not load appointment details</span>
            </div>
          ) : (
            <>
              {/* Service name */}
              <div className="font-medium text-sm truncate">
                {service?.name || 'Unknown service'}
              </div>
              
              {/* Duration badge */}
              <div className="mt-1.5 mb-2">
                <span className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                  "bg-gray-100 text-gray-700"
                )}>
                  <Clock className="h-2.5 w-2.5" />
                  {duration}
                </span>
              </div>
              
              {/* Client info */}
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-700 truncate">
                  <User className="h-3 w-3 mr-1.5 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{client?.name || 'Unknown client'}</span>
                </div>
                
                {client?.phone && (
                  <div className="flex items-center text-xs text-gray-500 truncate">
                    <Phone className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}
                
                {/* Only show date if available and only on certain views */}
                {appointment.date && (
                  <div className="flex items-center text-xs text-gray-500 truncate">
                    <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{formattedDate}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Modal dialog for appointment details */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={true}>
        <DialogContent className="p-0 !max-w-[1400px] !w-[95vw] h-[90vh] sm:!max-w-[1200px] overflow-hidden three-section-layout">
          <DialogHeader className="sr-only">
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {isDialogOpen && (
            <AppointmentDetailView
              appointment={appointment}
              onClose={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}