// frontend/app/register/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  // Garantimos que todos os estados necessários estão aqui
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apt, setApt] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setLoading(true);

    try {
      // Garantimos que todos os quatro campos são enviados no corpo da requisição
      const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, apt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha no registro.');
      
      setSuccess('Usuário registrado com sucesso! Redirecionando para o login...');
      setTimeout(() => router.push('/login'), 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">Criar Nova Conta</h1>
        {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert"><span>{error}</span></div>)}
        {success && (<div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert"><span>{success}</span></div>)}
        
        {/* O formulário agora contém todos os campos na ordem correta */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Nome Completo</label>
            <input type="text" id="name" required
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">E-mail</label>
            <input type="email" id="email" required
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="apt" className="block text-gray-700 text-sm font-bold mb-2">Apartamento / Bloco</label>
            <input type="text" id="apt" required
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: Bloco A, 101" value={apt} onChange={(e) => setApt(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
            <input type="password" id="password" required
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-900 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-4">
            <button type="submit" className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-full w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Registrar'}
            </button>
          </div>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-green-600 hover:text-green-800 font-semibold">Faça login aqui</Link>
        </p>
      </div>
    </div>
  );
}