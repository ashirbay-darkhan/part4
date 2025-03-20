// lib/auth/authService.ts

import { BusinessUser } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Handles API errors and provides consistent error messaging
 */
class AuthError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Login with email/password
 */
export const login = async (email: string, password: string): Promise<BusinessUser> => {
  try {
    // Try to fetch from JSON server
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new AuthError('Invalid credentials', response.status);
    }
    
    const data = await response.json();
    const userData = data.user;
    
    // Ensure user has admin role
    if (!userData.role || userData.role !== 'admin') {
      userData.role = 'admin';
      
      // Update the user's role in the database
      try {
        await fetch(`${API_URL}/users/${userData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: 'admin' })
        });
      } catch (updateError) {
        console.warn('Could not update user role in database:', updateError);
      }
    }
    
    // Store user in localStorage for session persistence
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('auth_token', data.token || userData.id);
    
    // Set a cookie for middleware authentication
    document.cookie = `auth_token=${data.token || userData.id}; path=/; max-age=2592000`; // 30 days
    
    return userData;
  } catch (error) {
    console.error('Login error:', error);
    
    // If we get a network error, check if we can use JSON server directly
    try {
      const userResponse = await fetch(`${API_URL}/users?email=${email}`);
      const users = await userResponse.json();
      
      if (users.length === 0) {
        throw new AuthError('User not found', 404);
      }
      
      const user = users[0];
      
      // Simple password check (in a real app, never do this - use hashed passwords and proper auth)
      if (user.password !== password) {
        throw new AuthError('Invalid credentials', 401);
      }
      
      // Ensure user has admin role
      if (!user.role || user.role !== 'admin') {
        user.role = 'admin';
        
        // Update the user's role in the database
        try {
          await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: 'admin' })
          });
        } catch (updateError) {
          console.warn('Could not update user role in database:', updateError);
        }
      }
      
      // Remove password before returning user
      const { password: _, ...userWithoutPassword } = user;
      
      // Store user in localStorage for session persistence
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      localStorage.setItem('auth_token', userWithoutPassword.id);
      
      // Set a cookie for middleware authentication
      document.cookie = `auth_token=${userWithoutPassword.id}; path=/; max-age=2592000`; // 30 days
      
      return userWithoutPassword;
    } catch (secondaryError) {
      console.error('Secondary login attempt failed:', secondaryError);
      throw error instanceof AuthError ? error : new AuthError('Login failed', 500);
    }
  }
};

/**
 * Register new user
 */
export const register = async (userData: {
  name: string;
  email: string;
  password: string;
  businessName: string;
}): Promise<BusinessUser> => {
  try {
    // Generate avatar based on name
    const backgroundColors = ['B91C1C', 'A16207', '047857', '1D4ED8', '7E22CE', 'BE185D'];
    const randomColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=${randomColor}&color=fff`;
    
    // Try to register via POST endpoint first
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...userData,
          avatar: avatarUrl
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Store user in localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('auth_token', data.token || data.user.id);
        
        // Set a cookie for middleware authentication
        document.cookie = `auth_token=${data.token || data.user.id}; path=/; max-age=2592000`; // 30 days
        
        return data.user;
      }
    } catch (registerEndpointError) {
      // Fallback to direct API approach
    }
    
    // Fallback to direct API manipulation
    // Check if email already exists
    const checkResponse = await fetch(`${API_URL}/users?email=${userData.email}`);
    const existingUsers = await checkResponse.json();
    
    if (existingUsers.length > 0) {
      throw new AuthError('Email already in use', 409);
    }
    
    // Create a new business ID
    const businessId = Date.now().toString();
    
    // Create new business
    const businessResponse = await fetch(`${API_URL}/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: businessId,
        name: userData.businessName,
        email: userData.email,
        ownerId: null // We'll update this after creating the user
      })
    });
    
    if (!businessResponse.ok) {
      throw new AuthError('Failed to create business', businessResponse.status);
    }
    
    // Create new user
    const userId = Date.now().toString();
    const newUser = {
      id: userId,
      name: userData.name,
      email: userData.email,
      password: userData.password, // In a real app, hash this!
      businessId,
      businessName: userData.businessName,
      role: 'admin',
      isVerified: true,
      avatar: avatarUrl,
      serviceIds: [] // Initialize with empty array
    };
    
    const userResponse = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newUser)
    });
    
    if (!userResponse.ok) {
      // If user creation failed, try to clean up the business
      try {
        await fetch(`${API_URL}/businesses/${businessId}`, {
          method: 'DELETE'
        });
      } catch (cleanupError) {
        console.error('Failed to clean up business after user creation error:', cleanupError);
      }
      
      throw new AuthError('Failed to create user', userResponse.status);
    }
    
    const createdUser = await userResponse.json();
    
    // Update business with owner ID
    await fetch(`${API_URL}/businesses/${businessId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ownerId: createdUser.id
      })
    });
    
    // Remove password before returning
    const { password: _, ...userWithoutPassword } = createdUser;
    
    // Store user in localStorage
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    localStorage.setItem('auth_token', userWithoutPassword.id);
    
    // Set a cookie for middleware authentication
    document.cookie = `auth_token=${userWithoutPassword.id}; path=/; max-age=2592000`; // 30 days
    
    return userWithoutPassword;
  } catch (error) {
    console.error('Registration error:', error);
    throw error instanceof AuthError ? error : new AuthError('Registration failed', 500);
  }
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = (): BusinessUser | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return null;
    
    const user = JSON.parse(userJson);
    
    // Ensure business_id is also set in localStorage for easier access
    if (user && user.businessId && !localStorage.getItem('business_id')) {
      localStorage.setItem('business_id', user.businessId.toString());
    }
    
    return user;
  } catch (error) {
    console.error('Error getting current user from localStorage:', error);
    return null;
  }
};

/**
 * Update current user in localStorage
 */
export const updateCurrentUserInStorage = (updatedUser: BusinessUser): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const currentUser = getCurrentUser();
    
    // Only update if this is the current logged-in user
    if (currentUser && currentUser.id === updatedUser.id) {
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // Verify the update happened correctly
      const verifyUser = getCurrentUser();
    }
  } catch (error) {
    console.error('Error updating current user in localStorage:', error);
  }
};

/**
 * Logout user
 */
export const logout = () => {
  if (typeof window === 'undefined') return;
  
  // Clear all auth-related localStorage items
  localStorage.removeItem('currentUser');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('business_id');
  
  // Clear auth cookie
  document.cookie = 'auth_token=; path=/; max-age=0';
};