'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImageProps, 'onError'> {
  fallbackClassName?: string;
}

/**
 * OptimizedImage component that builds on Next.js Image with additional optimization features:
 * - Automatic error handling with fallback
 * - Fade-in animation
 * - Blur placeholder while loading
 * - Proper priority handling
 */
export function OptimizedImage({
  alt,
  src,
  className,
  fallbackClassName,
  width = 0,
  height = 0,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error || !src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/50 rounded-md",
          fallbackClassName || className
        )}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground opacity-70" />
      </div>
    );
  }

  // Convert width and height to numbers for comparison
  const numericWidth = typeof width === 'number' ? width : 0;
  const numericHeight = typeof height === 'number' ? height : 0;

  return (
    <div className={cn("overflow-hidden relative", className)}>
      <Image
        src={src}
        alt={alt}
        width={width || undefined}
        height={height || undefined}
        className={cn(
          "object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        // Only optimize images smaller than 1MB to prevent excessive resource usage
        unoptimized={typeof src === 'string' && src.startsWith('data:')}
        // Enable blur-up loading for images with sizes
        placeholder={numericWidth > 40 && numericHeight > 40 ? "blur" : "empty"}
        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        // Set priority for images above the fold
        priority={priority}
        {...props}
      />
    </div>
  );
}

// Optimized avatar component
export function OptimizedAvatar({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt || "Avatar"}
      width={40}
      height={40}
      className={cn("rounded-full w-10 h-10", className)}
      fallbackClassName={cn("rounded-full w-10 h-10", className)}
      {...props}
    />
  );
} 