'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BusinessUser, Service } from '@/types';
import { useAuth } from '@/lib/auth/authContext';
import { getBusinessServices } from '@/lib/api/staff-service';
import { Tooltip } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';

interface StaffFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: BusinessUser | null;
}

interface StaffFormData {
  name: string;
  email: string;
  avatar: string;
  phone: string;
  serviceIds: string[];
  role?: 'admin' | 'staff';
}

export function StaffForm({ isOpen, onClose, onSubmit, initialData }: StaffFormProps) {
  // Form state with typed interface
  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    email: '',
    avatar: '',
    phone: '',
    serviceIds: [],
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const { user } = useAuth();

  // Reset form when dialog opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      // Reset form with initial data or empty values
      setFormData({
        name: initialData?.name || '',
        email: initialData?.email || '',
        avatar: initialData?.avatar || '',
        phone: initialData?.phone || '',
        serviceIds: initialData?.serviceIds || [],
      });
      setActiveTab('basic');
      
      // Always load services when dialog opens
      if (user?.businessId) {
        loadServices(user.businessId);
      }
    }
  }, [isOpen, initialData, user?.businessId]);
  
  // Load services
  const loadServices = async (businessId: string) => {
    try {
      const data = await getBusinessServices(businessId);
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load services. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Update form data fields
  const updateFormField = (field: keyof StaffFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate avatar URL
  const generateAvatar = () => {
    if (!formData.name) {
      // Show a subtle notification if name is empty
      const avatarPreview = document.getElementById('avatar-preview');
      if (avatarPreview) {
        avatarPreview.classList.add('shake-animation');
        setTimeout(() => avatarPreview.classList.remove('shake-animation'), 500);
      }
      return;
    }
    
    // Generate a more professional avatar with consistent styling
    const colors = ['0369a1', '4f46e5', '0891b2', '7c3aed', '059669'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=${randomColor}&color=ffffff&bold=true&format=svg`;
    updateFormField('avatar', url);
  };

  // Toggle service selection
  const toggleService = (serviceId: string) => {
    const newServiceIds = formData.serviceIds.includes(serviceId)
      ? formData.serviceIds.filter(id => id !== serviceId)
      : [...formData.serviceIds, serviceId];
    
    updateFormField('serviceIds', newServiceIds);
  };

  // Function to select all services in a category
  const selectCategoryServices = (categoryServices: Service[]) => {
    const categoryServiceIds = categoryServices.map(service => service.id);
    
    // Check if all services in this category are already selected
    const allSelected = categoryServiceIds.every(id => formData.serviceIds.includes(id));
    
    if (allSelected) {
      // If all are selected, deselect all in this category
      const newServiceIds = formData.serviceIds.filter(id => !categoryServiceIds.includes(id));
      updateFormField('serviceIds', newServiceIds);
    } else {
      // Otherwise, add all missing services from this category
      const newServiceIds = [...formData.serviceIds];
      categoryServiceIds.forEach(id => {
        if (!newServiceIds.includes(id)) {
          newServiceIds.push(id);
        }
      });
      updateFormField('serviceIds', newServiceIds);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return false;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to save staff member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Group services by category
  const servicesByCategory = useMemo(() => {
    // Create a grouped object of services
    const grouped = services.reduce((acc, service) => {
      const category = service.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, Service[]>);

    // Sort categories alphabetically with "Uncategorized" at the end
    return Object.keys(grouped)
      .sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
      })
      .map(category => ({
        name: category,
        services: grouped[category]
      }));
  }, [services]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="services">Services Offered</TabsTrigger>
            </TabsList>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1">
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Avatar Preview */}
                  <div className="flex flex-col items-center">
                    <div id="avatar-preview" className="mb-3 relative">
                      {formData.avatar ? (
                        <img 
                          src={formData.avatar} 
                          alt={formData.name || "Staff"} 
                          className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Staff')}`;
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-semibold shadow-md">
                          {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={generateAvatar}
                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
                        title="Generate avatar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-center max-w-[160px]">
                      Avatar will be generated from name, or enter a custom URL below
                    </div>
                  </div>
                  
                  {/* Basic information fields */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateFormField('name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormField('email', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateFormField('phone', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL (optional)</label>
                    <input
                      type="url"
                      value={formData.avatar}
                      onChange={(e) => updateFormField('avatar', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="services" className="mt-0">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Services Offered</h3>
                    <p className="text-sm text-gray-500">Select which services this staff member can perform</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {formData.serviceIds.length} selected
                  </span>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {services.length === 0 ? (
                    <div className="flex items-center justify-center p-6 text-center bg-gray-50">
                      <div>
                        <p className="text-gray-500 mb-2">No services available</p>
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:text-blue-800"
                          onClick={() => user?.businessId && loadServices(user.businessId)}
                        >
                          Reload services
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {servicesByCategory.map((category) => (
                        <div key={category.name} className="bg-white">
                          <div 
                            className="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                            onClick={() => selectCategoryServices(category.services)}
                          >
                            <h3 className="font-medium text-gray-800">{category.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {category.services.filter(s => formData.serviceIds.includes(s.id)).length} 
                                /{category.services.length}
                              </span>
                              <button
                                type="button"
                                className="text-xs bg-white text-gray-600 rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectCategoryServices(category.services);
                                }}
                              >
                                {category.services.every(s => formData.serviceIds.includes(s.id)) 
                                  ? 'Deselect All' 
                                  : 'Select All'}
                              </button>
                            </div>
                          </div>
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {category.services.map((service) => {
                              const isSelected = formData.serviceIds.includes(service.id);
                              return (
                                <div
                                  key={service.id}
                                  className={`p-3 rounded-md border transition-all flex items-center ${
                                    isSelected 
                                      ? 'bg-blue-50 border-blue-200' 
                                      : 'hover:bg-gray-50 border-gray-200'
                                  }`}
                                  onClick={() => toggleService(service.id)}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleService(service.id)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <h4 className="text-sm font-medium text-gray-900 truncate">{service.name}</h4>
                                      <div className="text-xs text-gray-500 flex gap-2 mt-0.5 flex-wrap">
                                        <span>{service.duration} min</span>
                                        <span>₹{(service.price / 100).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0 shadow-inner">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                {activeTab === 'basic' ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('services')}
                    className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Continue to Services
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Back to Info
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Staff Member'}
                </button>
              </div>
            </div>
          </form>
        </Tabs>
      </div>
      
      <style jsx global>{`
        .shake-animation {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        @keyframes shake {
          10%, 90% {
            transform: translate3d(-1px, 0, 0);
          }
          
          20%, 80% {
            transform: translate3d(2px, 0, 0);
          }
          
          30%, 50%, 70% {
            transform: translate3d(-3px, 0, 0);
          }
          
          40%, 60% {
            transform: translate3d(3px, 0, 0);
          }
        }
      `}</style>
    </div>
  );
} 