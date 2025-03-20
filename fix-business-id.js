/**
 * Fix Business ID Script
 * 
 * This script checks for the current user in localStorage and ensures
 * that the business_id is properly set separately for direct access.
 * 
 * Run this in the browser console to fix the business ID issue if experiencing problems.
 */

(function fixBusinessId() {
  console.log('Running business ID fix...');
  
  try {
    // Get the current user from localStorage
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
      console.log('No user found in localStorage. Please log in first.');
      return;
    }
    
    // Parse the user data
    const userData = JSON.parse(userJson);
    
    // Check if the user has a business ID
    if (!userData.businessId) {
      console.error('User has no business ID in their profile data. This is a critical error.');
      return;
    }
    
    // Ensure the business ID is a string
    const businessId = userData.businessId.toString();
    
    // Set the business ID in localStorage
    localStorage.setItem('business_id', businessId);
    
    console.log(`Business ID fixed: ${businessId}`);
    console.log('You should now be able to create services without errors.');
    
    // Print helpful information
    console.log('\nDebug information:');
    console.log('- User ID:', userData.id);
    console.log('- Business ID:', businessId);
    console.log('- User Email:', userData.email);
    console.log('- Business Name:', userData.businessName);
    
  } catch (error) {
    console.error('Error fixing business ID:', error);
  }
})(); 