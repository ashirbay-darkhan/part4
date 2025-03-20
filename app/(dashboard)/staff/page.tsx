'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffForm } from '@/components/staff/staff-form';
import { useAuth } from '@/lib/auth/authContext';
import { BusinessUser } from '@/types';
import { 
  getBusinessStaff, 
  createStaff, 
  updateStaff, 
  deleteStaff,
  CreateStaffParams,
  UpdateStaffParams 
} from '@/lib/api/staff-service';
import { useToast } from '@/components/ui/use-toast';

export default function StaffPage() {
  const { user, updateCurrentUser } = useAuth();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<BusinessUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<BusinessUser | null>(null);

  // Check if a staff member is an admin
  const isAdminStaff = useCallback((staff: BusinessUser) => {
    return (staff.role === 'admin' || (user && staff.id === user.id));
  }, [user]);

  // Load staff data from API
  const loadStaff = useCallback(async () => {
    if (!user?.businessId) return;
    
    try {
      setIsLoading(true);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const timestamp = Date.now();
      const businessId = user.businessId;
      
      // Directly fetch users for this business to get current data
      const response = await fetch(`${API_URL}/users?businessId=${businessId}&_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch staff: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as BusinessUser[];
      
      // Process and normalize the data
      const processedData = processStaffData(data, user);
      
      setStaffMembers(processedData);
    } catch (error) {
      console.error('Failed to load staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff members. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Process staff data to normalize, validate, and sort it
  const processStaffData = (data: BusinessUser[], currentUser: BusinessUser | null) => {
    // Ensure each staff member has required fields
    const validatedData = data.map((staff: any) => ({
      ...staff,
      serviceIds: Array.isArray(staff.serviceIds) ? staff.serviceIds : [],
      isVerified: typeof staff.isVerified === 'boolean' ? staff.isVerified : true,
      role: staff.role || 'staff'
    }));
    
    // Ensure the current user has admin role
    const enhancedData = validatedData.map((staff: BusinessUser) => {
      // If this is the logged-in user (owner), ensure they have the admin role
      if (currentUser && staff.id === currentUser.id) {
        return {
          ...staff,
          role: 'admin' as 'admin',
        };
      }
      return staff;
    });
    
    // Sort to show admin first, then preserve original order
    return [...enhancedData].sort((a: BusinessUser, b: BusinessUser) => {
      // Admin always comes first
      if (isAdminStaff(a) && !isAdminStaff(b)) return -1;
      if (!isAdminStaff(a) && isAdminStaff(b)) return 1;
      
      // For non-admin staff, preserve original order
      return 0;
    });
  };

  // Load staff on component mount
  useEffect(() => {
    if (user?.businessId) {
      loadStaff();
    }
  }, [user?.businessId, loadStaff]);

  // Filter staff based on search query
  const filteredStaff = staffMembers.filter(staff => 
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers for staff operations
  const handleAddStaff = () => {
    setCurrentStaff(null);
    setIsFormOpen(true);
  };

  const handleEditStaff = (staff: BusinessUser) => {
    setCurrentStaff(staff);
    setIsFormOpen(true);
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      // Safety check: don't allow deletion of admin/owner
      const staffToDelete = staffMembers.find(staff => staff.id === id);
      if (staffToDelete && isAdminStaff(staffToDelete)) {
        toast({
          title: 'Action Denied',
          description: 'The business owner/admin cannot be deleted.',
          variant: 'destructive',
        });
        return;
      }
      
      await deleteStaff(id);
      
      // Directly update the state by filtering out the deleted staff
      setStaffMembers(prevStaff => prevStaff.filter(staff => staff.id !== id));
      
      toast({
        title: 'Success',
        description: 'Staff member deleted successfully',
      });
    } catch (error) {
      console.error('Staff deletion error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete staff member. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle update of existing staff
  const handleUpdateStaff = async (data: any, currentStaff: BusinessUser) => {
    // Update existing staff
    const updateParams: UpdateStaffParams = {
      id: currentStaff.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      serviceIds: data.serviceIds,
      phone: data.phone,
    };
    
    // Preserve admin status for the owner
    if (isAdminStaff(currentStaff)) {
      updateParams.role = 'admin';
    } else {
      updateParams.role = 'staff';
    }
    
    // First, optimistically update the UI state
    setStaffMembers(prevStaff => {
      // Create a new array with the optimistically updated staff
      return prevStaff.map(staff => 
        staff.id === currentStaff.id 
          ? { ...staff, ...updateParams } 
          : staff
      );
    });
    
    // Then send the update to the server
    const updatedStaff = await updateStaff(updateParams);
    
    // Fetch the specific updated staff member directly to ensure we have fresh data
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const timestamp = Date.now();
    
    // Wait a moment for the database to fully update
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Use the direct user endpoint which is reliable
    const verifyResponse = await fetch(`${API_URL}/users/${currentStaff.id}?_=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-store'
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Failed to verify updated staff data');
    }
    
    const freshStaffData = await verifyResponse.json();
    
    // Update the state with the confirmed fresh data from server
    setStaffMembers(prevStaff => {
      return prevStaff.map(staff => 
        staff.id === freshStaffData.id ? freshStaffData : staff
      );
    });
    
    // If we're updating the current user, update the auth context too
    if (user && currentStaff.id === user.id) {
      updateCurrentUser(freshStaffData);
    }
    
    return freshStaffData;
  };

  // Handle creation of new staff
  const handleCreateStaff = async (data: any) => {
    // Create new staff
    const createParams: CreateStaffParams = {
      name: data.name,
      email: data.email,
      serviceIds: data.serviceIds,
      businessId: user?.businessId || '',
      businessName: user?.businessName || '',
      phone: data.phone,
      avatar: data.avatar,
    };
    
    // Create a temporary ID for optimistic updates
    const tempId = `temp-${Date.now()}`;
    
    // Optimistically add to state with temporary ID
    const tempStaff = {
      ...createParams,
      id: tempId,
      isVerified: true,
      role: 'staff' as 'staff', 
    };
    
    setStaffMembers(prevStaff => {
      const newStaffList = [...prevStaff, tempStaff];
      
      // Sort to keep admin first
      return newStaffList.sort((a, b) => {
        if (isAdminStaff(a) && !isAdminStaff(b)) return -1;
        if (!isAdminStaff(a) && isAdminStaff(b)) return 1;
        return 0;
      });
    });
    
    // Send to server
    const newStaff = await createStaff(createParams);
    
    // Update state with actual staff from server (replacing temp)
    setStaffMembers(prevStaff => {
      // Replace the temporary staff with the real one
      const updatedList = prevStaff.filter(staff => staff.id !== tempId);
      updatedList.push(newStaff);
      
      // Sort to keep admin first
      return updatedList.sort((a, b) => {
        if (isAdminStaff(a) && !isAdminStaff(b)) return -1;
        if (!isAdminStaff(a) && isAdminStaff(b)) return 1;
        return 0;
      });
    });
    
    return newStaff;
  };

  // Handle form submission (create or update)
  const handleFormSubmit = async (data: any) => {
    try {
      if (currentStaff) {
        await handleUpdateStaff(data, currentStaff);
        toast({
          title: 'Success',
          description: 'Staff member updated successfully',
        });
      } else {
        await handleCreateStaff(data);
        toast({
          title: 'Success',
          description: 'Staff member created successfully',
        });
      }
      
      // Close the form
      setIsFormOpen(false);
      setCurrentStaff(null);
    } catch (error) {
      console.error('Staff update/create error:', error);
      
      // If update failed, reload from database to ensure consistency
      if (user?.businessId) {
        loadStaff();
      }
      
      toast({
        title: 'Error',
        description: `Failed to ${currentStaff ? 'update' : 'create'} staff member. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => loadStaff()} 
            disabled={isLoading}
            className="flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 12a9 9 0 0 0 6.7 15L13 21"></path>
                  <path d="M13 21h8v-8"></path>
                </svg>
                Refresh
              </>
            )}
          </Button>
          <Button onClick={handleAddStaff} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search staff..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading staff members...</p>
        </div>
      ) : (
        <StaffTable 
          key={`staff-table-${staffMembers.map(s => s.id).join('-')}`}
          staffMembers={filteredStaff} 
          onDelete={handleDeleteStaff}
          onEdit={handleEditStaff}
        />
      )}

      <StaffForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={currentStaff}
      />
    </div>
  );
}