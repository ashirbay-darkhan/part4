'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { updateService, getBusinessServiceCategories } from '@/lib/api';
import { Service, ServiceCategory } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ImageIcon, CheckCircle2 } from 'lucide-react';

// Sample service images - in production, these would likely be fetched from an API
const serviceImages = [
  { name: 'Haircut', path: '/images/services/haircut.jpg' },
  { name: 'Massage', path: '/images/services/massage.jpg' },
  { name: 'Manicure', path: '/images/services/manicure.jpg' },
  { name: 'Facial', path: '/images/services/facial.jpg' },
  { name: 'General', path: '/images/services/general.jpg' },
];

// Define the form schema for service editing
const serviceFormSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface EditServiceDialogProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedService: Service) => void;
}

export function EditServiceDialog({ 
  service,
  open, 
  onOpenChange,
  onSuccess 
}: EditServiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      category: service.category,
      imageUrl: service.imageUrl || '',
    },
  });
  
  // Initialize selected image
  useEffect(() => {
    if (service.imageUrl) {
      setSelectedImage(service.imageUrl);
    }
  }, [service.imageUrl]);

  // Fetch categories when dialog opens
  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        setIsLoadingCategories(true);
        try {
          const data = await getBusinessServiceCategories();
          setCategories(data);
        } catch (error) {
          console.error('Failed to load categories:', error);
          toast.error('Failed to load categories');
        } finally {
          setIsLoadingCategories(false);
        }
      };

      fetchCategories();
      
      // Reset the form with service data when the dialog opens
      reset({
        name: service.name,
        description: service.description || '',
        duration: service.duration,
        price: service.price,
        category: service.category,
        imageUrl: service.imageUrl || '',
      });
      
      setSelectedImage(service.imageUrl || null);
    }
  }, [open, service, reset]);

  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Create a clean updated service object
      const updatedServiceData = {
        ...service, // Keep all existing data
        name: data.name,
        description: data.description,
        duration: data.duration,
        price: data.price,
        category: data.category,
        imageUrl: data.imageUrl
      };
      
      // Update in API and get the updated service
      const updatedService = await updateService(service.id, updatedServiceData);
      
      toast.success('Service updated successfully');
      
      // Close the dialog
      onOpenChange(false);
      
      // Notify parent component about the successful update
      onSuccess(updatedService);
    } catch (error) {
      toast.error('Failed to update service');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleImageSelect = (imagePath: string) => {
    setSelectedImage(imagePath);
    setValue('imageUrl', imagePath);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            Update your service details and click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left column - Service details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Service Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Men's Haircut"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe your service..."
                  disabled={isSubmitting}
                  className="min-h-[120px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    Duration (minutes) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    {...register('duration')}
                    disabled={isSubmitting}
                  />
                  {errors.duration && (
                    <p className="text-sm text-red-500">{errors.duration.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Price (₸) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('price')}
                    disabled={isSubmitting}
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500">{errors.price.message}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  defaultValue={service.category}
                  onValueChange={(value) => setValue('category', value)}
                  disabled={isSubmitting || isLoadingCategories}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Right column - Image selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Service Image</Label>
                <div className="border-2 border-dashed rounded-lg p-4 h-[300px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {serviceImages.map((image) => (
                      <div 
                        key={image.path}
                        className={`
                          relative cursor-pointer rounded-md overflow-hidden
                          ${selectedImage === image.path ? 'ring-2 ring-primary ring-offset-2' : 'hover:opacity-80'}
                        `}
                        onClick={() => handleImageSelect(image.path)}
                      >
                        <img 
                          src={image.path} 
                          alt={image.name}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            // Show a fallback if image doesn't load
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://placehold.co/400x300?text=No+Image';
                          }}
                        />
                        <div className="p-2 bg-background/80 text-xs font-medium truncate">
                          {image.name}
                        </div>
                        {selectedImage === image.path && (
                          <div className="absolute top-2 right-2 bg-primary rounded-full text-white">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* No image option */}
                    <div 
                      className={`
                        relative cursor-pointer rounded-md overflow-hidden flex flex-col items-center justify-center bg-muted h-32
                        ${selectedImage === '' ? 'ring-2 ring-primary ring-offset-2' : 'hover:opacity-80'}
                      `}
                      onClick={() => handleImageSelect('')}
                    >
                      <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                      <div className="text-xs font-medium">No Image</div>
                      {selectedImage === '' && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full text-white">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select an image from the gallery for your service
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}