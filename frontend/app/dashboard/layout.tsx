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
    // CORREÇÃO: Mudança da chave de busca do token para 'token' (consistente com LoginPage)
    const token = localStorage.getItem('token'); 
    if (!token) {
      router.push('/login'); // Redireciona se não há token
      return; // Interrompe a execução para evitar erros
    }
    
    // Se o token existe, consideramos verificado por enquanto
    setIsVerified(true);
      
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        let message = `Bem-vindo(a), ${user.name}`;

        // Lógica condicional para exibir apartamento ou permissão
        if (user.role === 'ADMIN') {
          message += ` (${user.role})`; // Ex: Bem-vindo(a), Vinicius (ADMIN)
        } else if (user.role === 'MORADOR' && user.apartment) {
          message += ` (Apto ${user.apartment})`; // Ex: Bem-vindo(a), Vinicius (Apto 101)
        } else {
            // Caso user.role não seja reconhecido ou user.apartment esteja faltando para MORADOR
            message += '!'; // Apenas Bem-vindo(a), Vinicius!
        }
        
        setWelcomeMessage(message);

        // REMOVIDO: localStorage.removeItem('user');
        // Não remova os dados do usuário do localStorage aqui! Eles são necessários para persistir a sessão.
        
        const timer = setTimeout(() => {
          setWelcomeMessage(''); // Esconde a mensagem de boas-vindas após um tempo
        }, 3000);
        return () => clearTimeout(timer); // Limpa o timer se o componente desmontar
      } catch (e) {
        console.error("Erro ao parsear dados do usuário do localStorage:", e);
        // Se houver um erro ao parsear, talvez os dados estejam corrompidos, redirecione.
        router.push('/login'); 
      }
    } else {
        // Se não houver dados de usuário no localStorage, mas há token, pode ser inconsistência.
        // O ideal é buscar /api/auth/me aqui para validar e obter os dados.
        // Por simplicidade, vamos apenas redirecionar para login por enquanto.
        console.warn("Token encontrado, mas dados do usuário ausentes no localStorage. Redirecionando.");
        router.push('/login');
    }
  }, [router]); // Adicionado router como dependência do useEffect

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
        src="[https://embed.tawk.to/685981392f458f191216deb9/1iueq1i2o](https://embed.tawk.to/685981392f458f191216deb9/1iueq1i2o)"
      />
    </div>
    
  );
  
}
