import { BusinessUser, Service } from '@/types';
import { fetchAPI } from '../api';

export interface CreateStaffParams {
  name: string;
  email: string;
  phone?: string;
  serviceIds: string[];
  businessId: string;
  businessName: string;
  avatar?: string;
  workingHours?: any[];
}

export interface UpdateStaffParams {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  serviceIds?: string[];
  role?: 'admin' | 'staff';
  avatar?: string;
  workingHours?: any[];
}

/**
 * Create a new staff member
 * @param params Staff creation parameters
 * @returns The created staff member
 */
export async function createStaff(params: CreateStaffParams): Promise<BusinessUser> {
  try {
    // Prepare staff data for creation
    const staffData = {
      ...params,
      password: 'password123', // Default password, should be changed on first login
      role: 'staff',
      isVerified: true,
      avatar: params.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(params.name)}&background=4f46e5&color=ffffff&bold=true&format=svg`
    };

    // Create the staff via API
    const response = await fetchAPI<BusinessUser>('users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData)
    });

    return response;
  } catch (error) {
    console.error('Error creating staff:', error);
    throw new Error(`Failed to create staff member: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update an existing staff member
 * @param params Staff update parameters
 * @returns The updated staff member
 */
export async function updateStaff(params: UpdateStaffParams): Promise<BusinessUser> {
  try {
    // First get the current staff state to ensure we have all data
    const currentStaff = await fetchAPI<BusinessUser>(`users/${params.id}?_=${Date.now()}`);
    
    // Merge the current data with the update data
    const updatedData = {
      ...currentStaff,
      ...params
    };
    
    // Handle avatar update - if not provided, keep existing
    if (!params.avatar && currentStaff.avatar) {
      updatedData.avatar = currentStaff.avatar;
    }
    
    // Update the staff via API
    const response = await fetchAPI<BusinessUser>(`users/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    return response;
  } catch (error) {
    console.error('Error updating staff:', error);
    throw new Error(`Failed to update staff member: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a staff member
 * @param id Staff ID to delete
 * @returns Success response
 */
export async function deleteStaff(id: string): Promise<void> {
  try {
    await fetchAPI(`users/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    throw new Error(`Failed to delete staff member: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get services for the business
 * @param businessId Business ID
 * @returns List of services
 */
export async function getBusinessServices(businessId?: string): Promise<Service[]> {
  return fetchAPI<Service[]>(`services?businessId=${businessId}`);
} 