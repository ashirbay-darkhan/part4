import { redirect } from 'next/navigation';

// Редирект с корневого пути на логин
export default function HomePage() {
  redirect('/login');
}