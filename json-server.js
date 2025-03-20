const jsonServer = require('json-server');
const server = jsonServer.create();
const path = require('path');
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const fs = require('fs');

// Enable watching for file changes (reload on db.json changes)
const watchOptions = {
  watch: true,
  delay: 100 // ms
};

// Set default middlewares with watch enabled
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Log when db.json changes are detected
fs.watch('db.json', (eventType, filename) => {
  console.log(`\n[${new Date().toLocaleTimeString()}] db.json ${eventType} detected. Server reloading data...`);
});

// Helper function to generate consistent string IDs
const generateId = () => {
  return Date.now().toString();
};

// Simple middleware to log requests
server.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  
  // Add detailed logging for writes
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  
  // Capture and log the response
  const originalJson = res.json;
  res.json = function(body) {
    console.log('Response:', JSON.stringify(body, null, 2).substring(0, 200) + (JSON.stringify(body).length > 200 ? '...' : ''));
    return originalJson.call(this, body);
  };
  
  next();
});

// Helper function to safely read from the db.json file
const safeReadDb = () => {
  try {
    // Read the current database file
    const rawData = fs.readFileSync('db.json', 'utf8');
    return JSON.parse(rawData);
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

// Helper function to safely write to the db.json file
const safeWriteDb = (db) => {
  try {
    // Removed backup creation code
    
    // Write the updated database
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
};

// Middleware to ensure consistent data formats
server.use((req, res, next) => {
  // Only intercept write operations (POST, PUT, PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
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
  }
  
  next();
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

// Custom route for creating services with consistent IDs
server.post('/services', (req, res) => {
  // Read the database using the safe read method
  const db = safeReadDb();
  const services = db.services || [];
  
  // Generate a string ID
  const serviceId = generateId();
  
  // Ensure businessId is a string
  const businessId = req.body.businessId ? req.body.businessId.toString() : req.body.businessId;
  
  // Create the new service with string ID
  const newService = {
    ...req.body,
    id: serviceId,
    businessId
  };
  
  // Add to services array
  db.services = [...services, newService];
  
  // Write back to db.json using the safe write method
  if (!safeWriteDb(db)) {
    return res.status(500).json({ error: 'Failed to save service data' });
  }
  
  res.status(201).json(newService);
});

// Custom route for creating service categories
server.post('/serviceCategories', (req, res) => {
  // Read the database using the safe read method
  const db = safeReadDb();
  
  // Initialize serviceCategories array if it doesn't exist
  if (!db.serviceCategories) {
    db.serviceCategories = [];
  }
  
  // Generate a string ID
  const categoryId = generateId();
  
  // Ensure businessId is a string
  const businessId = req.body.businessId ? req.body.businessId.toString() : req.body.businessId;
  
  // Create the new category with string ID
  const newCategory = {
    ...req.body,
    id: categoryId,
    businessId
  };
  
  // Add to serviceCategories array
  db.serviceCategories.push(newCategory);
  
  // Write back to db.json using the safe write method
  if (!safeWriteDb(db)) {
    return res.status(500).json({ error: 'Failed to save category data' });
  }
  
  res.status(201).json(newCategory);
});

// Custom GET route for service categories with filtering by businessId
server.get('/serviceCategories', (req, res) => {
  // Read the database
  const db = safeReadDb();
  
  // Initialize serviceCategories array if it doesn't exist
  if (!db.serviceCategories) {
    db.serviceCategories = [];
  }
  
  // Get the businessId query parameter
  const businessId = req.query.businessId;
  
  // Filter categories by businessId if provided
  let categories = db.serviceCategories;
  if (businessId) {
    categories = categories.filter(category => 
      category.businessId && category.businessId.toString() === businessId.toString()
    );
  }
  
  res.status(200).json(categories);
});

// Custom PATCH route for updating services
server.patch('/services/:id', (req, res) => {
  // Read the database using the safe read method
  const db = safeReadDb();
  const serviceId = req.params.id;
  
  // Find the service to update
  const services = db.services || [];
  const serviceIndex = services.findIndex(s => s.id.toString() === serviceId.toString());
  
  if (serviceIndex === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  // Update the service while preserving the ID and businessId
  const updatedService = { 
    ...services[serviceIndex],
    ...req.body,
    id: services[serviceIndex].id, // Preserve the original ID
    businessId: services[serviceIndex].businessId // Preserve the original businessId
  };
  
  // Replace the service in the array
  db.services[serviceIndex] = updatedService;
  
  // Write back to db.json using the safe write method
  if (!safeWriteDb(db)) {
    return res.status(500).json({ error: 'Failed to update service' });
  }
  
  res.status(200).json(updatedService);
});

// Use a custom router to handle routes not caught by specific handlers
const customRouter = jsonServer.router('db.json');
server.use((req, res, next) => {
  // Only handle routes that haven't been caught by our custom handlers
  // For PUT and PATCH requests (updates), we need to handle them specially to avoid data corruption
  if ((req.method === 'PUT' || req.method === 'PATCH') && req.path !== '/') {
    // Don't handle /services/:id paths here - they're already handled by our custom route
    if (req.path.startsWith('/services/')) {
      return next();
    }
    
    const db = safeReadDb();
    const urlParts = req.path.split('/');
    const resource = urlParts[1]; // e.g. 'users', 'businesses'
    const id = urlParts[2];       // e.g. '1', '2'
    
    if (id && db[resource]) {
      // Find the item to update
      const itemIndex = db[resource].findIndex(item => item.id.toString() === id.toString());
      
      if (itemIndex !== -1) {
        // Update the item
        db[resource][itemIndex] = { 
          ...db[resource][itemIndex], 
          ...req.body,
          id: id.toString() // Ensure ID remains a string and unchanged
        };
        
        // Write back to db.json
        if (safeWriteDb(db)) {
          return res.status(200).json(db[resource][itemIndex]);
        } else {
          return res.status(500).json({ error: 'Failed to update record' });
        }
      }
    }
  }
  
  // For any other requests, use the default router
  next();
});

// Use the default router as fallback
server.use(customRouter);

// Create a rewriter that enables reloading when db.json changes
const rewriter = jsonServer.rewriter({
  '/db': '/db' // Keep this endpoint accessible
});
server.use(rewriter);

// Setup the router with watch options to reload when db.json changes
server.use(router);

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`);
  console.log(`Database operations are using safe read/write methods to prevent data corruption`);
  console.log(`Watching db.json for changes - server will auto-reload data when file changes`);
});