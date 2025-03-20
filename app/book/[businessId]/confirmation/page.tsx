// app/book/[businessId]/confirmation/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, ArrowRight, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Fetch business data for the header
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

export default async function BookingConfirmationPage({ params }: { params: { businessId: string } }) {
  const { businessId } = params;
  const business = await getBusinessData(businessId);
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-3" />
          
          <CardHeader className="text-center pb-6 pt-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
            <CardDescription className="text-base">
              Your appointment has been successfully booked
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8">
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 mb-6">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">Appointment Details</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    We've sent the details to your phone number
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">BUSINESS</h3>
                <p className="text-gray-900 font-medium">{business?.name || 'Our Business'}</p>
              </div>
              
              {business?.address && (
                <div>
                  <h3 className="text-gray-500 text-sm font-medium flex items-center">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    ADDRESS
                  </h3>
                  <p className="text-gray-900">{business.address}</p>
                </div>
              )}
              
              {business?.phone && (
                <div>
                  <h3 className="text-gray-500 text-sm font-medium flex items-center">
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    PHONE
                  </h3>
                  <p className="text-gray-900">{business.phone}</p>
                </div>
              )}
            </div>
            
            <Separator className="my-6" />
            
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                What's Next?
              </h3>
              <ul className="space-y-2 text-blue-800 text-sm">
                <li className="flex items-start">
                  <ArrowRight className="h-3.5 w-3.5 mt-1 mr-2 flex-shrink-0" />
                  <span>Please arrive 10 minutes before your appointment</span>
                </li>
                <li className="flex items-start">
                  <ArrowRight className="h-3.5 w-3.5 mt-1 mr-2 flex-shrink-0" />
                  <span>If you need to cancel or reschedule, please call the business directly</span>
                </li>
              </ul>
            </div>
          </CardContent>
          
          <CardFooter className="px-8 py-6 flex flex-col space-y-3">
            <Button 
              asChild 
              className="w-full"
              size="lg"
            >
              <Link href={`/book/${businessId}`}>
                Book Another Appointment
              </Link>
            </Button>
            
            <Button 
              variant="outline"
              asChild
              className="w-full"
            >
              <a href={business?.website || '/'}>
                Return to Website
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}