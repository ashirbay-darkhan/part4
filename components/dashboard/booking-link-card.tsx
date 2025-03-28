'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/authContext';
import { Share, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function BookingLinkCard() {
  const { user } = useAuth();
  const [bookingLink, setBookingLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.businessId) {
      // Assuming we're using the businessId to create the booking link
      const baseUrl = window.location.origin;
      setBookingLink(`${baseUrl}/book/${user.businessId}`);
    }
  }, [user]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      toast.success('Booking link copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Book an appointment',
          text: 'Book an appointment with us using this link:',
          url: bookingLink,
        });
        toast.success('Booking link shared successfully');
      } catch (err) {
        // User likely canceled the share
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy if Web Share API is not available
      copyToClipboard();
    }
  };

  return (
    <Card className="bg-white border border-gray-100 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-gray-100 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-2">
            <div className="h-9 w-9 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
              <Share className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-gray-800">Your Booking Link</CardTitle>
              <CardDescription className="text-gray-500">
                Share this link with your clients so they can book appointments
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="space-y-4">
          <div className="flex items-center">
            <Input 
              value={bookingLink} 
              readOnly 
              className="bg-white border-gray-200 h-10 rounded-md text-sm pr-20"
            />
            <Button 
              onClick={copyToClipboard} 
              variant="ghost" 
              size="sm" 
              className="ml-2 text-gray-600 hover:text-gray-800 h-8 px-2 hover:bg-gray-50"
            >
              <Copy className="h-4 w-4 mr-1.5" />
              Copy
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={shareLink}
              variant="outline" 
              className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              <Share className="h-4 w-4 mr-2 text-gray-500" />
              Share Link
            </Button>
            
            <Button 
              onClick={() => window.open(bookingLink, '_blank')}
              variant="default" 
              className="bg-gray-800 hover:bg-gray-700 text-white border-0"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Page
            </Button>
          </div>
          
          <div className="pt-3 border-t border-gray-100 mt-4">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                <span className="font-medium">Pro tip:</span> Embed this booking link on your website
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                onClick={() => toast.success('Embedding instructions are coming soon!')}
              >
                Learn how
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}