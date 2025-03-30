'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { useBusiness } from '@/lib/hooks/use-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2, ExternalLink, Upload, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { updateBusiness } from '@/lib/api-client';

export function BookingFormContent() {
  const { user } = useAuth();
  const { business, isLoading, mutate } = useBusiness(user?.businessId);
  const [bookingLink, setBookingLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showShareButton, setShowShareButton] = useState(false);

  useEffect(() => {
    // Check if Web Share API is available on the client side
    setShowShareButton(typeof navigator !== 'undefined' && 'share' in navigator);
    
    if (user?.businessId) {
      // Generate booking link
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
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create a readable file name
      const timestamp = Date.now();
      const fileName = `${user?.businessId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // You would normally upload this to a server
      // For this example, we'll simulate by copying to public folder
      // In a real application, use a proper file upload API
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', user?.businessId || '');
      formData.append('fileName', fileName);
      
      // In a real app, you would upload the file here
      // For now, we're just pretending it's uploaded to a public directory
      
      // Generate image URL - since we're simulating, we'll just use a placeholder
      // This should be a URL that would actually work in a real implementation
      // For demo purposes, we'll use an existing image from your public folder
      const imageUrl = `/images/services/haircut.jpg`;
      
      // Update business with new image URL
      if (user?.businessId) {
        await updateBusiness(user.businessId, { 
          imageUrl 
        });
        
        // After successful update, update the SWR cache
        mutate();
        toast.success('Business image updated successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Booking Link Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
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
              disabled={!bookingLink}
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            {showShareButton && (
              <Button
                size="icon"
                variant="outline"
                onClick={shareLink}
                title="Share link"
                disabled={!bookingLink}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button 
            variant="default" 
            className="w-full" 
            asChild
            disabled={!bookingLink}
          >
            <a href={bookingLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Booking Page
            </a>
          </Button>
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Pro tip:</span> Embed this booking link on your website
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => toast.success('Embedding instructions are coming soon!')}
            >
              Learn how
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Business Image Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Business Image
          </CardTitle>
          <CardDescription>
            Customize the image that appears on your booking form
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-md p-4 flex items-center justify-center bg-muted/20">
              {business?.imageUrl ? (
                <div className="relative w-full aspect-video">
                  <img
                    src={business.imageUrl}
                    alt={user?.businessName || 'Business'}
                    className="w-full h-full object-cover rounded-md"
                    onError={() => {
                      console.log('Image failed to load');
                      // We don't need to reset the image state anymore since it comes from SWR
                    }}
                  />
                </div>
              ) : (
                <div className="w-full aspect-video flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <p>No business image set</p>
                </div>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Recommended image size: 1200 x 630 pixels (16:9 ratio)</p>
              <p>Maximum file size: 5MB</p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <Button
              variant="outline"
              className="w-full relative overflow-hidden"
              disabled={isUploading || isLoading}
            >
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImageUpload}
                disabled={isUploading || isLoading}
              />
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : business?.imageUrl ? 'Change Image' : 'Upload Image'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Add a default export to make dynamic imports easier
export default { BookingFormContent }; 