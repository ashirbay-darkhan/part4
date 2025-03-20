'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function DebugPanel() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [servicesCount, setServicesCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get business ID
      const storedId = localStorage.getItem('business_id');
      setBusinessId(storedId);
      
      // Get user data
      try {
        const userJson = localStorage.getItem('currentUser');
        if (userJson) {
          const parsedUser = JSON.parse(userJson);
          setUserData(parsedUser);
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
      
      // Count services
      fetchServices();
    }
  }, [isOpen]);
  
  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:3001/services');
      if (response.ok) {
        const services = await response.json();
        setServicesCount(services.length);
      }
    } catch (e) {
      console.error('Error fetching services:', e);
    }
  };
  
  const fixBusinessId = () => {
    if (userData?.businessId) {
      localStorage.setItem('business_id', userData.businessId.toString());
      setBusinessId(userData.businessId.toString());
      toast.success('Business ID fixed in localStorage');
    } else {
      toast.error('No business ID found in user data');
    }
  };
  
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          className="bg-slate-100 dark:bg-slate-800"
        >
          Debug
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex justify-between items-center">
            Debug Panel
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 text-xs space-y-2">
          <div>
            <strong>Business ID in localStorage:</strong> {businessId || 'Not set'}
          </div>
          
          {userData && (
            <div>
              <strong>User Business ID:</strong> {userData.businessId || 'Not set'}
              <br />
              <strong>Business Name:</strong> {userData.businessName || 'Not set'}
            </div>
          )}
          
          <div>
            <strong>Total Services:</strong> {servicesCount}
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="text-xs h-7"
              onClick={fixBusinessId}
            >
              Fix Business ID
            </Button>
            
            <Button 
              size="sm" 
              variant="secondary" 
              className="text-xs h-7"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 