'use client';

import { useState, useEffect } from 'react';
import { 
  useBusiness, 
  useBusinessServices, 
  useBusinessAppointments, 
  useBusinessClients,
  useBusinessStaff
} from '@/lib/hooks/use-data';

// Example component that uses all the hooks
export default function DataUsageExample() {
  const [businessId, setBusinessId] = useState<string>('1');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Use all the hooks to fetch data
  const { business, isLoading: isLoadingBusiness } = useBusiness(businessId);
  const { services, isLoading: isLoadingServices } = useBusinessServices(businessId);
  const { appointments, isLoading: isLoadingAppointments } = useBusinessAppointments(businessId, { date });
  const { clients, isLoading: isLoadingClients } = useBusinessClients(businessId);
  const { staff, isLoading: isLoadingStaff } = useBusinessStaff(businessId);

  // Display loading states
  if (isLoadingBusiness || isLoadingServices || isLoadingAppointments || isLoadingClients || isLoadingStaff) {
    return <div className="p-4">Loading data...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{business?.name} Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Services Section */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Services ({services?.length || 0})</h2>
          <ul className="space-y-2">
            {services?.map(service => (
              <li key={service.id} className="border-b pb-2">
                <div className="font-medium">{service.name}</div>
                <div className="text-sm text-gray-600">
                  Duration: {service.duration} min | Price: ${(service.price / 100).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Appointments Section */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">
            Appointments for {date} ({appointments?.length || 0})
          </h2>
          <ul className="space-y-2">
            {appointments?.map(appointment => (
              <li key={appointment.id} className="border-b pb-2">
                <div className="font-medium">
                  {appointment.startTime} - {appointment.endTime}
                </div>
                <div className="text-sm text-gray-600">
                  Status: <span className={`font-medium ${
                    appointment.status === 'Completed' ? 'text-green-600' : 
                    appointment.status === 'Cancelled' ? 'text-red-600' : 
                    'text-blue-600'
                  }`}>{appointment.status}</span>
                </div>
              </li>
            ))}
            {appointments?.length === 0 && (
              <li className="text-gray-500">No appointments scheduled for this date</li>
            )}
          </ul>
        </div>
        
        {/* Staff Section */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Staff ({staff?.length || 0})</h2>
          <ul className="space-y-2">
            {staff?.map(person => (
              <li key={person.id} className="border-b pb-2">
                <div className="font-medium">{person.name}</div>
                <div className="text-sm text-gray-600">{person.email}</div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Clients Section */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Clients ({clients?.length || 0})</h2>
          <ul className="space-y-2">
            {clients?.map(client => (
              <li key={client.id} className="border-b pb-2">
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-gray-600">
                  {client.phone} | Visits: {client.totalVisits}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 