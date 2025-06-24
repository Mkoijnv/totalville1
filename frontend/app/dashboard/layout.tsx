// frontend/app/dashboard/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Script from 'next/script'; // Mantemos o script do Tawk.to

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
      
      // --- MUDANÇA APLICADA AQUI ---
      const userString = localStorage.getItem('user');
      if (userString) {
        // Convertemos a string de volta para um objeto
        const user = JSON.parse(userString);
        // Montamos a nova mensagem de boas-vindas
        setWelcomeMessage(`Bem-vindo(a), ${user.name} (Apto ${user.apt})!`);
        // Removemos para não mostrar a mensagem em cada recarregamento
        localStorage.removeItem('user'); 
        
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
      
      {/* O script do Tawk.to deve ficar no layout raiz (app/layout.tsx) para aparecer em todas as páginas
          mas se quiser que apareça só na área logada, este é o lugar certo. */}
      <Script
        strategy="lazyOnload"
        src="https://embed.tawk.to/685981392f458f191216deb9/1iueq1i2o"
      />
    </div>
  );
}