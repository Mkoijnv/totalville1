// frontend/app/dashboard/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsVerified(true);
      
      const userName = localStorage.getItem('userName');
      if (userName) {
        setWelcomeMessage(`Bem-vindo(a), ${userName}!`);
        localStorage.removeItem('userName');
        const timer = setTimeout(() => {
          setWelcomeMessage('');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [router]);

  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-lg text-gray-600">Verificando autenticação...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
      
      {welcomeMessage && (
        <div className="fixed top-5 right-5 bg-green-600 text-white py-3 px-6 rounded-lg shadow-lg animate-fade-in-out">
          {welcomeMessage}
        </div>
      )}
    </div>
  );
}