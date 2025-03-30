import useSWR from 'swr';
import { 
  getBusiness, 
  getBusinessServices, 
  getBusinessAppointments, 
  getBusinessClients,
  getBusinessStaff,
  getAppointment
} from '@/lib/api';
import { Business, Service, Appointment, Client, BusinessUser } from '@/types';

// Generic fetcher function
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Custom hook for business data
export function useBusiness(businessId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `business-${businessId}` : null,
    () => businessId ? getBusiness(businessId) : null,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    business: data as Business | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Custom hook for business services
export function useBusinessServices(businessId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `services-${businessId}` : null,
    () => businessId ? getBusinessServices(businessId) : [],
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    services: data as Service[] | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Custom hook for business appointments
export function useBusinessAppointments(businessId: string | undefined, options?: { 
  date?: string, 
  status?: string 
}) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `appointments-${businessId}-${options?.date || ''}-${options?.status || ''}` : null,
    async () => {
      if (!businessId) return [];
      const appointments = await getBusinessAppointments(businessId);
      
      // Apply client-side filtering if options are provided
      if (appointments && (options?.date || options?.status)) {
        return appointments.filter(appointment => {
          let matches = true;
          if (options.date && appointment.date !== options.date) {
            matches = false;
          }
          if (options.status && appointment.status !== options.status) {
            matches = false;
          }
          return matches;
        });
      }
      
      return appointments;
    },
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      dedupingInterval: 15000, // 15 seconds - appointment data needs to be fresher
    }
  );

  return {
    appointments: data as Appointment[] | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Custom hook for a single appointment
export function useAppointment(appointmentId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    appointmentId ? `appointment-${appointmentId}` : null,
    () => appointmentId ? getAppointment(appointmentId) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  return {
    appointment: data as Appointment | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Custom hook for business clients
export function useBusinessClients(businessId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `clients-${businessId}` : null,
    () => businessId ? getBusinessClients(businessId) : [],
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    clients: data as Client[] | undefined,
    isLoading,
    isError: error,
    mutate
  };
}

// Custom hook for business staff
export function useBusinessStaff(businessId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `staff-${businessId}` : null,
    () => businessId ? getBusinessStaff(businessId) : [],
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    staff: data as BusinessUser[] | undefined,
    isLoading,
    isError: error,
    mutate
  };
} 