export type User = {
  id: string;
  name: string;
  serviceIds?: string[]; // IDs of services this staff can provide
  avatar?: string;
};

export type Service = {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  description?: string;
  category?: string; // Added category field
  imageUrl?: string; // Image URL for the service
  businessId: string; // Required field, ensuring it's always present and a string
};

export type AppointmentStatus = 'Pending' | 'Arrived' | 'No-Show' | 'Confirmed';

export type Appointment = {
  id: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  date: string; // ISO формат
  startTime: string; // '10:00'
  endTime: string; // '11:00'
  duration: number; // в минутах
  status: AppointmentStatus;
  comment?: string;
  price: number;
  businessId: string; // ID of the business this appointment belongs to
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalVisits: number;
  lastVisit?: string; // ISO формат
  notes?: string;
  businessId: string; // ID of the business this client belongs to
};

// Business type
export type Business = {
  id: string;
  name: string;
  ownerId: string; // Reference to the user who owns the business
  email: string;
  phone?: string;
  address?: string;
  logo?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
};

// Extended user type
export type BusinessUser = User & {
  businessId: string;
  businessName: string;
  email: string;
  isVerified: boolean;
  serviceIds: string[]; // IDs of services this staff can provide
  role?: 'admin' | 'staff';  // Role for the user, admin indicates owner/administrator
  phone?: string; // Optional phone number for the staff member
};

// Extend existing types with business ownership
export type BusinessService = Service & {
  businessId: string;
};

export type BusinessAppointment = Appointment & {
  businessId: string;
};

export type BusinessClient = Client & {
  businessId: string;
};

export type ServiceCategory = {
  id: string;
  name: string;
  description?: string;
  color?: string; // For visual identification
  businessId?: string;
};

