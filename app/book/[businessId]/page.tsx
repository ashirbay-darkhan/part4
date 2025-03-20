// app/book/[businessId]/page.tsx
// This is a public page that doesn't require authentication
import { notFound } from 'next/navigation';
import MultiStepBookingForm from '@/components/booking/multi-step-booking-form';
import { Metadata, ResolvingMetadata } from 'next';

// Fetch business data
async function getBusinessData(businessId: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/businesses/${businessId}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching business:', error);
    return null;
  }
}

// Fetch business services
async function getBusinessServices(businessId: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/services?businessId=${businessId}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
}

// Fetch business staff
async function getBusinessStaff(businessId: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/users?businessId=${businessId}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) return [];
    
    const allStaff = await response.json();
    // Filter out admin users for staff selection
    return allStaff.filter((user: any) => user.role !== 'admin' || user.serviceIds?.length > 0);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
}

// Generate metadata
export async function generateMetadata(
  { params }: { params: { businessId: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const business = await getBusinessData(params.businessId);
  
  if (!business) {
    return {
      title: 'Booking - Not Found',
      description: 'The business you are looking for does not exist.'
    };
  }

  return {
    title: `Book an appointment - ${business.name}`,
    description: `Book an appointment with ${business.name}`
  };
}

export default async function BookingPage({ params }: { params: { businessId: string } }) {
  const { businessId } = params;
  
  // Fetch business data
  const business = await getBusinessData(businessId);
  
  // Return 404 if business doesn't exist
  if (!business) {
    notFound();
  }
  
  // Fetch services and staff for this business
  const services = await getBusinessServices(businessId);
  const staff = await getBusinessStaff(businessId);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
          <p className="mt-3 text-xl text-gray-600">Book your appointment online</p>
        </div>
        
        <MultiStepBookingForm 
          businessId={businessId} 
          businessName={business.name}
          services={services}
          staff={staff}
        />
      </div>
    </div>
  );
}