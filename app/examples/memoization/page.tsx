import MemoizationExample from '@/components/examples/memoized-component-example';

export default function MemoizationPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Component Memoization Example</h1>
      <p className="mb-4 text-gray-700">
        This example demonstrates the performance benefits of using React.memo to optimize 
        component rendering. The Header component in this application has been memoized to 
        prevent unnecessary re-renders when the parent component updates but the props passed 
        to the header remain the same.
      </p>
      <div className="mt-8">
        <MemoizationExample />
      </div>
    </div>
  );
} 