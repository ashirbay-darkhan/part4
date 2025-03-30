import ApiClientExample from '@/components/examples/api-client-example';

export default function ApiClientPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Memory-Efficient API Client Example</h1>
      <p className="mb-4 text-gray-700">
        This example demonstrates the new memory-efficient API client implementation.
        It provides a streamlined approach to API calls with better error handling and 
        reduced memory footprint.
      </p>
      <div className="mt-8">
        <ApiClientExample />
      </div>
    </div>
  );
} 