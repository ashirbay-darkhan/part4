import { User, Service, Appointment, Client, AppointmentStatus, BusinessUser, Business, ServiceCategory } from '@/types';

const API_URL = 'http://localhost:3001';

// Track server availability to avoid repeated failed requests
let isServerAvailable = true;
let serverCheckTimeout: NodeJS.Timeout | null = null;

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
    const response = await fetch(`${API_URL}/users?_limit=1`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(1000) // 1 second timeout
    });
    
    isServerAvailable = response.ok;
    return isServerAvailable;
  } catch (error) {
    console.log('Server appears to be down, using fallback data');
    isServerAvailable = false;
    
    // Schedule a re-check in 30 seconds
    if (!serverCheckTimeout) {
      serverCheckTimeout = setTimeout(() => {
        checkServerAvailability();
        serverCheckTimeout = null;
      }, 30000);
    }
    
    return false;
  }
}

// Function to check server availability and fetch data, with local fallback
export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Make sure endpoint starts with a slash
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Parse the endpoint to get the entity type (e.g., /users -> users)
  let entityName = normalizedEndpoint.split('/')[1]?.split('?')[0];
  
  // Handle endpoints like /services/123 by extracting the base entity
  if (entityName && /^\d+$/.test(entityName)) {
    entityName = normalizedEndpoint.split('/')[0];
  }
  
  // For businesses specifically, extract the right entity name
  if (normalizedEndpoint.startsWith('/businesses/')) {
    entityName = 'businesses';
  }
  
  // Check if server is available or use cached result
  if (!isServerAvailable) {
    if (serverCheckTimeout === null) {
      // Schedule a check to see if server is back online
      serverCheckTimeout = setTimeout(async () => {
        isServerAvailable = await checkServerAvailability();
        serverCheckTimeout = null;
      }, 30000); // Check every 30 seconds
    }
    
    // Use fallback data
    return getFallbackForEndpoint<T>(normalizedEndpoint, entityName as keyof typeof FALLBACK_DATA);
  }
  
  // Get auth token from localStorage
  let headers = new Headers(options.headers);
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers.has('Authorization')) {
      headers.append('Authorization', `Bearer ${token}`);
    }
  }
  
  // Prepare the fetch options with headers
  const fetchOptions = {
    ...options,
    headers
  };
  
  try {
    // Use the normalized endpoint with API URL
    const response = await fetch(`${API_URL}${normalizedEndpoint}`, fetchOptions);
    
    // Handle 404 errors for specific entities more gracefully
    if (response.status === 404) {
      // Special handling for business lookups - return fallback business data
      if (normalizedEndpoint.startsWith('/businesses/')) {
        const businessId = normalizedEndpoint.split('/')[2]?.split('?')[0];
        if (businessId) {
          // Try to find the business in our fallback data
          const fallbackBusiness = getFallbackItem('businesses', businessId);
          if (fallbackBusiness) {
            return fallbackBusiness as unknown as T;
          }
          
          // If not found in fallback data, return the first business as default
          const businesses = FALLBACK_DATA.businesses;
          if (businesses && businesses.length > 0) {
            return businesses[0] as unknown as T;
          }
        }
      }
      
      // For other entities on 404, return an empty result without failing
      if (entityName && ['services', 'clients', 'appointments'].includes(entityName)) {
        return (Array.isArray(FALLBACK_DATA[entityName as keyof typeof FALLBACK_DATA]) ? [] : {}) as unknown as T;
      }
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Error fetching from ${normalizedEndpoint}:`, error);
    
    // Mark server as unavailable if we can't connect
    isServerAvailable = false;
    
    if (serverCheckTimeout === null) {
      // Schedule a check to see if server is back online
      serverCheckTimeout = setTimeout(async () => {
        isServerAvailable = await checkServerAvailability();
        serverCheckTimeout = null;
      }, 30000); // Check every 30 seconds
    }
    
    // Return fallback data
    return getFallbackForEndpoint<T>(normalizedEndpoint, entityName as keyof typeof FALLBACK_DATA);
  }
}

// Function to handle fallback data for endpoints
function getFallbackForEndpoint<T>(endpoint: string, entityName: keyof typeof FALLBACK_DATA): T {
  // Ensure we have a clean endpoint to parse (remove leading slash if present)
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Parse endpoint components
  const parts = cleanEndpoint.split('/').filter(Boolean);
  const baseName = parts[0];
  const id = parts.length > 1 ? parts[1]?.split('?')[0] : null;
  
  // Parse query parameters if any
  const queryParams: Record<string, any> = {};
  if (cleanEndpoint.includes('?')) {
    const queryString = cleanEndpoint.split('?')[1];
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        queryParams[key] = value;
      }
    });
  }
  
  // Handle different HTTP methods
  if (!entityName || !FALLBACK_DATA[entityName]) {
    console.error(`No fallback data for ${entityName || 'undefined entity'}`);
    return [] as unknown as T;
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
export const createAppointment = (appointment: Omit<Appointment, 'id'>) => {
  // Ensure businessId is set
  const businessId = appointment.businessId || getBusinessId();
  if (!businessId) throw new Error('No business ID found');
  
  return fetchAPI<Appointment>('appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...appointment,
      businessId
    })
  });
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
  // Get the business ID
  const bId = businessId || getBusinessId();
  
  console.log('[getBusinessServices] Starting getBusinessServices with businessId:', bId);
  
  if (!bId) {
    console.error('[getBusinessServices] No business ID found');
    
    // Try to get the ID directly from localStorage and user data as fallback
    if (typeof window !== 'undefined') {
      const directId = localStorage.getItem('business_id');
      const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
      console.log('[getBusinessServices] Debug - directId:', directId);
      console.log('[getBusinessServices] Debug - userData:', userData);
      
      if (userData.businessId) {
        // Force refresh the business ID in localStorage
        localStorage.setItem('business_id', userData.businessId.toString());
        console.log('[getBusinessServices] Updated business_id in localStorage to:', userData.businessId);
        return getBusinessServices(userData.businessId); // Retry with the correct ID
      }
    }
    
    throw new Error('No business ID found');
  }
  
  console.log(`[getBusinessServices] Fetching services for business ID: ${bId}`);
  
  try {
    // Add cache-busting timestamp to completely bypass browser cache
    const timestamp = Date.now();
    
    // Try first with the query parameter approach
    const response = await fetch(`${API_URL}/services?businessId=${bId}&_=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }
    
    const services = await response.json();
    
    // Check if we got filtered results - if not, we'll do manual filtering
    if (Array.isArray(services) && services.length > 0) {
      console.log(`[getBusinessServices] Found ${services.length} services from query param filter`);
      
      // Double-check businessId just to be sure
      const filteredServices = services.filter(service => 
        service.businessId && service.businessId.toString() === bId.toString()
      );
      
      if (filteredServices.length !== services.length) {
        console.warn(`[getBusinessServices] Query filtering returned inconsistent results, using manual filter instead`);
        return await getBusinessServicesManual(bId);
      }
      
      console.log(`[getBusinessServices] Returning ${filteredServices.length} services:`, filteredServices);
      return filteredServices;
    } else {
      console.log(`[getBusinessServices] No services found with query param, trying manual filtering`);
      return await getBusinessServicesManual(bId);
    }
  } catch (error) {
    console.error('[getBusinessServices] Error with query param approach:', error);
    return await getBusinessServicesManual(bId);
  }
};

// Helper function to manually fetch and filter services
const getBusinessServicesManual = async (businessId: string): Promise<Service[]> => {
  console.log(`[getBusinessServicesManual] Manually fetching all services for businessId: ${businessId}`);
  
  try {
    // Add cache-busting timestamp
    const timestamp = Date.now();
    
    // Fetch all services with cache busting
    const response = await fetch(`${API_URL}/services?_=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`);
    }
    
    const allServices = await response.json();
    console.log('[getBusinessServicesManual] All services:', allServices);
    
    if (!Array.isArray(allServices)) {
      console.error('[getBusinessServicesManual] Invalid response format, expected array');
      return [];
    }
    
    // Manually filter services to match the business ID
    const filteredServices = allServices.filter(service => 
      service.businessId && service.businessId.toString() === businessId.toString()
    );
    
    console.log(`[getBusinessServicesManual] Found ${filteredServices.length} services for business ID ${businessId}:`, filteredServices);
    
    return filteredServices;
  } catch (error) {
    console.error('[getBusinessServicesManual] Error fetching services:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

// Create a service for the current business
export async function createBusinessService(
  serviceData: Omit<Service, 'id' | 'businessId'>
): Promise<Service> {
  // Get the current business ID
  const businessId = getBusinessId();
  
  // If no business ID, we can't create a service
  if (!businessId) {
    throw new Error('No business found. Please create or select a business first.');
  }
  
  // Add the business ID to the service data
  const fullServiceData = {
    ...serviceData,
    businessId
  };
  
  // Create the service using the API
  const newService = await fetchAPI<Service>('/services', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fullServiceData),
  });
  
  return newService;
}

export const getBusinessAppointments = async (businessId?: string) => {
  const bId = businessId || getBusinessId();
  if (!bId) throw new Error('No business ID found');
  
  try {
    // First try to get appointments with businessId filter
    return await fetchAPI<Appointment[]>(`appointments?businessId=${bId}`);
  } catch (error) {
    console.error('Error fetching appointments with businessId, falling back:', error);
    
    try {
      // Fallback to filtering manually
      const appointments = await fetchAPI<Appointment[]>('appointments');
      return appointments.filter(appointment => appointment.businessId === bId);
    } catch (secondError) {
      console.error('Error in fallback appointment fetching:', secondError);
      return [];
    }
  }
};

export const getBusinessClients = async (businessId?: string) => {
  const bId = businessId || getBusinessId();
  if (!bId) throw new Error('No business ID found');
  
  return fetchAPI<Client[]>(`clients?businessId=${bId}`);
};

export const getBusinessStaff = async (businessId?: string) => {
  const bId = businessId || getBusinessId();
  if (!bId) throw new Error('No business ID found');
  
  try {
    // First try with the business staff endpoint - include both staff and admin roles
    return await fetchAPI<BusinessUser[]>(`users?businessId=${bId}`);
  } catch (error) {
    try {
      console.error('Error fetching business staff, trying fallback:', error);
      
      // Fallback: Get all users and filter by businessId
      const allUsers = await getUsers();
      // Filter and cast to BusinessUser since we're filtering for business users
      const businessUsers = allUsers.filter(user => 
        // Check for properties that indicate a BusinessUser
        'businessId' in user && 
        user.businessId === bId
      ) as BusinessUser[];
      
      return businessUsers;
    } catch (secondError) {
      console.error('Error fetching business staff with fallback:', secondError);
      return []; // Return empty array instead of throwing
    }
  }
};

// Business API functions
export const getBusiness = (id: string) => fetchAPI<Business>(`businesses/${id}`);
export const getBusinessById = (id: string) => fetchAPI<Business>(`businesses/${id}`);

// Service Categories API functions

export const getBusinessServiceCategories = async () => {
  try {
    const businessId = getBusinessId();
    
    // If no business ID is available, return the hardcoded categories as fallback
    if (!businessId) {
      console.warn('No business ID found for fetching categories, using hardcoded data');
      return defaultCategories();
    }
    
    // Get categories from API
    const response = await fetch(`${API_URL}/serviceCategories?businessId=${businessId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    
    const categories = await response.json();
    
    // If no categories found, return default ones
    if (!categories || categories.length === 0) {
      return defaultCategories();
    }
    
    return categories;
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return defaultCategories();
  }
};

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

// Initialize server availability check
checkServerAvailability();