'use client';

import { useState, useEffect } from 'react';
import { BusinessUser, Service, WorkingHours } from '@/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ShieldCheck, Clock, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar-fallback';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/authContext';
import { getBusinessServices } from '@/lib/api/staff-service';
import { StaffScheduleModal } from './staff-schedule-modal';
import { updateStaff } from '@/lib/api/staff-service';

interface StaffTableProps {
  staffMembers: BusinessUser[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (staff: BusinessUser) => void;
}

export function StaffTable({ staffMembers, onDelete, onEdit }: StaffTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [services, setServices] = useState<Record<string, Service>>({});
  
  // State for the schedule modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<BusinessUser | null>(null);
  
  // Load services
  useEffect(() => {
    const fetchServices = async () => {
      if (user?.businessId) {
        try {
          const servicesData = await getBusinessServices(user.businessId);
          // Create a map of service IDs to services
          const servicesMap = servicesData.reduce((acc, service) => {
            acc[service.id] = service;
            return acc;
          }, {} as Record<string, Service>);
          setServices(servicesMap);
        } catch (error) {
          console.error('Failed to load services:', error);
        }
      }
    };
    
    fetchServices();
  }, [user?.businessId]);

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await onDelete(id);
      toast({
        title: "Staff member deleted",
        description: "The staff member has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete staff member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setStaffToDelete(null);
    }
  };

  // Get service name by ID
  const getServiceName = (serviceId: string) => {
    return services[serviceId]?.name || 'Unknown Service';
  };

  // Check if a staff member is the admin/owner
  const isAdminStaff = (staff: BusinessUser) => {
    return staff.role === 'admin' || (user && staff.id === user.id);
  };
  
  // Handle schedule modal actions
  const openScheduleModal = (staff: BusinessUser) => {
    setSelectedStaff(staff);
    setIsScheduleModalOpen(true);
  };
  
  const closeScheduleModal = () => {
    setSelectedStaff(null);
    setIsScheduleModalOpen(false);
  };
  
  // Save updated schedule
  const saveSchedule = async (staffId: string, workingHours: WorkingHours[]) => {
    try {
      // Find the staff member to update
      const staffToUpdate = staffMembers.find(staff => staff.id === staffId);
      
      if (!staffToUpdate) {
        throw new Error('Staff member not found');
      }
      
      // Update the staff member's working hours
      await updateStaff({
        id: staffId,
        workingHours: workingHours
      });
      
      toast({
        title: "Schedule updated",
        description: "The staff member's schedule has been successfully updated.",
      });
      
      // Refresh the data
      router.refresh();
      
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Working Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No staff members found.
                </TableCell>
              </TableRow>
            ) : (
              staffMembers.map((staff) => {
                const isAdmin = isAdminStaff(staff);
                return (
                  <TableRow 
                    key={staff.id} 
                    className={isAdmin ? "bg-blue-50/30" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          src={staff.avatar} 
                          name={staff.name} 
                          className={`w-9 h-9 ${isAdmin ? "ring-2 ring-blue-300" : ""}`}
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span>{staff.name}</span>
                            {isAdmin && (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-1.5 py-0 text-[10px] font-medium">
                                <ShieldCheck className="w-3 h-3 mr-0.5" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          {isAdmin && (
                            <span className="text-xs text-gray-500">Business Owner</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {isAdmin ? (
                          <span className="text-xs text-gray-500">Administrator access</span>
                        ) : staff.serviceIds && staff.serviceIds.length > 0 ? (
                          staff.serviceIds.map((serviceId) => (
                            <Badge key={serviceId} variant="outline" className="text-xs">
                              {getServiceName(serviceId)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500 text-xs">No services</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={staff.isVerified ? 'default' : 'secondary'}>
                        {staff.isVerified ? 'Verified' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {staff.workingHours?.length ? (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs flex items-center text-blue-600"
                            onClick={() => openScheduleModal(staff)}
                          >
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            View Schedule
                          </Button>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                          No schedule set
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => onEdit(staff)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="icon"
                                onClick={() => setStaffToDelete(staff.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {staff.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={isDeleting}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete(staff.id);
                                  }}
                                >
                                  {isDeleting ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Schedule Modal */}
      {selectedStaff && (
        <StaffScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={closeScheduleModal}
          staff={selectedStaff}
          onSave={saveSchedule}
        />
      )}
    </>
  );
} 