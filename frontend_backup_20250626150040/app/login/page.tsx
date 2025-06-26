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

      if (!response.ok) {
        // Se a resposta do servidor indicar um erro, use a mensagem de erro fornecida ou uma genérica.
        throw new Error(data.error || 'Falha no login. Verifique suas credenciais.');
      }

      // --- TRATAMENTO DA RESPOSTA DO BACKEND COM JWT MANUAL ---
      // O backend agora retorna o token na chave 'access_token' e os dados do usuário em 'user'.
      if (data.access_token && data.user) {
        // ***** ATENÇÃO AQUI: *****
        // Esta linha salva o token no localStorage com a chave 'token'.
        // Suas outras páginas (como AdicionarMoradorPage) esperam a chave 'access_token'.
        // Isso causa o problema de "entrar e sair rapidamente", pois as outras páginas não encontram o token.
        // Para resolver, ou você muda esta linha para:
        // localStorage.setItem('access_token', data.access_token);
        // OU você muda TODAS as outras páginas para buscar 'token' em vez de 'access_token'.
        localStorage.setItem('token', data.access_token); 

        // Prepara os dados do usuário para armazenar (garantindo que 'apartment' seja tratado corretamente)
        const userData = {
          ...data.user,
          // Garante que 'apartment' seja 'ADMIN' ou o número do apartamento, conforme o token
          apartment: data.user.apartment || (data.user.role === 'ADMIN' ? 'ADMIN' : null)
        };
        // Armazena os dados do usuário (em formato JSON) no localStorage
        localStorage.setItem('user', JSON.stringify(userData));

        // Redireciona o usuário para o dashboard após o login bem-sucedido
        router.push('/dashboard');
      } else {
        // Se a resposta não contiver o token ou os dados do usuário esperados, lance um erro.
        throw new Error('Resposta de login inválida do servidor. Token ou dados de usuário ausentes.');
      }

    } catch (err: any) {
      // Captura e exibe qualquer erro que ocorra durante o processo de login.
      setError(err.message || 'Erro desconhecido ao tentar fazer login.');
    } finally {
      // Finaliza o estado de carregamento, independentemente do sucesso ou falha.
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">Acessar Total Ville 1</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              E-mail ou CPF
            </label>
            <input
              type="text"
              id="email"
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="seuemail@exemplo.com ou seu CPF"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Senha
            </label>
            <input
              type="password"
              id="password"
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
