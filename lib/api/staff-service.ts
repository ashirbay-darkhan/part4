import { BusinessUser, Service, WorkingHours } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CreateStaffParams {
  name: string;
  email: string;
  password?: string;
  serviceIds: string[]; // IDs of services this staff can provide
  businessId: string;
  businessName: string;
  phone?: string; // Add phone field to match BusinessUser type
  avatar?: string; // Add avatar field for consistency
  workingHours?: WorkingHours[]; // Add working hours
}

export interface UpdateStaffParams {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  avatar?: string;
  serviceIds?: string[];
  role?: 'admin' | 'staff';
  phone?: string; // Add phone field to match BusinessUser type
  workingHours?: WorkingHours[]; // Add working hours
}

// Helper function to add cache prevention headers
const getCachePreventionHeaders = () => ({
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
});

// Helper function to add timestamp to URL
const addTimestampToUrl = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};

// Generic fetch function with error handling
async function fetchWithErrorHandling<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    // Add cache prevention
    const timestampedUrl = addTimestampToUrl(url);
    
    // Set default headers for cache prevention
    const headers = {
      ...options.headers,
      ...getCachePreventionHeaders()
    };
    
    const response = await fetch(timestampedUrl, {
      ...options,
      headers,
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`API request error for ${url}:`, error);
    throw error;
  }
}

export async function getBusinessStaff(businessId: string): Promise<BusinessUser[]> {
  const url = `${API_URL}/users?businessId=${businessId}`;
  
  const staff = await fetchWithErrorHandling<BusinessUser[]>(url);
  
  // Process and normalize staff data
  return staff.map(staffMember => ({
    ...staffMember,
    serviceIds: Array.isArray(staffMember.serviceIds) ? staffMember.serviceIds : [],
    isVerified: typeof staffMember.isVerified === 'boolean' ? staffMember.isVerified : true,
    role: staffMember.role || 'staff'
  }));
}

export async function getStaffById(id: string): Promise<BusinessUser> {
  const url = `${API_URL}/users/${id}`;
  
  const staff = await fetchWithErrorHandling<BusinessUser>(url);
  
  // Ensure staff has serviceIds property
  return {
    ...staff,
    serviceIds: Array.isArray(staff.serviceIds) ? staff.serviceIds : [],
    isVerified: typeof staff.isVerified === 'boolean' ? staff.isVerified : true,
    role: staff.role || 'staff'
  };
}

export async function createStaff(staffData: CreateStaffParams): Promise<BusinessUser> {
  // Ensure serviceIds are strings
  const serviceIds = (staffData.serviceIds || []).map(id => id.toString());
  
  // For a new staff member, generate a default password if not provided
  const dataToSend = {
    ...staffData,
    password: staffData.password || 'password123', // Default password if none provided
    id: Date.now().toString(), // Generate a unique ID
    isVerified: true, // Set initially verified
    serviceIds: serviceIds
  };

  return fetchWithErrorHandling<BusinessUser>(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataToSend),
  });
}

export async function updateStaff(params: UpdateStaffParams): Promise<BusinessUser> {
  // First get the existing staff to avoid overwriting data
  const existingStaff = await getStaffById(params.id);
  
  // Update the staff with new data
  const updateData = {
    ...existingStaff,
    ...params,
    _timestamp: Date.now(), // Add timestamp to force update
  };
  
  // Remove empty password if it was not provided
  if (!params.password) {
    delete updateData.password;
  }
  
  const url = `${API_URL}/users/${params.id}`;
  
  // Update the staff member
  const updatedStaff = await fetchWithErrorHandling<BusinessUser>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  
  // Verify the update with a separate GET request to ensure we have the latest data
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to allow DB to update
  
  const verifyUrl = `${API_URL}/users/${params.id}`;
  const verifiedStaff = await fetchWithErrorHandling<BusinessUser>(verifyUrl);
  
  // Return the verified data to ensure we have the most up-to-date version
  return verifiedStaff;
}

export async function deleteStaff(id: string): Promise<void> {
  const url = `${API_URL}/users/${id}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getCachePreventionHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete staff member: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting staff member:', error);
    throw error;
  }
}

// Get all available services for a business
export async function getBusinessServices(businessId: string): Promise<Service[]> {
  const url = `${API_URL}/services?businessId=${businessId}`;
  return fetchWithErrorHandling<Service[]>(url);
}