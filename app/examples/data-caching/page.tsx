import DataUsageExample from '@/components/examples/data-usage-example';

export default function DataCachingExamplePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Data Caching with SWR Example</h1>
      <p className="mb-4 text-gray-700">
        This example demonstrates how to use SWR for efficient API request caching. 
        Requests for the same data are deduplicated and cached, reducing server load and 
        improving performance.
      </p>
      <div className="mt-8">
        <DataUsageExample />
      </div>
    </div>
  );
} 