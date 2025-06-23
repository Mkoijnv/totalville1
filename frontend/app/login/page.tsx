// frontend/app/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha no login.');
      
      // --- ALTERAÇÃO PRINCIPAL AQUI ---
      if (data.access_token && data.user) {
        localStorage.setItem('token', data.access_token);
        // Salvamos o nome do usuário para usar na próxima página
        localStorage.setItem('userName', data.user.name);
        router.push('/dashboard');
      } else {
        throw new Error('Resposta de login inválida do servidor.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">Acessar Total Ville 1</h1>
        {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"><span>{error}</span></div>)}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">E-mail ou CPF</label>
            <input
              type="text"
              id="email"
              // CORREÇÃO APLICADA AQUI
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="seuemail@exemplo.com ou seu CPF"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
            <input
              type="password"
              id="password"
              // CORREÇÃO APLICADA AQUI
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-900 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-full w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        <p className="text-center text-gray-600 text-sm mt-6">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-green-600 hover:text-green-800 font-semibold">Registre-se aqui</Link>
        </p>
      </div>
    </div>
  );
}