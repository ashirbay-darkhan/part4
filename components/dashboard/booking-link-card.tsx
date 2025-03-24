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
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center">
            <Share className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle>Your Booking Link</CardTitle>
            <CardDescription>
              Share this link with your clients so they can book appointments
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <div className="flex items-center relative">
            <Input 
              value={bookingLink} 
              readOnly 
              className="pr-24 bg-accent/5 border-accent/20 focus:border-accent/30 h-10"
            />
            <Button 
              onClick={copyToClipboard} 
              variant={copied ? "outline" : "ghost"} 
              size="sm" 
              className={`absolute right-1 h-8 ${copied ? 'border-accent/30 text-accent' : 'hover:bg-accent/10'}`}
            >
              <Copy className="h-4 w-4 mr-1.5" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={shareLink}
              variant="outline" 
              className="flex-1 border-accent/20 hover:border-accent/30 hover:bg-accent/5"
            >
              <Share className="h-4 w-4 mr-2 text-accent" />
              Share Link
            </Button>
            
            <Button 
              onClick={() => window.open(bookingLink, '_blank')}
              variant="default" 
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 