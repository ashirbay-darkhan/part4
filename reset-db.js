/**
 * Database Reset and Clean-up Tool
 * 
 * This script cleans up the db.json file by:
 * 1. Preserving Richard's account and associated business
 * 2. Removing all other user accounts
 * 3. Preserving services linked to Richard's business
 * 4. Removing unlinked services and other entities
 * 5. Ensuring all IDs are consistent strings
 */

const fs = require('fs');
const path = require('path');

console.log('Starting database cleanup...');

// Path to the database file
const dbPath = path.join(__dirname, 'db.json');

// Create a clean Richard account
const createRichardAccount = () => {
  const userId = Date.now().toString();
  
  return {
    id: userId,
    name: "Richard Henricks",
    email: "richard@gmail.com",
    password: "asdasdasd",
    role: "admin",
    businessId: userId,
    businessName: "Pied piper",
    isVerified: false,
    serviceIds: []
  };
};

// Create a clean Richard business
const createRichardBusiness = (userId) => {
  return {
    id: userId,
    name: "Pied piper",
    ownerId: userId,
    email: "richard@gmail.com"
  };
};

// Read current database
try {
  // Check if the file exists
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found at ${dbPath}`);
    process.exit(1);
  }

  // Read and parse the db.json file
  const rawData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(rawData);
  
  console.log('Current database status:');
  console.log(`- ${db.users?.length || 0} users`);
  console.log(`- ${db.businesses?.length || 0} businesses`);
  console.log(`- ${db.services?.length || 0} services`);
  console.log(`- ${db.appointments?.length || 0} appointments`);
  console.log(`- ${db.clients?.length || 0} clients`);
  
  // Find Richard's account - specifically by name and email
  const richardAccount = db.users?.find(user => 
    user.name === "Richard Henricks" && user.email === "richard@gmail.com"
  );
  
  // Create a new account if not found
  const userAccount = richardAccount || createRichardAccount();
  console.log(`Using account: ${userAccount.name} (${userAccount.email})`);
  
  // Ensure IDs are strings
  userAccount.id = userAccount.id.toString();
  userAccount.businessId = userAccount.businessId?.toString() || userAccount.id.toString();
  
  // Find the business using the exact businessId
  const businessRecord = db.businesses?.find(business => 
    business.id.toString() === userAccount.businessId
  ) || createRichardBusiness(userAccount.id);
  
  console.log(`Using business: ${businessRecord.name}`);
  
  // Ensure business IDs are strings
  businessRecord.id = businessRecord.id.toString();
  businessRecord.ownerId = businessRecord.ownerId.toString();
  
  // Find services associated with the business
  const businessServices = db.services?.filter(service => 
    service.businessId?.toString() === businessRecord.id
  ) || [];
  
  console.log(`Found ${businessServices.length} services for this business`);
  
  // Ensure all service IDs are strings
  const cleanServices = businessServices.map(service => ({
    ...service,
    id: service.id.toString(),
    businessId: service.businessId.toString()
  }));
  
  // Create clean database with just Richard's data
  const cleanDb = {
    users: [userAccount],
    businesses: [businessRecord],
    services: cleanServices,
    appointments: [],
    clients: []
  };
  
  // Write the clean database
  fs.writeFileSync(dbPath, JSON.stringify(cleanDb, null, 2));
  
  console.log('\nDatabase has been cleaned successfully:');
  console.log(`- ${cleanDb.users.length} users`);
  console.log(`- ${cleanDb.businesses.length} businesses`);
  console.log(`- ${cleanDb.services.length} services`);
  console.log(`- ${cleanDb.appointments.length} appointments`);
  console.log(`- ${cleanDb.clients.length} clients`);
  
} catch (error) {
  console.error('Error while cleaning database:', error);
  process.exit(1);
} 