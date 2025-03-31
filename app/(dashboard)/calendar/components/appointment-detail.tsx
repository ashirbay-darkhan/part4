'use client';

import { useEffect, useState } from 'react';
import { AppointmentModal } from '@/components/appointments/appointment-modal';
import { Appointment, Service, Client } from '@/types';
import { getBusinessServices, getBusinessClients } from '@/lib/api';
import { useAuth } from '@/lib/auth/authContext';
import { toast } from 'sonner';

interface AppointmentDetailProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (appointment: Appointment) => void;
}

export function AppointmentDetail({ 
  appointment, 
  isOpen, 
  onClose, 
  onUpdate 
}: AppointmentDetailProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      if (!user?.businessId) return;
      
      setIsLoading(true);
      try {
        const [servicesData, clientsData] = await Promise.all([
          getBusinessServices(user.businessId),
          getBusinessClients(user.businessId)
        ]);
        
        setServices(servicesData);
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading appointment data:', error);
        toast.error('Could not load appointment details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && appointment) {
      loadData();
    }
  }, [isOpen, appointment, user]);

  if (isLoading || !appointment) {
    return null;
  }

  return (
    <AppointmentModal
      isOpen={isOpen}
      onClose={onClose}
      appointment={appointment}
      services={services}
      clients={clients}
      onUpdate={onUpdate}
    />
  );
}
