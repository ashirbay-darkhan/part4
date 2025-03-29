const jsonServer = require('json-server');
const server = jsonServer.create();
const path = require('path');
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const fs = require('fs');
const compression = require('compression');

// Cache configurations
const CACHE_DURATION = 5 * 60 * 1000; // Extended to 5 minutes for better performance
const CACHE_DURATION_SHORT = 60 * 1000; // 1 minute for frequently changing data
const CACHE_DURATION_LONG = 30 * 60 * 1000; // 30 minutes for rarely changing data
const cache = {
  data: null,
  indexes: {}, // Store indexes for faster lookups
  lastUpdated: 0
};

// Enable compression for all responses to reduce payload size and improve UI performance
server.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Set default middlewares with watch enabled
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Add pagination and field selection support for all GET requests
server.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/health-check')) {
    // Default pagination: 20 items per page
    const limit = parseInt(req.query._limit) || 20;
    const page = parseInt(req.query._page) || 1;
    req.query._limit = limit;
    req.query._page = page;
    
    // Add max limit to prevent overloading with large result sets
    if (req.query._limit > 100) req.query._limit = 100;
    
    // Support field selection to reduce payload size
    if (req.query._fields) {
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
  }
  next();
});

// Add cache headers based on content type for better client caching
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

// Log when db.json changes are detected
fs.watch('db.json', (eventType, filename) => {
  console.log(`\n[${new Date().toLocaleTimeString()}] db.json ${eventType} detected. Server reloading data...`);
  // Invalidate cache when db.json changes
  cache.data = null;
  cache.indexes = {};
  cache.lastUpdated = 0;
});

// Helper function to generate consistent string IDs
const generateId = () => {
  // Use timestamp plus random suffix for more uniqueness
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${timestamp}${random}`;
};

// Add server health check endpoint
server.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Simple middleware to log requests with performance metrics
server.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`${req.method} ${req.url}`);
  
  // Add detailed logging for writes only in development mode
  if (process.env.NODE_ENV === 'development' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  
  // Capture and log the response with performance metrics
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    // Only log brief summaries, not entire response bodies
    console.log(`Response in ${duration}ms: ${req.method} ${req.url}`);
    return originalJson.call(this, body);
  };
  
  next();
});

// Helper function to safely read from the db.json file with caching
const safeReadDb = () => {
  try {
    const currentTime = Date.now();
    
    // Return cached data if it's still valid
    if (cache.data && (currentTime - cache.lastUpdated) < CACHE_DURATION) {
      return cache.data;
    }
    
    // Read the current database file
    const rawData = fs.readFileSync('db.json', 'utf8');
    const data = JSON.parse(rawData);
    
    // Update cache
    cache.data = data;
    cache.lastUpdated = currentTime;
    
    // Build indexes for common lookup patterns
    buildIndexes(data);
    
    return data;
  } catch (error) {
    console.error('Error reading database file:', error);
    // Return a minimal valid database structure if file can't be read
    return {
      users: [],
      businesses: [],
      services: [],
      appointments: [],
      clients: [],
      serviceCategories: []
    };
  }
};

// Build indexes for faster lookups
const buildIndexes = (data) => {
  // Index users by businessId
  cache.indexes.usersByBusinessId = {};
  if (data.users) {
    data.users.forEach(user => {
      if (user.businessId) {
        if (!cache.indexes.usersByBusinessId[user.businessId]) {
          cache.indexes.usersByBusinessId[user.businessId] = [];
        }
        cache.indexes.usersByBusinessId[user.businessId].push(user);
      }
    });
  }
  
  // Index services by businessId
  cache.indexes.servicesByBusinessId = {};
  if (data.services) {
    data.services.forEach(service => {
      if (service.businessId) {
        if (!cache.indexes.servicesByBusinessId[service.businessId]) {
          cache.indexes.servicesByBusinessId[service.businessId] = [];
        }
        cache.indexes.servicesByBusinessId[service.businessId].push(service);
      }
    });
  }
  
  // Index appointments by date and by employeeId
  cache.indexes.appointmentsByDate = {};
  cache.indexes.appointmentsByEmployeeId = {};
  cache.indexes.appointmentsByBusinessId = {};
  if (data.appointments) {
    data.appointments.forEach(appointment => {
      // Index by date
      if (appointment.date) {
        if (!cache.indexes.appointmentsByDate[appointment.date]) {
          cache.indexes.appointmentsByDate[appointment.date] = [];
        }
        cache.indexes.appointmentsByDate[appointment.date].push(appointment);
      }
      
      // Index by employeeId
      if (appointment.employeeId) {
        if (!cache.indexes.appointmentsByEmployeeId[appointment.employeeId]) {
          cache.indexes.appointmentsByEmployeeId[appointment.employeeId] = [];
        }
        cache.indexes.appointmentsByEmployeeId[appointment.employeeId].push(appointment);
      }
      
      // Index by businessId
      if (appointment.businessId) {
        if (!cache.indexes.appointmentsByBusinessId[appointment.businessId]) {
          cache.indexes.appointmentsByBusinessId[appointment.businessId] = [];
        }
        cache.indexes.appointmentsByBusinessId[appointment.businessId].push(appointment);
      }
    });
  }
  
  // Index clients by businessId
  cache.indexes.clientsByBusinessId = {};
  if (data.clients) {
    data.clients.forEach(client => {
      if (client.businessId) {
        if (!cache.indexes.clientsByBusinessId[client.businessId]) {
          cache.indexes.clientsByBusinessId[client.businessId] = [];
        }
        cache.indexes.clientsByBusinessId[client.businessId].push(client);
      }
    });
  }
};

// Helper function to safely write to the db.json file
const safeWriteDb = (db) => {
  try {
    // Create a backup with timestamp in a more efficient way
    const timestamp = Date.now();
    // Only create backup for significant changes (once per hour)
    const lastBackupFile = fs.readdirSync('.')
      .filter(file => file.startsWith('db.backup.') && file.endsWith('.json'))
      .sort()
      .pop();
    
    const shouldCreateBackup = !lastBackupFile || 
      (timestamp - parseInt(lastBackupFile.split('.')[2])) > (60 * 60 * 1000); // 1 hour
    
    if (shouldCreateBackup) {
      fs.writeFileSync(`db.backup.${timestamp}.json`, JSON.stringify(db, null, 2));
      
      // Remove old backups (keep only the latest 5)
      const backups = fs.readdirSync('.')
        .filter(file => file.startsWith('db.backup.') && file.endsWith('.json'))
        .sort();
      
      if (backups.length > 5) {
        backups.slice(0, backups.length - 5).forEach(file => {
          fs.unlinkSync(file);
        });
      }
    }
    
    // Write the updated database
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
    
    // Invalidate cache
    cache.data = null;
    cache.indexes = {};
    cache.lastUpdated = 0;
    
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
};

// Middleware to ensure consistent data formats and validation
server.use((req, res, next) => {
  // Only intercept write operations (POST, PUT, PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    try {
      // Ensure IDs are strings
      if (req.body.id && typeof req.body.id !== 'string') {
        req.body.id = req.body.id.toString();
      }
      
      // Ensure businessId is a string
      if (req.body.businessId && typeof req.body.businessId !== 'string') {
        req.body.businessId = req.body.businessId.toString();
      }
      
      // Ensure serviceIds is an array of strings
      if (req.body.serviceIds) {
        if (!Array.isArray(req.body.serviceIds)) {
          req.body.serviceIds = [];
        } else {
          req.body.serviceIds = req.body.serviceIds.map(id => id.toString());
        }
      }
      
      // Add _timestamp for auditing when creating or updating records
      req.body._timestamp = Date.now();
      
      // Validate email format if provided
      if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Validate phone number format if provided
      if (req.body.phone && !/^\+?[0-9\s\-\(\)]{8,}$/.test(req.body.phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      
      // Validate appointment times if relevant fields are provided
      if ((req.body.startTime || req.body.endTime) && req.body.date) {
        // Ensure times are in valid format (HH:MM)
        if (req.body.startTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(req.body.startTime)) {
          return res.status(400).json({ error: 'Invalid start time format. Use HH:MM format.' });
        }
        
        if (req.body.endTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(req.body.endTime)) {
          return res.status(400).json({ error: 'Invalid end time format. Use HH:MM format.' });
        }
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.date)) {
          return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD format.' });
        }
      }
    } catch (error) {
      console.error('Error in validation middleware:', error);
      return res.status(400).json({ error: 'Invalid request data' });
    }
  }
  
  next();
});

// Route for optimized business data retrieval
server.get('/business-data/:id', (req, res) => {
  const businessId = req.params.id;
  
  // Get data from db.json using the safe read method
  const db = safeReadDb();
  
  // Use indexes if available for faster lookups
  const business = db.businesses.find(b => b.id === businessId);
  
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }
  
  // Get related data using indexes when available
  const users = cache.indexes.usersByBusinessId?.[businessId] || 
    db.users.filter(user => user.businessId === businessId);
  
  const services = cache.indexes.servicesByBusinessId?.[businessId] || 
    db.services.filter(service => service.businessId === businessId);
  
  const appointments = cache.indexes.appointmentsByBusinessId?.[businessId] || 
    db.appointments.filter(appointment => appointment.businessId === businessId);
  
  const clients = cache.indexes.clientsByBusinessId?.[businessId] || 
    db.clients.filter(client => client.businessId === businessId);
  
  const serviceCategories = db.serviceCategories ?
    db.serviceCategories.filter(category => category.businessId === businessId) :
    [];
  
  // Return comprehensive business data
  res.json({
    business,
    users,
    services,
    appointments,
    clients,
    serviceCategories
  });
});

// Optimized appointment scheduling with validation and conflict detection
server.post('/schedule-appointment', (req, res) => {
  try {
    const { 
      clientId, 
      employeeId, 
      serviceId, 
      date, 
      startTime, 
      businessId 
    } = req.body;
    
    // Validate required fields
    if (!clientId || !employeeId || !serviceId || !date || !startTime || !businessId) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        requiredFields: ['clientId', 'employeeId', 'serviceId', 'date', 'startTime', 'businessId'] 
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD format.' });
    }
    
    // Validate time format
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
      return res.status(400).json({ error: 'Invalid start time format. Use HH:MM format.' });
    }
    
    // Get data
    const db = safeReadDb();
    
    // Check if service exists and belongs to the business
    const service = db.services.find(s => s.id === serviceId && s.businessId === businessId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found or does not belong to this business' });
    }
    
    // Check if employee exists and belongs to the business
    const employee = db.users.find(u => u.id === employeeId && u.businessId === businessId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found or does not belong to this business' });
    }
    
    // Check if employee provides this service
    if (employee.serviceIds && !employee.serviceIds.includes(serviceId)) {
      return res.status(400).json({ error: 'Employee does not provide this service' });
    }
    
    // Check if client exists and belongs to the business
    const client = db.clients.find(c => c.id === clientId && c.businessId === businessId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found or does not belong to this business' });
    }
    
    // Calculate end time
    const durationInMinutes = service.duration || 60; // Default to 60 minutes if not specified
    
    // Parse start time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    
    // Calculate end time
    let endHour = startHour;
    let endMinute = startMinute + durationInMinutes;
    
    // Adjust for hour overflow
    while (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    
    // Format end time
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Check for conflicts - use index if available for better performance
    const dateAppointments = cache.indexes.appointmentsByDate?.[date] || 
      db.appointments.filter(a => a.date === date);
    
    // Now filter only this employee's appointments on this date
    const employeeAppointments = dateAppointments.filter(a => a.employeeId === employeeId);
    
    // Check for time conflicts
    const hasConflict = employeeAppointments.some(appointment => {
      const apptStart = appointment.startTime;
      const apptEnd = appointment.endTime;
      
      // Check if the new appointment overlaps with an existing one
      return (startTime < apptEnd && endTime > apptStart);
    });
    
    if (hasConflict) {
      return res.status(409).json({ error: 'Time slot is not available. Please select another time.' });
    }
    
    // Check if employee is working on this day and time
    if (employee.workingHours) {
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const appointmentDate = new Date(date);
      const dayOfWeek = appointmentDate.getDay() === 0 ? 7 : appointmentDate.getDay();
      
      // Find the working hours for this day
      const dayWorkingHours = employee.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
      
      // Check if employee is working on this day
      if (!dayWorkingHours || !dayWorkingHours.isWorking) {
        return res.status(400).json({ error: 'Employee is not working on this day' });
      }
      
      // Check if employee has this time slot available
      if (dayWorkingHours.timeSlots && !dayWorkingHours.timeSlots.includes(startTime)) {
        return res.status(400).json({ error: 'Selected time slot is not available for this employee' });
      }
    }
    
    // Create the appointment
    const newAppointment = {
      id: db.appointments.length + 1, // Generate sequential ID for appointments
      clientId,
      employeeId,
      serviceId,
      date,
      startTime,
      endTime,
      duration: durationInMinutes,
      status: 'Pending',
      price: service.price,
      businessId,
      _timestamp: Date.now()
    };
    
    // Add to db
    db.appointments.push(newAppointment);
    
    // Update client's total visits
    if (client.totalVisits !== undefined) {
      client.totalVisits += 1;
    } else {
      client.totalVisits = 1;
    }
    
    // Save to db
    safeWriteDb(db);
    
    // Return the created appointment
    res.status(201).json(newAppointment);
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    res.status(500).json({ error: 'Failed to schedule appointment' });
  }
});

// Batch operations endpoint for better performance
server.post('/batch', async (req, res) => {
  try {
    // Get the batch operations from the request body
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ error: 'Invalid batch operations format' });
    }
    
    // Read database once at the beginning
    const db = safeReadDb();
    
    // Track if we need to save changes
    let hasChanges = false;
    
    // Results to return
    const results = [];
    
    // Process each operation
    for (const operation of operations) {
      const { type, entity, id, data } = operation;
      
      // Validate operation
      if (!type || !entity || !db[entity]) {
        results.push({ error: `Invalid operation: missing type, entity, or entity "${entity}" doesn't exist`, operation });
        continue;
      }
      
      try {
        // Process based on operation type
        switch (type) {
          case 'create': {
            if (!data) {
              results.push({ error: 'Create operation requires data', operation });
              continue;
            }
            
            // Generate ID if not provided
            const itemId = data.id || generateId();
            
            // Create new item with ID
            const newItem = { ...data, id: itemId };
            
            // Add to collection
            db[entity].push(newItem);
            
            // Mark as changed
            hasChanges = true;
            
            // Add result
            results.push({ success: true, entity, id: itemId, data: newItem });
            break;
          }
          
          case 'update': {
            if (!id || !data) {
              results.push({ error: 'Update operation requires id and data', operation });
              continue;
            }
            
            // Find item
            const index = db[entity].findIndex(item => item.id === id);
            
            if (index === -1) {
              results.push({ error: `${entity} with id ${id} not found`, operation });
              continue;
            }
            
            // Update item
            const updatedItem = { ...db[entity][index], ...data };
            db[entity][index] = updatedItem;
            
            // Mark as changed
            hasChanges = true;
            
            // Add result
            results.push({ success: true, entity, id, data: updatedItem });
            break;
          }
          
          case 'delete': {
            if (!id) {
              results.push({ error: 'Delete operation requires id', operation });
              continue;
            }
            
            // Find item
            const index = db[entity].findIndex(item => item.id === id);
            
            if (index === -1) {
              results.push({ error: `${entity} with id ${id} not found`, operation });
              continue;
            }
            
            // Delete item
            const deletedItem = db[entity][index];
            db[entity].splice(index, 1);
            
            // Mark as changed
            hasChanges = true;
            
            // Add result
            results.push({ success: true, entity, id, data: deletedItem });
            break;
          }
          
          case 'read': {
            // For read operations with an ID
            if (id) {
              const item = db[entity].find(item => item.id === id);
              
              if (!item) {
                results.push({ error: `${entity} with id ${id} not found`, operation });
                continue;
              }
              
              results.push({ success: true, entity, id, data: item });
            } 
            // For read operations with filter criteria
            else if (data && typeof data === 'object') {
              // Filter items based on criteria
              const items = db[entity].filter(item => {
                // Check if all criteria match
                return Object.entries(data).every(([key, value]) => item[key] === value);
              });
              
              results.push({ success: true, entity, data: items });
            } 
            // For read all operations
            else {
              results.push({ success: true, entity, data: db[entity] });
            }
            break;
          }
          
          default:
            results.push({ error: `Unknown operation type: ${type}`, operation });
        }
      } catch (operationError) {
        results.push({ error: `Error processing operation: ${operationError.message}`, operation });
      }
    }
    
    // Save changes if needed
    if (hasChanges) {
      safeWriteDb(db);
    }
    
    // Return results
    res.json({ results });
  } catch (error) {
    console.error('Error processing batch operations:', error);
    res.status(500).json({ error: 'Internal server error processing batch operations' });
  }
});

// Simple authentication without JWT for now
server.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Get users from db.json using the safe read method
  const db = safeReadDb();
  const users = db.users || [];
  
  // Find user by email (simplified - no password hashing yet)
  const user = users.find(user => user.email === email);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  
  // Return user data with a dummy token
  res.status(200).json({
    user: userWithoutPassword,
    token: 'dummy-jwt-token'
  });
});

server.post('/register', (req, res) => {
  const { email, password, name, businessName, avatar } = req.body;
  
  // Read the current database using the safe read method
  const db = safeReadDb();
  const users = db.users || [];
  
  // Check if user already exists
  if (users.find(user => user.email === email)) {
    return res.status(400).json({ error: 'Email already in use' });
  }
  
  // Create business ID
  const businessId = generateId();
  
  // Generate avatar if not provided
  const userAvatar = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=B91C1C&color=fff`;
  
  // Create new user (no password hashing for simplicity)
  const newUser = {
    id: businessId, // Match user ID with business ID
    name,
    email,
    password, // Plain text for now - we'll improve this later
    role: 'admin',
    businessId,
    businessName,
    isVerified: false,
    avatar: userAvatar,
    serviceIds: [] // Initialize with empty array for consistency
  };
  
  // Add to users array
  db.users = [...users, newUser];
  
  // Create new business
  const businesses = db.businesses || [];
  const newBusiness = {
    id: businessId,
    name: businessName,
    ownerId: newUser.id,
    email
  };
  db.businesses = [...businesses, newBusiness];
  
  // Write back to db.json using the safe write method
  if (!safeWriteDb(db)) {
    return res.status(500).json({ error: 'Failed to save user data' });
  }
  
  // Remove password from response
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json({
    user: userWithoutPassword,
    token: 'dummy-jwt-token'
  });
});

// Essential routes for entity creation/management with optimizations
server.post('/services', (req, res) => {
  const db = safeReadDb();
  const serviceId = generateId();
  const businessId = req.body.businessId ? req.body.businessId.toString() : req.body.businessId;
  
  const newService = {
    ...req.body,
    id: serviceId,
    businessId
  };
  
  db.services = [...(db.services || []), newService];
  
  if (!safeWriteDb(db)) {
    return res.status(500).json({ error: 'Failed to save service data' });
  }
  
  res.status(201).json(newService);
});

server.post('/serviceCategories', (req, res) => {
  const db = safeReadDb();
  if (!db.serviceCategories) db.serviceCategories = [];
  
  const categoryId = generateId();
  const businessId = req.body.businessId ? req.body.businessId.toString() : req.body.businessId;
  
  const newCategory = {
    ...req.body,
    id: categoryId,
    businessId
  };
  
  db.serviceCategories.push(newCategory);
  
  if (!safeWriteDb(db)) {
    return res.status(500).json({ error: 'Failed to save category data' });
  }
  
  res.status(201).json(newCategory);
});

// Add optimized endpoint for appointment calendar view
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

// Add denormalized endpoint for appointments with details
server.get('/appointments-with-details', (req, res) => {
  const { businessId, limit = 20, page = 1 } = req.query;
  
  if (!businessId) {
    return res.status(400).json({ error: 'businessId is required' });
  }
  
  const db = safeReadDb();
  
  // Filter appointments by business
  const businessAppointments = db.appointments.filter(appt => 
    appt.businessId === businessId
  );
  
  // Paginate results
  const startIndex = (page - 1) * limit;
  const paginatedAppointments = businessAppointments.slice(startIndex, startIndex + parseInt(limit));
  
  // Create denormalized appointment view with related entities
  const appointmentsWithDetails = paginatedAppointments.map(appt => {
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
  
  // Add pagination metadata
  res.json({
    data: appointmentsWithDetails,
    meta: {
      totalCount: businessAppointments.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pageCount: Math.ceil(businessAppointments.length / limit)
    }
  });
});

// Add optimized endpoint for dashboard summary data
server.get('/businesses/:id/summary', (req, res) => {
  const businessId = req.params.id;
  
  // Get data from cache or database
  const db = safeReadDb();
  
  // Find the business
  const business = db.businesses.find(b => b.id === businessId);
  
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Get counts for dashboard
  const totalStaff = db.users.filter(u => u.businessId === businessId && u.role === 'staff').length;
  const totalServices = db.services.filter(s => s.businessId === businessId).length;
  const totalClients = db.clients.filter(c => c.businessId === businessId).length;
  const todayAppointments = db.appointments.filter(a => a.businessId === businessId && a.date === today);
  
  // Calculate total revenue
  const totalRevenue = db.appointments
    .filter(a => a.businessId === businessId && a.status === 'Completed')
    .reduce((sum, appt) => sum + (appt.price || 0), 0);
  
  // Return the summary data
  res.json({
    id: business.id,
    name: business.name,
    stats: {
      totalStaff,
      totalServices,
      totalClients,
      todayAppointmentCount: todayAppointments.length,
      totalRevenue
    },
    todayAppointments: todayAppointments.slice(0, 5) // Only return first 5 for summary
  });
});

// Use the default router as fallback
server.use(router);

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`);
  console.log(`Optimized for high performance and user load`);
});