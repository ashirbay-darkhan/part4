'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
import { useRouter } from 'next/navigation';
import { 
  login as loginService, 
  register as registerService,
  getCurrentUser,
  logout as logoutService,
  updateCurrentUserInStorage
} from './authService';
import { BusinessUser } from '@/types';

interface AuthContextType {
  user: BusinessUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<BusinessUser>;
  register: (userData: { name: string, email: string, password: string, businessName: string }) => Promise<BusinessUser>;
  logout: () => void;
  isAuthenticated: boolean;
  updateCurrentUser: (updatedUser: BusinessUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for saved user on initial load
  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userData = await loginService(email, password);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: { name: string, email: string, password: string, businessName: string }) => {
    setIsLoading(true);
    try {
      const newUser = await registerService(userData);
      setUser(newUser);
      return newUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    logoutService();
    setUser(null);
    router.push('/login');
  };

  // Update current user
  const updateCurrentUser = (updatedUser: BusinessUser) => {
    // Only update if this is the current logged-in user
    if (user && user.id === updatedUser.id) {
      setUser(updatedUser);
      updateCurrentUserInStorage(updatedUser);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    updateCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}