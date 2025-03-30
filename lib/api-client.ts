import { User, Service, Appointment, Client, AppointmentStatus, BusinessUser, Business } from '@/types';

const API_URL = 'http://localhost:3001';

// Simple lightweight fetch wrapper with error handling
export async function fetchData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    // Normalize endpoint to start with a slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Add auth token if available
    let headers = new Headers(options.headers);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && !headers.has('Authorization')) {
        headers.append('Authorization', `Bearer ${token}`);
      }
    }
    
    // Make the request
    const response = await fetch(`${API_URL}${normalizedEndpoint}`, {
      ...options,
      headers,
      // Add cache control headers
      cache: 'no-store' // Disable cache for API calls
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
}

// Simplified core API functions
export const getBusiness = (id: string): Promise<Business> => 
  fetchData<Business>(`businesses/${id}`);

export const getBusinessServices = (businessId: string): Promise<Service[]> => 
  fetchData<Service[]>(`services?businessId=${businessId}`);

export const updateBusiness = (id: string, data: Partial<Business>): Promise<Business> => 
  fetchData<Business>(`businesses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// Add more simplified API functions for other entities
export const getBusinessAppointments = (businessId: string): Promise<Appointment[]> => 
  fetchData<Appointment[]>(`appointments?businessId=${businessId}`);

export const getAppointment = (id: string): Promise<Appointment> => 
  fetchData<Appointment>(`appointments/${id}`);

export const getBusinessClients = (businessId: string): Promise<Client[]> => 
  fetchData<Client[]>(`clients?businessId=${businessId}`);

export const getBusinessStaff = (businessId: string): Promise<BusinessUser[]> => 
  fetchData<BusinessUser[]>(`users?businessId=${businessId}&role=staff`);

export const createAppointment = (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => 
  fetchData<Appointment>('appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointment),
  });

export const updateAppointment = (id: string, data: Partial<Appointment>): Promise<Appointment> => 
  fetchData<Appointment>(`appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const createService = (service: Omit<Service, 'id'>): Promise<Service> => 
  fetchData<Service>('services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  });

export const updateService = (id: string, data: Partial<Service>): Promise<Service> => 
  fetchData<Service>(`services/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const createClient = (client: Omit<Client, 'id' | 'totalVisits' | 'lastVisit'>): Promise<Client> => 
  fetchData<Client>('clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...client,
      totalVisits: 0,
      lastVisit: new Date().toISOString(),
    }),
  });

export const updateClient = (id: string, data: Partial<Client>): Promise<Client> => 
  fetchData<Client>(`clients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
