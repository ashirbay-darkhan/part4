# UI Performance Optimizations for High User Load

This document outlines optimizations to handle high user volume and provide faster UI responses.

## Server-Side Optimizations

### 1. Pagination and Query Limiting

```javascript
// Add pagination support to all collection endpoints
server.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/health-check')) {
    // Default pagination: 20 items per page
    const limit = parseInt(req.query._limit) || 20;
    const page = parseInt(req.query._page) || 1;
    req.query._limit = limit;
    req.query._page = page;
    
    // Add max limit to prevent overloading
    if (req.query._limit > 100) req.query._limit = 100;
  }
  next();
});
```

### 2. Response Compression

```javascript
const compression = require('compression');

// Add compression middleware (needs to be installed: npm install compression)
server.use(compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  // Don't compress responses for old browsers
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
```

### 3. Enhanced Caching Strategy

```javascript
// Extend cache duration for stable data
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for most data
const CACHE_DURATION_SHORT = 60 * 1000; // 1 minute for frequently changing data
const CACHE_DURATION_LONG = 30 * 60 * 1000; // 30 minutes for rarely changing data

// Add cache headers to responses
server.use((req, res, next) => {
  // Skip for mutations
  if (['GET', 'HEAD'].includes(req.method)) {
    if (req.path.includes('/services') || req.path.includes('/serviceCategories')) {
      // Services rarely change, longer cache
      res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minutes
    } else if (req.path.includes('/appointments')) {
      // Appointments change frequently, shorter cache
      res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute
    } else {
      // Default caching
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    }
  } else {
    // No caching for mutations
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});
```

### 4. Field Selection for Smaller Payloads

```javascript
// Support for field selection with _fields query parameter
server.use((req, res, next) => {
  if (req.method === 'GET' && req.query._fields) {
    const originalJson = res.json;
    res.json = function(data) {
      if (Array.isArray(data)) {
        const fields = req.query._fields.split(',');
        const filteredData = data.map(item => {
          const result = {};
          fields.forEach(field => {
            if (item[field] !== undefined) {
              result[field] = item[field];
            }
          });
          return result;
        });
        return originalJson.call(this, filteredData);
      }
      return originalJson.call(this, data);
    };
  }
  next();
});
```

### 5. Optimized Aggregation Endpoints

```javascript
// Endpoint for appointment calendar view (common UI need)
server.get('/appointment-calendar', (req, res) => {
  const { startDate, endDate, businessId } = req.query;
  
  // Validate required parameters
  if (!startDate || !endDate || !businessId) {
    return res.status(400).json({ error: 'Missing required parameters: startDate, endDate, businessId' });
  }
  
  // Get data from cache or database
  const db = safeReadDb();
  
  // Filter appointments by date range and business
  const appointments = db.appointments.filter(appt => 
    appt.businessId === businessId && 
    appt.date >= startDate && 
    appt.date <= endDate
  );
  
  // Structure data by date for calendar view
  const calendar = {};
  appointments.forEach(appt => {
    if (!calendar[appt.date]) {
      calendar[appt.date] = [];
    }
    calendar[appt.date].push(appt);
  });
  
  res.json(calendar);
});
```

## Client-Side Optimizations

### 1. Optimized API Module

```typescript
// Implement request deduplication
const pendingRequests = new Map();

export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}) {
  const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
  
  // Check for duplicate in-flight requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Create the promise for this request
  const requestPromise = (async () => {
    try {
      const response = await fetch(`/api/${endpoint}`, options);
      // Process response...
      return await response.json();
    } finally {
      // Remove from pending requests when done
      pendingRequests.delete(cacheKey);
    }
  })();
  
  // Store for deduplication
  pendingRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
}
```

### 2. Smart Data Fetching Patterns

```typescript
// Progressive loading pattern
export async function getBusinessDashboard(businessId: string) {
  // First fetch critical data
  const criticalData = await fetchAPI(`businesses/${businessId}/summary`);
  
  // Then fetch non-critical data in parallel
  const [services, appointments, stats] = await Promise.all([
    fetchAPI(`services?businessId=${businessId}&_fields=id,name,price`),
    fetchAPI(`appointments?businessId=${businessId}&status=Pending&_limit=5`),
    fetchAPI(`businesses/${businessId}/stats`)
  ]);
  
  return {
    ...criticalData,
    services,
    appointments,
    stats
  };
}
```

### 3. Virtualized List Rendering

```tsx
// Example using React virtualization for appointment lists
import { useVirtualizer } from '@tanstack/react-virtual';

export function AppointmentList({ appointments }) {
  const parentRef = React.useRef();
  
  const rowVirtualizer = useVirtualizer({
    count: appointments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // estimated row height
  });
  
  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <AppointmentItem appointment={appointments[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Data Structure Optimizations

### 1. Denormalized Collections for Common Views

```javascript
// Create denormalized collection for appointment views
server.get('/appointments-with-details', (req, res) => {
  const { businessId } = req.query;
  
  if (!businessId) {
    return res.status(400).json({ error: 'businessId is required' });
  }
  
  const db = safeReadDb();
  
  // Create denormalized appointment view with related entities
  const appointmentsWithDetails = db.appointments
    .filter(appt => appt.businessId === businessId)
    .map(appt => {
      const client = db.clients.find(c => c.id === appt.clientId) || {};
      const service = db.services.find(s => s.id === appt.serviceId) || {};
      const employee = db.users.find(u => u.id === appt.employeeId) || {};
      
      return {
        ...appt,
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone
        },
        service: {
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price
        },
        employee: {
          id: employee.id,
          name: employee.name
        }
      };
    });
  
  res.json(appointmentsWithDetails);
});
```

### 2. Client-Side Data Storage

```typescript
// Implement local storage caching with versioning
const CACHE_VERSION = '1';

export function saveToLocalCache(key: string, data: any, ttl: number = 5 * 60 * 1000) {
  try {
    const item = {
      version: CACHE_VERSION,
      data,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(item));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

export function getFromLocalCache(key: string) {
  try {
    const rawItem = localStorage.getItem(`cache_${key}`);
    if (!rawItem) return null;
    
    const item = JSON.parse(rawItem);
    
    // Check version and expiry
    if (item.version !== CACHE_VERSION || item.expiry < Date.now()) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    
    return item.data;
  } catch {
    return null;
  }
}
```

## Implementation Priorities

1. **Immediate implementation**: 
   - Response compression
   - Enhanced caching strategy
   - Field selection
   - Pagination

2. **Second phase**:
   - Optimized aggregation endpoints
   - Denormalized collections
   - Client-side API optimizations

3. **Third phase**:
   - Advanced UI virtualization
   - Progressive loading patterns
   - Client-side storage optimizations

Each optimization should be measured for impact on:
- Server response time
- Network payload size
- UI rendering time
- Memory usage

Regular performance monitoring should be established to ensure optimizations are effective as user load increases. 