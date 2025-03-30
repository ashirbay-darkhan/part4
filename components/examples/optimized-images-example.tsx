'use client';

import { OptimizedImage, OptimizedAvatar } from '@/components/ui/optimized-image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function OptimizedImagesExample() {
  // Example images with different sizes and formats
  const exampleImages = [
    {
      src: '/images/services/haircut.jpg',
      alt: 'Haircut service',
      width: 600,
      height: 400,
      title: 'Regular Image (Priority)',
      description: 'Using priority and blur placeholder',
    },
    {
      src: '/images/services/styling.jpg',
      alt: 'Styling service',
      width: 600,
      height: 400,
      title: 'Regular Image',
      description: 'Standard optimization with WebP format',
    },
    {
      src: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
      alt: 'John Doe',
      width: 100,
      height: 100,
      title: 'Remote Avatar',
      description: 'Remote avatar from configured domain',
    },
    {
      src: '/nonexistent-image.jpg',
      alt: 'Broken Image',
      width: 600,
      height: 400,
      title: 'Fallback Example',
      description: 'Shows fallback when image fails to load',
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Optimized Images vs Regular Images</h2>
        <p className="text-muted-foreground mb-4">
          Compare the performance and features of optimized images with regular Next.js Image components
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {exampleImages.map((img, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="h-48 relative bg-muted">
              <OptimizedImage
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                className="w-full h-full"
                priority={index === 0}
              />
            </div>
            <CardHeader className="p-4">
              <CardTitle className="text-base">{img.title}</CardTitle>
              <CardDescription>{img.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Avatar Optimization</h2>
        <p className="text-muted-foreground mb-4">
          Optimized avatars with fallbacks for error states
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <Card className="overflow-hidden p-4">
          <div className="flex items-center gap-3">
            <OptimizedAvatar 
              src="https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff" 
              alt="John Doe"
              priority
            />
            <div>
              <h3 className="font-medium">John Doe</h3>
              <p className="text-sm text-muted-foreground">Working avatar</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-4">
          <div className="flex items-center gap-3">
            <OptimizedAvatar 
              src="/nonexistent-avatar.jpg" 
              alt="Jane Smith"
            />
            <div>
              <h3 className="font-medium">Jane Smith</h3>
              <p className="text-sm text-muted-foreground">Fallback example</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-4">
          <div className="flex items-center gap-3">
            <OptimizedAvatar 
              src="" 
              alt="Empty Source"
            />
            <div>
              <h3 className="font-medium">Empty Source</h3>
              <p className="text-sm text-muted-foreground">No image provided</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-medium mb-2">Performance Benefits</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>WebP format reduces file size by ~30% compared to JPEG</li>
          <li>Lazy loading prevents unnecessary downloads for offscreen images</li>
          <li>Blur placeholder improves perceived load time</li>
          <li>Automatic size optimization based on device and container</li>
          <li>Error handling prevents layout shifts when images fail</li>
        </ul>
      </div>
    </div>
  );
} 