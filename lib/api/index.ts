// Create this file if it doesn't exist

import { Appointment, AppointmentStatus } from '@/types';
import { updateAppointment as updateAppointmentFromApi } from '@/lib/api';

// Helper function for getting status details
export function getStatusDetails(status: AppointmentStatus) {
  switch (status) {
    case 'Pending':
      return { color: 'bg-yellow-500', text: 'Pending' };
    case 'Arrived':
      return { color: 'bg-green-500', text: 'Arrived' };
    case 'No-Show':
      return { color: 'bg-red-500', text: 'No-Show' };
    case 'Confirmed':
      return { color: 'bg-blue-500', text: 'Confirmed' };
    case 'Completed':
      return { color: 'bg-purple-500', text: 'Completed' };
    case 'Cancelled':
      return { color: 'bg-gray-500', text: 'Cancelled' };
    default:
      return { color: 'bg-gray-500', text: 'Unknown' };
  }
}

// Update appointment status
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<Appointment> {
  try {
    return await updateAppointment(appointmentId, { status });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
}

// Export other functions from the main API file
export * from '@/lib/api';
