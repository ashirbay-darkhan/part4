// components/booking/booking-link-card.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Share2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/authContext';
import { toast } from 'sonner';

export function BookingLinkCard() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  // Generate booking link based on the user's businessId
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '';
    
  const bookingLink = user?.businessId 
    ? `${baseUrl}/book/${user.businessId}`
    : '';
  
  // Copy link to clipboard
  const copyToClipboard = async () => {
    if (!bookingLink) return;
    
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      toast.success('Booking link copied to clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
      console.error('Failed to copy:', err);
    }
  };
  
  // Share link using Web Share API if available
  const shareLink = async () => {
    if (!bookingLink || !navigator.share) return;
    
    try {
      await navigator.share({
        title: `Book an appointment with ${user?.businessName || 'our business'}`,
        text: 'Book your appointment online',
        url: bookingLink,
      });
      
      toast.success('Booking link shared successfully');
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Failed to share link');
        console.error('Failed to share:', err);
      }
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center">
          <Share2 className="h-4 w-4 mr-2" />
          Your Booking Link
        </CardTitle>
        <CardDescription>
          Share this link with your clients so they can book appointments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              value={bookingLink}
              readOnly
              className="pr-10 font-mono text-sm"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={copyToClipboard}
            title="Copy link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          
          {navigator.share && (
            <Button
              size="icon"
              variant="outline"
              onClick={shareLink}
              title="Share link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="mt-4">
          <Button variant="secondary" size="sm" asChild>
            <a href={bookingLink} target="_blank" rel="noopener noreferrer">
              Open Booking Page
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}