import { User, Service, Appointment, Client, AppointmentStatus, BusinessUser, Business, ServiceCategory } from '@/types';

const API_URL = 'http://localhost:3001';

// Track server availability to avoid repeated failed requests
let isServerAvailable = true;
let serverCheckTimeout: NodeJS.Timeout | null = null;

// In-memory cache for API requests with enhanced configuration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  businessId?: string;
}

const apiCache: Record<string, CacheEntry<any>> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for standard data
const CACHE_DURATION_SHORT = 60 * 1000; // 1 minute for frequently changing data like appointments
const CACHE_DURATION_LONG = 30 * 60 * 1000; // 30 minutes for static data like services

// Track pending requests to avoid duplicates
const pendingRequests = new Map<string, Promise<any>>();

// Local storage cache functions
const CACHE_VERSION = '1';

export function saveToLocalCache<T>(key: string, data: T, ttl: number = CACHE_DURATION): void {
  try {
    const item = {
      version: CACHE_VERSION,
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(item));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

export function getFromLocalCache<T>(key: string): T | null {
  try {
    const rawItem = localStorage.getItem(`cache_${key}`);
    if (!rawItem) return null;
    
    const item = JSON.parse(rawItem);
    
    // Check version and expiry
    if (item.version !== CACHE_VERSION || item.expiry < Date.now()) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    
    return item.data;
  } catch {
    return null;
  }
}

// Comprehensive fallback data for when API is unavailable
const FALLBACK_DATA = {
  users: [
    {
      id: '1',
      name: 'Bobby Pin',
      email: 'admin@example.com',
      role: 'admin',
      businessId: '1',
      businessName: "Bobby's Salon",
      isVerified: true
    },
    {
      id: '2',
      name: 'Lorem Ipsum',
      email: 'staff@example.com',
      role: 'staff',
      businessId: '1',
      businessName: "Bobby's Salon",
      isVerified: true
    }
  ],
  businesses: [
    {
      id: '1',
      name: "Bobby's Salon",
      ownerId: '1',
      email: 'admin@example.com'
    }
  ],
  services: [
    {
      id: '1',
      name: 'Haircut',
      duration: 60,
      price: 2000,
      description: 'Classic haircut',
      businessId: '1'
    },
    {
      id: '2',
      name: 'Hair coloring',
      duration: 120,
      price: 5000,
      description: 'Full hair coloring',
      businessId: '1'
    },
    {
      id: '3',
      name: 'Styling',
      duration: 30,
      price: 1500,
      description: 'Hair styling',
      businessId: '1'
    }
  ],
  appointments: [
    {
      id: '1',
      clientId: '1',
      employeeId: '2',
      serviceId: '1',
      date: '2025-03-03',
      startTime: '12:00',
      endTime: '13:00',
      duration: 60,
      status: 'Pending' as AppointmentStatus,
      price: 2000,
      comment: 'First visit',
      businessId: '1'
    },
    {
      id: '2',
      clientId: '2',
      employeeId: '1',
      serviceId: '2',
      date: '2025-03-03',
      startTime: '15:00',
      endTime: '17:00',
      duration: 120,
      status: 'Confirmed' as AppointmentStatus,
      price: 5000,
      businessId: '1'
    }
  ],
  clients: [
    {
      id: '1',
      name: 'John Doe',
      phone: '+7 123 123-13-23',
      email: 'john@example.com',
      totalVisits: 1,
      lastVisit: '2025-02-25T12:00:00',
      notes: 'New client',
      businessId: '1'
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '+7 987 654-32-10',
      email: 'jane@example.com',
      totalVisits: 5,
      lastVisit: '2025-02-20T14:30:00',
      notes: 'Prefers natural dyes',
      businessId: '1'
    }
  ],
  serviceCategories: [
    {
      id: '1',
      name: 'Haircut',
      description: 'Hair cutting services',
      color: '#4f46e5',
      businessId: '1'
    },
    {
      id: '2',
      name: 'Styling',
      description: 'Hair styling services',
      color: '#8b5cf6',
      businessId: '1'
    },
    {
      id: '3',
      name: 'Color',
      description: 'Hair coloring services',
      color: '#ec4899',
      businessId: '1'
    }
  ]
};

// Function to load fallback data from localStorage
function loadFallbackDataFromStorage() {
  try {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('fallback_data');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Merge with default FALLBACK_DATA structure to ensure all properties exist
        Object.keys(parsedData).forEach(key => {
          if (FALLBACK_DATA[key as keyof typeof FALLBACK_DATA]) {
            (FALLBACK_DATA as any)[key] = parsedData[key];
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading fallback data from localStorage:', error);
  }
}

// Function to save fallback data to localStorage
function saveFallbackDataToStorage() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fallback_data', JSON.stringify(FALLBACK_DATA));
    }
  } catch (error) {
    console.error('Error saving fallback data to localStorage:', error);
  }
}

// Load fallback data from localStorage on initialization
if (typeof window !== 'undefined') {
  loadFallbackDataFromStorage();
  
  // Set up event listener for beforeunload to ensure data is saved
  window.addEventListener('beforeunload', saveFallbackDataToStorage);
}

// Function to get all instances of an entity from fallback data
function getFallbackData<T>(entityName: keyof typeof FALLBACK_DATA, filter?: Record<string, any>): T[] {
  const data = FALLBACK_DATA[entityName] as any[];
  
  if (!filter) {
    return data as T[];
  }
  
  // Apply filtering logic similar to JSON Server
  return data.filter(item => {
    for (const [key, value] of Object.entries(filter)) {
      if (item[key] !== value) {
        return false;
      }
    }
    return true;
  }) as T[];
}

// Function to get a single entity from fallback data
function getFallbackItem<T>(entityName: keyof typeof FALLBACK_DATA, id: string): T | null {
  const items = FALLBACK_DATA[entityName] as any[];
  return items.find(item => item.id === id) as T || null;
}

// Function to create new entity in fallback data
function createFallbackItem<T>(entityName: keyof typeof FALLBACK_DATA, item: any): T {
  const newItem = {
    id: `mock-${Date.now()}`,
    ...item
  };
  (FALLBACK_DATA[entityName] as any[]).push(newItem);
  saveFallbackDataToStorage(); // Save after creating
  return newItem as T;
}

// Function to update entity in fallback data
function updateFallbackItem<T>(entityName: keyof typeof FALLBACK_DATA, id: string, updates: any): T | null {
  const items = FALLBACK_DATA[entityName] as any[];
  const index = items.findIndex(item => item.id === id);
  if (index < 0) return null;
  
  items[index] = { ...items[index], ...updates };
  saveFallbackDataToStorage(); // Save after updating
  return items[index] as T;
}

// Function to delete entity in fallback data
function deleteFallbackItem(entityName: keyof typeof FALLBACK_DATA, id: string): boolean {
  const items = FALLBACK_DATA[entityName] as any[];
  const initialLength = items.length;
  
  // Filter out the item with the given ID
  FALLBACK_DATA[entityName] = items.filter(item => item.id !== id) as any;
  
  const succeeded = initialLength > (FALLBACK_DATA[entityName] as any[]).length;
  if (succeeded) {
    saveFallbackDataToStorage(); // Save after deleting
  }
  return succeeded;
}

// Check if the server is available
async function checkServerAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health-check`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // Shorter timeout to quickly determine if server is down
      signal: AbortSignal.timeout(2000)
    });
    
    isServerAvailable = response.ok;
    return isServerAvailable;
  } catch (error) {
    console.warn('Server not available:', error);
    isServerAvailable = false;
    
    // Schedule a retry after some time
    if (!serverCheckTimeout) {
      serverCheckTimeout = setTimeout(() => {
        serverCheckTimeout = null;
        checkServerAvailability();
      }, 30000); // Retry after 30 seconds
    }
    
    return false;
  }
}

// Initialize server check
checkServerAvailability();

// Function to handle fallback data for endpoints
function getFallbackForEndpoint<T>(endpoint: string, businessId?: string): T {
  // Parse endpoint components
  const parts = endpoint.split('/').filter(Boolean);
  const baseName = parts[0];
  const id = parts.length > 1 ? parts[1]?.split('?')[0] : null;
  
  // Parse query parameters if any
  const queryParams: Record<string, any> = {};
  if (endpoint.includes('?')) {
    const queryString = endpoint.split('?')[1];
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        queryParams[key] = value;
      }
    });
  }
  
  // Add businessId to query params if provided and not already present
  if (businessId && !queryParams.businessId) {
    queryParams.businessId = businessId;
  }
  
  // Handle different endpoints
  if (endpoint.startsWith('business-data/') && id) {
    // For business-data endpoint, return a comprehensive dataset
    const business = getFallbackItem<Business>('businesses', id);
    const users = getFallbackData<BusinessUser>('users', { businessId: id });
    const services = getFallbackData<Service>('services', { businessId: id });
    const appointments = getFallbackData<Appointment>('appointments', { businessId: id });
    const clients = getFallbackData<Client>('clients', { businessId: id });
    const serviceCategories = getFallbackData<ServiceCategory>('serviceCategories', { businessId: id });
    
    return {
      business,
      users,
      services,
      appointments,
      clients,
      serviceCategories
    } as unknown as T;
  }
  
  // Handle entity name mapping
  const entityNameMap: Record<string, keyof typeof FALLBACK_DATA> = {
    'users': 'users',
    'services': 'services',
    'appointments': 'appointments',
    'clients': 'clients',
    'businesses': 'businesses',
    'serviceCategories': 'serviceCategories'
  };
  
  const entityName = entityNameMap[baseName];
  
  if (!entityName || !FALLBACK_DATA[entityName]) {
    console.error(`No fallback data for ${baseName || 'undefined entity'}`);
    return (Array.isArray(FALLBACK_DATA[Object.keys(FALLBACK_DATA)[0] as keyof typeof FALLBACK_DATA]) ? [] : {}) as unknown as T;
  }
  
  // Return appropriate fallback data
  if (id) {
    // For single entity requests
    return getFallbackItem(entityName, id) as unknown as T;
  } else {
    // For collection requests, with filtering
    return getFallbackData(entityName, queryParams) as unknown as T;
  }
}

// Enhanced fetchAPI function with deduplication, local storage, and optimized caching
export async function fetchAPI<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  bypassCache: boolean = false,
  businessId?: string,
  cacheDuration: number = CACHE_DURATION
): Promise<T> {
  try {
    // Build cache key based on endpoint and options
    const cacheKey = `${endpoint}:${options.method || 'GET'}:${JSON.stringify(options.body || {})}`;
    
    // For GET requests, check localStorage first (fastest)
    if (!bypassCache && !['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      const localData = getFromLocalCache<T>(cacheKey);
      if (localData) {
        return localData;
      }
    }
    
    // Check for duplicate in-flight requests to avoid redundant API calls
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey) as Promise<T>;
    }
    
    // Check memory cache for non-mutating requests
    if (!bypassCache && !['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      const cachedData = apiCache[cacheKey];
      if (cachedData && (Date.now() - cachedData.timestamp < cacheDuration)) {
        // Return cached data if business ID matches or no business filter is needed
        if (!businessId || cachedData.businessId === businessId) {
          return cachedData.data;
        }
      }
    }

    // First, check if we know the server is down before making the request
    if (!isServerAvailable) {
      console.log(`Server is known to be down, using fallback data for ${endpoint}`);
      // If we know the server is unavailable, directly use fallback data
      return getFallbackForEndpoint<T>(endpoint, businessId);
    }

    // Create the promise for this request
    const requestPromise = (async () => {
      try {
        // Set up common headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...((options.headers as Record<string, string>) || {})
        };

        // Add auth token if available
        const token = getAuthToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Prepare the full URL
        let url = `${API_URL}/${endpoint}`;

        // Add business ID to query params for business-specific endpoints if not already in URL
        if (businessId && !url.includes('businessId=') && !url.includes('/business-data/')) {
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}businessId=${businessId}`;
        }

        // Make the request with improved timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
        
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '5';
          const retryMs = parseInt(retryAfter) * 1000;
          console.warn(`Rate limited. Retrying after ${retryMs}ms`);
          await new Promise(resolve => setTimeout(resolve, retryMs));
          return fetchAPI<T>(endpoint, options, bypassCache, businessId); // Retry
        }

        // For 404 on GET requests, return empty array or object
        if (response.status === 404 && (options.method === 'GET' || !options.method)) {
          if (Array.isArray(endpoint.split('?')[0].split('/').pop())) {
            return [] as unknown as T;
          }
          return {} as T;
        }

        // Handle server errors
        if (response.status >= 500) {
          console.error(`Server error: ${response.status} for ${url}`);
          isServerAvailable = false;
          
          // Schedule a server check
          if (!serverCheckTimeout) {
            serverCheckTimeout = setTimeout(() => {
              serverCheckTimeout = null;
              checkServerAvailability();
            }, 30000);
          }
          
          return getFallbackForEndpoint<T>(endpoint, businessId);
        }

        // Handle other error responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(`API error: ${response.status} ${response.statusText}`);
          (error as any).status = response.status;
          (error as any).data = errorData;
          throw error;
        }

        // Parse response
        const data = await response.json() as T;
        
        // Save to localStorage for fastest future retrieval (GET requests only)
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
          saveToLocalCache(cacheKey, data, cacheDuration);
        }
        
        // Only cache GET requests in memory
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
          apiCache[cacheKey] = {
            data,
            timestamp: Date.now(),
            businessId
          };
        } else {
          // Invalidate cache after mutations
          Object.keys(apiCache).forEach(key => {
            if (key.startsWith(endpoint.split('/')[0])) {
              delete apiCache[key];
            }
          });
          
          // Clear related localStorage cache after mutations
          if (typeof window !== 'undefined') {
            try {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith(`cache_${endpoint.split('/')[0]}`)) {
                  localStorage.removeItem(key);
                }
              });
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        }

        return data;
      } catch (error) {
        // Client error is thrown
        if ((error as any).status && (error as any).status < 500) {
          throw error;
        }
        
        console.error(`API request failed for ${endpoint}:`, error);
        
        // For network errors, mark server as unavailable
        if (error instanceof TypeError || (error as any).name === 'AbortError') {
          isServerAvailable = false;
          
          // Schedule a server check
          if (!serverCheckTimeout) {
            serverCheckTimeout = setTimeout(() => {
              serverCheckTimeout = null;
              checkServerAvailability();
            }, 30000);
          }
        }
        
        // Return fallback data
        return getFallbackForEndpoint<T>(endpoint, businessId);
      } finally {
        // Remove from pending requests when done
        pendingRequests.delete(cacheKey);
      }
    })();
    
    // Store for deduplication
    pendingRequests.set(cacheKey, requestPromise);
    
    return requestPromise;
  } catch (error) {
    console.error(`Unexpected error in fetchAPI for ${endpoint}:`, error);
    return getFallbackForEndpoint<T>(endpoint, businessId);
  }
}

// Optimized business data retrieval with field selection
export async function getBusinessData(businessId: string, fields?: string[]) {
  const fieldsParam = fields ? `?_fields=${fields.join(',')}` : '';
  return fetchAPI<{
    business: Business;
    users: BusinessUser[];
    services: Service[];
    appointments: Appointment[];
    clients: Client[];
    serviceCategories: ServiceCategory[];
  }>(`business-data/${businessId}${fieldsParam}`, {}, false, businessId, CACHE_DURATION_LONG);
}

// Fast dashboard data for UI with minimal fields
export async function getBusinessDashboard(businessId: string) {
  return fetchAPI<{
    id: string;
    name: string;
    stats: {
      totalStaff: number;
      totalServices: number;
      totalClients: number;
      todayAppointmentCount: number;
      totalRevenue: number;
    };
    todayAppointments: Appointment[];
  }>(`businesses/${businessId}/summary`, {}, false, businessId, CACHE_DURATION_SHORT);
}

// Get optimized appointment view with client and service details
export async function getAppointmentsWithDetails(
  businessId: string,
  page: number = 1,
  limit: number = 20
) {
  return fetchAPI<{
    data: any[];
    meta: {
      totalCount: number;
      page: number;
      limit: number;
      pageCount: number;
    }
  }>(`appointments-with-details?businessId=${businessId}&page=${page}&limit=${limit}`, 
      {}, false, businessId, CACHE_DURATION_SHORT);
}

// Get appointment calendar data in optimized format
export async function getAppointmentCalendar(
  businessId: string,
  startDate: string,
  endDate: string
) {
  return fetchAPI<Record<string, Appointment[]>>(
    `appointment-calendar?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`,
    {}, false, businessId, CACHE_DURATION_SHORT
  );
}

// Helper function for getting status details (color and text)
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
    default:
      return { color: 'bg-gray-500', text: 'Unknown' };
  }
}

// Get the auth token
const getAuthToken = () => localStorage.getItem('auth_token');

// Function to get business ID
const getBusinessId = () => {
  try {
    // Check if we're in a browser environment before accessing localStorage
    if (typeof window === 'undefined') return null;
    
    // First try to get directly from business_id localStorage item
    const directBusinessId = localStorage.getItem('business_id');
    if (directBusinessId) {
      return directBusinessId;
    }
    
    // If not found, try to extract from the user object
    const user = localStorage.getItem('currentUser');
    if (!user) return null;
    
    const userData = JSON.parse(user);
    const businessId = userData.businessId;
    
    // If found in user object, store it directly for future use
    if (businessId) {
      localStorage.setItem('business_id', businessId.toString());
    }
    
    return businessId;
  } catch (error) {
    console.error('Error getting business ID:', error);
    return null;
  }
};

// Users
export const getUsers = () => fetchAPI<User[]>('users');
export const getUser = (id: string) => fetchAPI<User>(`users/${id}`);
export const createUser = (user: Omit<User, 'id'>) => 
  fetchAPI<User>('users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
export const updateUser = (id: string, user: Partial<User>) => 
  fetchAPI<User>(`users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
export const deleteUser = (id: string) => 
  fetchAPI<{}>(`users/${id}`, { method: 'DELETE' });

// Services
export const getServices = () => fetchAPI<Service[]>('services');
export const getService = (id: string) => fetchAPI<Service>(`services/${id}`);
export const createService = (service: Omit<Service, 'id'>) => 
  fetchAPI<Service>('services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service)
  });
  
// Update service
export async function updateService(
  id: string,
  service: Partial<Service>
): Promise<Service> {
  try {
    // First try to get the current service state
    const currentService = await fetchAPI<Service>(`/services/${id}?_=${Date.now()}`);
    
    // Merge the current data with the update data
    const updatedData = {
      ...currentService,
      ...service
    };
    
    // Then update it
    const updatedService = await fetchAPI<Service>(`/services/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    });
    
    return updatedService;
  } catch (error) {
    console.error('[updateService] Error updating service:', error);
    throw new Error(`Failed to update service: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const deleteService = (id: string) => 
  fetchAPI(`services/${id}`, { method: 'DELETE' });

// Appointments
export const getAppointments = () => fetchAPI<Appointment[]>('appointments');
export const getAppointment = (id: string) => fetchAPI<Appointment>(`appointments/${id}`);

// Optimized appointment scheduling
export const scheduleAppointment = async (
  appointment: Omit<Appointment, 'id' | 'status' | 'endTime'>
): Promise<Appointment> => {
  try {
    // First, ensure we have a business ID
    if (!appointment.businessId) {
      appointment.businessId = getBusinessId();
      
      if (!appointment.businessId) {
        throw new Error('No business ID found for scheduling appointment');
      }
    }
    
    // Use the optimized endpoint for scheduling
    return await fetchAPI<Appointment>('schedule-appointment', {
      method: 'POST',
      body: JSON.stringify(appointment),
    }, true); // Bypass cache to ensure fresh data
  } catch (error) {
    // Enhanced error handling with specific error messages
    if ((error as any).status === 409) {
      throw new Error('This time slot is already booked. Please select another time.');
    }
    
    if ((error as any).status === 400) {
      const errorData = (error as any).data || {};
      throw new Error(errorData.error || 'Invalid appointment data');
    }
    
    if ((error as any).status === 404) {
      throw new Error('Service, employee, or client not found');
    }
    
    console.error('Failed to schedule appointment:', error);
    throw new Error('Failed to schedule appointment. Please try again later.');
  }
};

// Create an appointment with fallback to the regular endpoint
export const createAppointment = (appointment: Omit<Appointment, 'id'>) => {
  try {
    // Try the optimized scheduling endpoint first if appropriate
    if (!appointment.endTime && appointment.serviceId && appointment.date && appointment.startTime) {
      return scheduleAppointment(appointment as Omit<Appointment, 'id' | 'status' | 'endTime'>);
    }
    
    // Fall back to the regular endpoint
    return fetchAPI<Appointment>('appointments', {
      method: 'POST',
      body: JSON.stringify(appointment)
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = (id: string, appointment: Partial<Appointment>) => 
  fetchAPI<Appointment>(`appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointment)
  });
export const updateAppointmentStatus = (id: string, status: AppointmentStatus) => 
  fetchAPI<Appointment>(`appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
export const deleteAppointment = (id: string) => 
  fetchAPI<{}>(`appointments/${id}`, { method: 'DELETE' });

// Clients
export const getClients = () => fetchAPI<Client[]>('clients');
export const getClient = (id: string) => fetchAPI<Client>(`clients/${id}`);
export const createClient = async (client: Omit<Client, 'id' | 'totalVisits' | 'lastVisit'>) => {
  const clientToCreate = {
    ...client,
    id: Math.random().toString(36).substring(2, 9), // Generate a string ID
    totalVisits: 0,
    lastVisit: new Date().toISOString(),
    businessId: client.businessId.toString() // Ensure businessId is a string
  };
  
  return fetchAPI<Client>('clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientToCreate)
  });
};
export const updateClient = (id: string, client: Partial<Client>) => 
  fetchAPI<Client>(`clients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(client)
  });
export const deleteClient = (id: string) => 
  fetchAPI(`clients/${id}`, { method: 'DELETE' });

// Business-specific API functions
export const getBusinessServices = async (businessId?: string): Promise<Service[]> => {
  if (!businessId) {
    businessId = getBusinessId();
  }
  
  if (!businessId) {
    console.warn('getBusinessServices called without businessId');
    return [];
  }
  
  try {
    // Try to get comprehensive business data first (more efficient)
    const businessData = await getBusinessData(businessId);
    if (businessData?.services) {
      return businessData.services;
    }
    
    // Fallback to direct service lookup
    return await fetchAPI<Service[]>(`services?businessId=${businessId}`);
  } catch (error) {
    console.error('Failed to fetch business services:', error);
    return [];
  }
};

// Get business appointments with improved performance
export const getBusinessAppointments = async (businessId?: string) => {
  if (!businessId) {
    businessId = getBusinessId();
  }
  
  if (!businessId) {
    console.warn('getBusinessAppointments called without businessId');
    return [];
  }
  
  try {
    // Try to get comprehensive business data first (more efficient)
    const businessData = await getBusinessData(businessId);
    if (businessData?.appointments) {
      return businessData.appointments;
    }
    
    // Fallback to direct appointment lookup
    return await fetchAPI<Appointment[]>(`appointments?businessId=${businessId}`);
  } catch (error) {
    console.error('Failed to fetch business appointments:', error);
    return [];
  }
};

// Get business clients with improved performance
export const getBusinessClients = async (businessId?: string) => {
  if (!businessId) {
    businessId = getBusinessId();
  }
  
  if (!businessId) {
    console.warn('getBusinessClients called without businessId');
    return [];
  }
  
  try {
    // Try to get comprehensive business data first (more efficient)
    const businessData = await getBusinessData(businessId);
    if (businessData?.clients) {
      return businessData.clients;
    }
    
    // Fallback to direct client lookup
    return await fetchAPI<Client[]>(`clients?businessId=${businessId}`);
  } catch (error) {
    console.error('Failed to fetch business clients:', error);
    return [];
  }
};

// Get business staff with improved performance
export const getBusinessStaff = async (businessId?: string) => {
  if (!businessId) {
    businessId = getBusinessId();
  }
  
  if (!businessId) {
    console.warn('getBusinessStaff called without businessId');
    return [];
  }
  
  try {
    // Try to get comprehensive business data first (more efficient)
    const businessData = await getBusinessData(businessId);
    if (businessData?.users) {
      return businessData.users.filter(user => user.role === 'staff');
    }
    
    // Fallback to direct staff lookup
    return await fetchAPI<BusinessUser[]>(`users?businessId=${businessId}&role=staff`);
  } catch (error) {
    console.error('Failed to fetch business staff:', error);
    return [];
  }
};

// Get business service categories with improved performance
export const getBusinessServiceCategories = async (businessId?: string) => {
  if (!businessId) {
    businessId = getBusinessId();
  }
  
  if (!businessId) {
    console.warn('getBusinessServiceCategories called without businessId');
    return defaultCategories();
  }
  
  try {
    // Try to get comprehensive business data first (more efficient)
    const businessData = await getBusinessData(businessId);
    if (businessData?.serviceCategories) {
      return businessData.serviceCategories;
    }
    
    // Fallback to direct category lookup
    const categories = await fetchAPI<ServiceCategory[]>(`serviceCategories?businessId=${businessId}`);
    return categories.length > 0 ? categories : defaultCategories();
  } catch (error) {
    console.error('Failed to fetch service categories:', error);
    return defaultCategories();
  }
};

// Business API functions
export const getBusiness = (id: string) => fetchAPI<Business>(`businesses/${id}`);
export const getBusinessById = (id: string) => fetchAPI<Business>(`businesses/${id}`);

// Service Categories API functions

export const createServiceCategory = async (category: Omit<ServiceCategory, 'id' | 'businessId'>) => {
  try {
    // Get the business ID using the existing helper function
    const businessId = getBusinessId();
    
    if (!businessId) {
      console.error('No business ID found');
      throw new Error('Business ID not found');
    }
    
    // Add businessId to the category data
    const categoryData = {
      ...category,
      businessId: businessId.toString()
    };
    
    // Call the API to create the category
    const response = await fetch(`${API_URL}/serviceCategories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(categoryData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create category: ${response.statusText}`);
    }
    
    // Parse and return the created category
    return await response.json();
  } catch (error) {
    console.error('Error creating service category:', error);
    throw error;
  }
};

export const updateServiceCategory = async (id: string, category: Partial<Omit<ServiceCategory, 'id' | 'businessId'>>) => {
  try {
    // Call the API to update the category
    const response = await fetch(`${API_URL}/serviceCategories/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(category)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update category: ${response.statusText}`);
    }
    
    // Parse and return the updated category
    return await response.json();
  } catch (error) {
    console.error('Error updating service category:', error);
    throw error;
  }
};

export const deleteServiceCategory = async (id: string) => {
  try {
    // Call the API to delete the category
    const response = await fetch(`${API_URL}/serviceCategories/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete category: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting service category:', error);
    throw error;
  }
};

/**
 * Send a reminder message to a client for their appointment
 * @param appointmentId The ID of the appointment
 * @returns Promise<boolean> Success status
 */
export async function sendReminderMessage(appointmentId: string): Promise<boolean> {
  try {
    // This would connect to your notification service
    // For now, we'll simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, you would:
    // 1. Get the appointment details including client contact info
    // 2. Generate the appropriate message
    // 3. Send via the appropriate channel (SMS/email)
    // 4. Log the notification in your database
    
    return true;
  } catch (error) {
    console.error('Error sending reminder:', error);
    throw new Error('Failed to send reminder');
  }
}

/**
 * Update payment status for an appointment
 * @param appointmentId The ID of the appointment
 * @param isPaid Whether the appointment is paid
 * @returns Promise<boolean> Success status
 */
export async function updatePaymentStatus(appointmentId: string, isPaid: boolean): Promise<boolean> {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real implementation, you would update the payment status in your database
    return true;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw new Error('Failed to update payment status');
  }
}

/**
 * Get appointment history for a client
 * @param clientId The ID of the client
 * @returns Promise<Appointment[]> List of appointments
 */
export async function getClientAppointmentHistory(clientId: string): Promise<Appointment[]> {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // This would fetch from your API
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching client appointment history:', error);
    throw new Error('Failed to fetch client appointment history');
  }
}

// Default categories as fallback
const defaultCategories = () => {
  return [
    {
      id: '1',
      name: 'Haircut',
      description: 'Hair cutting services',
      color: '#4f46e5',
    },
    {
      id: '2',
      name: 'Styling',
      description: 'Hair styling services',
      color: '#8b5cf6',
    },
    {
      id: '3',
      name: 'Color',
      description: 'Hair coloring services',
      color: '#ec4899',
    },
    {
      id: '4',
      name: 'Treatment',
      description: 'Hair treatment services',
      color: '#f59e0b',
    }
  ];
};

// Types for batch operations
export type BatchOperation = {
  type: 'create' | 'read' | 'update' | 'delete';
  entity: string;
  id?: string;
  data?: any;
};

export type BatchResult = {
  results: Array<{
    success?: boolean;
    error?: string;
    entity?: string;
    id?: string;
    data?: any;
    operation?: BatchOperation;
  }>;
};

// Batch operations for better performance
export const batchOperations = async (operations: BatchOperation[]): Promise<BatchResult> => {
  try {
    return await fetchAPI<BatchResult>('batch', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    }, true); // Bypass cache to ensure fresh data
  } catch (error) {
    console.error('Batch operations failed:', error);
    throw new Error('Failed to perform batch operations');
  }
};

// Helper for creating multiple entities in one request
export const createBatch = async <T>(
  entity: string, 
  items: Omit<T, 'id'>[],
  businessId?: string
): Promise<T[]> => {
  // Ensure business ID if applicable
  const bId = businessId || getBusinessId();
  
  // Prepare operations
  const operations: BatchOperation[] = items.map(item => ({
    type: 'create',
    entity,
    data: {
      ...item,
      ...(bId ? { businessId: bId } : {})
    }
  }));
  
  try {
    // Perform batch operation
    const result = await batchOperations(operations);
    
    // Extract created items
    const createdItems = result.results
      .filter(r => r.success && r.entity === entity)
      .map(r => r.data);
    
    return createdItems as T[];
  } catch (error) {
    console.error(`Failed to create batch of ${entity}:`, error);
    throw new Error(`Failed to create ${entity} items`);
  }
};

// Example: Create multiple clients in one request
export const createClients = (clients: Omit<Client, 'id' | 'totalVisits'>[]): Promise<Client[]> => {
  return createBatch<Client>('clients', clients.map(client => ({
    ...client,
    totalVisits: 0
  })));
};

// Example: Create multiple appointments in one request
export const createAppointmentBatch = (appointments: Omit<Appointment, 'id' | 'status'>[]): Promise<Appointment[]> => {
  return createBatch<Appointment>('appointments', appointments.map(appointment => ({
    ...appointment,
    status: 'Pending' as AppointmentStatus
  })));
};