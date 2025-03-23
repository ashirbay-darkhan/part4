'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffForm } from '@/components/staff/staff-form';
import { useAuth } from '@/lib/auth/authContext';
import { BusinessUser, Service } from '@/types';
import { 
  createStaff, 
  updateStaff, 
  deleteStaff,
  CreateStaffParams,
  UpdateStaffParams,
  getBusinessServices
} from '@/lib/api/staff-service';
import { useToast } from '@/components/ui/use-toast';

import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function StaffPage() {
  const { user, updateCurrentUser } = useAuth();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState<BusinessUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<BusinessUser | null>(null);
  const [services, setServices] = useState<Service[]>([]);

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

  // Load services when component mounts
  useEffect(() => {
    const fetchServices = async () => {
      if (user?.businessId) {
        try {
          const servicesData = await getBusinessServices(user.businessId);
          setServices(servicesData);
        } catch (error) {
          console.error('Failed to load services:', error);
        }
      }
    };

    if (user?.businessId) {
      fetchServices();
    }
  }, [user?.businessId]);

  // Filter staff based on search query
  const filteredStaff = staffMembers
    .filter(staff => !isAdminStaff(staff))
    .filter(staff => 
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
      workingHours: data.workingHours, // Ensure working hours are included
    };
    
    // Preserve admin status for the owner
    if (isAdminStaff(currentStaff)) {
      updateParams.role = 'admin';
    } else {
      updateParams.role = 'staff';
    }
    
    console.log('Updating staff with working hours:', updateParams.workingHours);
    
    // First, optimistically update the UI state
    setStaffMembers(prevStaff => {
      // Create a new array with the optimistically updated staff
      return prevStaff.map(staff => 
        staff.id === currentStaff.id 
          ? { ...staff, ...updateParams } 
          : staff
      );
    });
    
    try {
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
      
      toast({
        title: 'Success',
        description: 'Staff member updated successfully',
      });
      
      return freshStaffData;
    } catch (error) {
      console.error('Staff update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update staff member. Please try again.',
        variant: 'destructive',
      });
      
      // If update failed, reload from database to ensure consistency
      if (user?.businessId) {
        loadStaff();
      }
      
      throw error;
    }
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
      } else {
        await handleCreateStaff(data);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with metrics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your team members and their service assignments</p>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
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


      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search staff by name or email..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select onValueChange={(value) => {
          setStaffMembers(prev => {
            return [...prev].sort((a, b) => {
              if (value === 'name-asc') return a.name.localeCompare(b.name);
              if (value === 'name-desc') return b.name.localeCompare(a.name);
              if (value === 'services-asc') return a.serviceIds.length - b.serviceIds.length;
              if (value === 'services-desc') return b.serviceIds.length - a.serviceIds.length;
              return 0;
            });
          });
        }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sort by</SelectLabel>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="services-desc">Most Services</SelectItem>
              <SelectItem value="services-asc">Fewest Services</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-pawly-teal mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500">Loading staff members...</p>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No staff members found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery ? 'Try a different search term or' : 'Start by adding your first staff member to the team.'}
          </p>
          {searchQuery ? (
            <Button variant="outline" onClick={() => setSearchQuery('')} className="mr-2">
              Clear Search
            </Button>
          ) : null}
          <Button onClick={handleAddStaff}>
            <Plus className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
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