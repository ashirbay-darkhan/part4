'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { createBusinessService, getBusinessServiceCategories } from '@/lib/api';
import { ServiceCategory } from '@/types';
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

// Define the form schema for service creation
const serviceFormSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateServiceDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: CreateServiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      duration: 60,
      price: 0,
      category: undefined,
      imageUrl: '',
    },
  });

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
      // Reset the selected image when the dialog opens
      setSelectedImage(null);
      setValue('imageUrl', '');
    }
  }, [open, setValue]);

  const onSubmit = async (data: ServiceFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Validate data before sending to API
      if (!data.name.trim()) {
        throw new Error('Service name is required');
      }
      
      // Create the service with the form data
      const serviceData = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        duration: data.duration,
        price: data.price,
        category: data.category,
        imageUrl: data.imageUrl || ''
      };
      
      const newService = await createBusinessService(serviceData);
      
      toast.success('Service created successfully');
      
      // Reset the form and close the dialog
      reset();
      onOpenChange(false);
      
      // Notify parent component about the successful creation
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred';
        
      toast.error(`Failed to create service: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSelect = (imagePath: string) => {
    setSelectedImage(imagePath);
    setValue('imageUrl', imagePath);
  };

  const handleClose = () => {
    reset();
    setSelectedImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create New Service</DialogTitle>
          <DialogDescription>
            Add a new service to your business offerings.
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
                  aria-invalid={errors.name ? "true" : "false"}
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
                    aria-invalid={errors.duration ? "true" : "false"}
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
                    aria-invalid={errors.price ? "true" : "false"}
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
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}