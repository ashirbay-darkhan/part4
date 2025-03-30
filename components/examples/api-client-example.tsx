'use client';

import { useState, useEffect } from 'react';
import { getBusiness, getBusinessServices, updateBusiness } from '@/lib/api-client';
import { Business, Service } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApiClientExample() {
  const [businessId] = useState('1'); // Example business ID
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load business data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch business and services in parallel
        const [businessData, servicesData] = await Promise.all([
          getBusiness(businessId),
          getBusinessServices(businessId)
        ]);
        
        setBusiness(businessData);
        setServices(servicesData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [businessId]);

  // Update business name example
  const handleUpdateBusinessName = async () => {
    if (!business) return;
    
    try {
      const updatedBusiness = await updateBusiness(businessId, {
        name: `${business.name} (Updated at ${new Date().toLocaleTimeString()})`
      });
      
      setBusiness(updatedBusiness);
      
      // Show success message
      alert('Business name updated successfully!');
    } catch (err) {
      console.error('Error updating business:', err);
      alert('Failed to update business name.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-full max-w-lg" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
        <p>Error: {error}</p>
        <Button 
          variant="outline" 
          className="mt-2" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{business?.name || 'Business'}</CardTitle>
          <CardDescription>Using the optimized API client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Business Details</h3>
              <p>Email: {business?.email}</p>
              <p>Owner ID: {business?.ownerId}</p>
              <Button 
                className="mt-2" 
                onClick={handleUpdateBusinessName}
              >
                Update Business Name
              </Button>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Services ({services.length})</h3>
              <ul className="space-y-2 mt-2">
                {services.map(service => (
                  <li key={service.id} className="p-2 border rounded-md">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm">{service.description}</p>
                    <p className="text-sm">
                      Price: ${(service.price / 100).toFixed(2)} • 
                      Duration: {service.duration} minutes
                    </p>
                  </li>
                ))}
                {services.length === 0 && (
                  <li className="text-gray-500">No services found</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 