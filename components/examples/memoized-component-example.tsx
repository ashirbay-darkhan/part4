'use client';

import { useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Regular component that will re-render every time
function RegularComponent({ label }: { label: string }) {
  console.log(`RegularComponent "${label}" rendering`);
  return (
    <div className="p-4 border rounded-md">
      <h3 className="font-medium text-sm mb-2">{label}</h3>
      <p className="text-xs text-muted-foreground">
        This component will re-render on every parent update
      </p>
    </div>
  );
}

// Memoized component that only re-renders when props change
const MemoizedComponent = memo(function MemoizedComponent({ label }: { label: string }) {
  console.log(`MemoizedComponent "${label}" rendering`);
  return (
    <div className="p-4 border rounded-md">
      <h3 className="font-medium text-sm mb-2">{label}</h3>
      <p className="text-xs text-muted-foreground">
        This component only re-renders when its props change
      </p>
    </div>
  );
});

// Example component that demonstrates the difference
export default function MemoizationExample() {
  const [counter1, setCounter1] = useState(0);
  const [counter2, setCounter2] = useState(0);
  
  // A callback that doesn't change
  const unchangingCallback = useCallback(() => {
    console.log('This callback never changes');
  }, []);
  
  // A callback that changes with counter2
  const changingCallback = useCallback(() => {
    console.log(`Current counter2 value: ${counter2}`);
  }, [counter2]);
  
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Regular Components</CardTitle>
            <CardDescription>These components re-render every time the parent updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RegularComponent label="Component A" />
            <RegularComponent label="Component B" />
            <div className="py-2">
              <p className="text-sm mb-2">Counter 1: {counter1}</p>
              <Button onClick={() => setCounter1(counter1 + 1)}>
                Increment Counter 1
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Memoized Components</CardTitle>
            <CardDescription>These components only re-render when props change</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MemoizedComponent label="Component C" />
            <MemoizedComponent label={`Component D (Counter 2: ${counter2})`} />
            <div className="py-2">
              <p className="text-sm mb-2">Counter 2: {counter2}</p>
              <Button onClick={() => setCounter2(counter2 + 1)}>
                Increment Counter 2
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="p-4 bg-muted/50 rounded-lg">
        <h2 className="font-medium mb-2">Rendering Explanation</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>When <strong>Counter 1</strong> changes, the parent re-renders. This causes <strong>all regular components</strong> to re-render, regardless of whether their props changed.</li>
          <li>When <strong>Counter 2</strong> changes, the parent re-renders. However, <strong>only the memoized component with props dependent on Counter 2</strong> will re-render.</li>
          <li>Open your browser's console to see the rendering logs.</li>
        </ul>
      </div>
      
      <div className="p-4 bg-muted/20 rounded-lg">
        <h2 className="font-medium mb-2">Performance Benefits</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Reduced unnecessary renders in complex component trees</li>
          <li>Better performance for heavy components like headers, sidebars, and complex forms</li>
          <li>Smoother user experience, especially on lower-end devices</li>
          <li>Lower memory usage and CPU consumption</li>
        </ul>
      </div>
    </div>
  );
} 