import { User, Service, Appointment, Client, AppointmentStatus } from '@/types';

export const users: User[] = [
  {
    id: '1',
    name: 'Bobby Pin',
    avatar: '/avatars/bobby.png',
  },
  {
    id: '2',
    name: 'Lorem Ipsum',
    avatar: '/avatars/lorem.png',
  },
];

export const services: Service[] = [
  {
    id: '1',
    name: 'Haircut',
    duration: 60,
    price: 2000,
    description: 'Classic haircut',
    businessId: '1',
  },
  {
    id: '2',
    name: 'Hair coloring',
    duration: 120,
    price: 5000,
    description: 'Full hair coloring',
    businessId: '1',
  },
  {
    id: '3',
    name: 'Styling',
    duration: 30,
    price: 1500,
    description: 'Hair styling',
    businessId: '1',
  },
];

// Создаем даты для демонстрации
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

export const appointments: Appointment[] = [
  {
    id: '1',
    clientId: '1',
    employeeId: '2', // Lorem Ipsum
    serviceId: '1', // Haircut
    date: new Date(2025, 1, 25).toISOString().split('T')[0], // 25 Feb 2025
    startTime: '12:00',
    endTime: '13:00',
    duration: 60,
    status: 'Pending',
    price: 2000,
    comment: 'asdas',
    businessId: '1',
  },
  {
    id: '2',
    clientId: '2',
    employeeId: '1', // Bobby Pin
    serviceId: '2', // Hair coloring
    date: today.toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '17:00',
    duration: 120,
    status: 'Confirmed',
    price: 5000,
    businessId: '1',
  },
];

export const clients: Client[] = [
  {
    id: '1',
    name: 'asdasd',
    phone: '+7 123 123-13-23',
    email: 'asdas@gmail.com',
    totalVisits: 1,
    lastVisit: '2025-02-25T12:00:00',
    notes: '-',
    businessId: '1',
  },
  {
    id: '2',
    name: 'Jane Smith',
    phone: '+7 987 654-32-10',
    email: 'jane@example.com',
    totalVisits: 5,
    lastVisit: '2025-02-20T14:30:00',
    notes: 'Prefers natural dyes',
    businessId: '1',
  },
];

// Функция для получения статуса в виде списка с цветом
export function getStatusDetails(status: AppointmentStatus) {
  switch (status) {
    case 'Pending':
      return { color: 'bg-yellow-500', text: 'Pending' };
    case 'Arrived':
      return { color: 'bg-green-500', text: 'Arrived' };
    case 'No-Show':
      return { color: 'bg-red-500', text: 'No-Show' };
    case 'Confirmed':
      return { color: 'bg-blue-500', text: 'Confirmed' };
    default:
      return { color: 'bg-gray-500', text: 'Unknown' };
  }
}