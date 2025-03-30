import OptimizedImagesExample from '@/components/examples/optimized-images-example';

export default function OptimizedImagesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Image Optimization Examples</h1>
      <p className="mb-4 text-gray-700">
        This page demonstrates the image optimization features implemented in the application.
        These optimizations improve loading performance, reduce bandwidth usage, and enhance
        the overall user experience.
      </p>
      <div className="mt-8">
        <OptimizedImagesExample />
      </div>
    </div>
  );
} 