/**
 * Debug Services - Run this in the browser console
 * 
 * This script will help diagnose why services aren't displaying.
 */

(function debugServices() {
  console.group('🔍 Debugging Service Display Issues');
  
  // Check localStorage for business ID
  const storedBusinessId = localStorage.getItem('business_id');
  console.log('Business ID in localStorage:', storedBusinessId);
  
  // Check user data in localStorage
  let userBusinessId = null;
  try {
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    userBusinessId = userData.businessId;
    console.log('User data from localStorage:', userData);
    console.log('Business ID from user data:', userBusinessId);
  } catch (e) {
    console.error('Error parsing user data:', e);
  }
  
  // Compare IDs
  if (storedBusinessId !== userBusinessId) {
    console.warn('⚠️ Business ID mismatch between localStorage and user data!');
    console.log('Should fix by setting:', userBusinessId);
    
    if (userBusinessId) {
      if (confirm('Fix localStorage business_id?')) {
        localStorage.setItem('business_id', userBusinessId);
        console.log('✅ Fixed localStorage business_id to:', userBusinessId);
      }
    }
  } else {
    console.log('✅ Business IDs match properly');
  }
  
  // Check services in db.json
  console.log('Fetching services from API...');
  fetch('http://localhost:3001/services')
    .then(res => res.json())
    .then(services => {
      console.log('All services in database:', services);
      
      // Filter services by the business ID
      const matchingServices = services.filter(s => 
        s.businessId && s.businessId.toString() === storedBusinessId
      );
      
      console.log(`Found ${matchingServices.length} services matching your business ID:`, matchingServices);
      
      if (matchingServices.length === 0) {
        console.error('❌ No services found for your business ID!');
        
        if (services.length > 0) {
          const firstService = services[0];
          console.log('First service businessId:', firstService.businessId);
          console.log('Your businessId:', storedBusinessId);
          
          if (confirm('Fix the first service\'s businessId to match yours?')) {
            fetch(`http://localhost:3001/services/${firstService.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ businessId: storedBusinessId })
            })
              .then(res => {
                if (res.ok) {
                  console.log('✅ Fixed service businessId!');
                  alert('Service updated successfully! Please refresh the page.');
                } else {
                  console.error('❌ Failed to update service');
                }
              })
              .catch(err => console.error('Error updating service:', err));
          }
        }
      } else {
        console.log('✅ Services for your business found. They should display correctly.');
      }
    })
    .catch(err => console.error('Error fetching services:', err))
    .finally(() => console.groupEnd());
})(); 