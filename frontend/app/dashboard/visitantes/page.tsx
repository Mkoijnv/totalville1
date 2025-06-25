// VisitantesPage.js (Frontend)

'use client';

import { useState, useEffect } from 'react';

export default function VisitantesPage() {
  // Estado inicial do formulário
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    release_date: '',
    resident_apartment: '', // Será preenchido automaticamente
    has_car: false,
    car_plate: '',
    car_model: '',
    car_color: '',
    observations: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Efeito para buscar os dados do usuário logado ao carregar o componente
  useEffect(() => {
    const fetchUserApartment = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Autenticação não encontrada. Por favor, faça o login novamente.");
        return;
      }

      try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Tenta ler o erro do backend, se disponível
          const errorData = await response.json();
          throw new Error(errorData.error || 'Não foi possível carregar os dados do morador.');
        }

        const userData = await response.json();
        
        if (userData && userData.apartment) {
          setFormData(prev => ({ ...prev, resident_apartment: userData.apartment }));
        } else {
            setError('Não foi possível encontrar o apartamento vinculado a este usuário.');
        }
      } catch (err: any) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setError('Falha ao conectar com o servidor. Verifique se o backend está em execução e se a política de CORS está configurada corretamente.');
        } else {
          setError(err.message);
        }
      }
    };

    fetchUserApartment();
  }, []);

  // Manipulador para mudanças nos campos do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };

  // Manipulador para submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Você não está autenticado. Faça login novamente.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/visitantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        // Agora, se o backend retornar um erro (como o 409 Conflict),
        // a mensagem de 'data.error' será exibida corretamente.
        throw new Error(data.error || 'Ocorreu um erro desconhecido ao registrar o visitante.');
      }

      setSuccess('Visitante registrado com sucesso!');
      // Limpa o formulário, mas mantém o apartamento do morador
      setFormData(prev => ({
          name: '', cpf: '', release_date: '', resident_apartment: prev.resident_apartment,
          has_car: false, car_plate: '', car_model: '', car_color: '', observations: ''
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
      <h1 className="text-2xl font-bold text-green-800 mb-6">Registro de Novos Visitantes</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500"/>
          </div>
          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700">CPF</label>
            <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required placeholder="000.000.000-00"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500"/>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="resident_apartment" className="block text-sm font-medium text-gray-700">Apartamento do Morador</label>
            <input
              type="text"
              name="resident_apartment"
              value={formData.resident_apartment}
              readOnly
              required
              placeholder="Carregando..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-gray-100 focus:outline-none cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="release_date" className="block text-sm font-medium text-gray-700">Data da Liberação</label>
            <input type="date" name="release_date" value={formData.release_date} onChange={handleChange} required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500"/>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center">
            <input type="checkbox" name="has_car" checked={formData.has_car} onChange={handleChange} className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"/>
            <label htmlFor="has_car" className="ml-3 block text-sm font-medium text-gray-700">Possui veículo?</label>
          </div>
          {formData.has_car && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <div><label className="block text-sm font-medium text-gray-700">Placa</label><input type="text" name="car_plate" value={formData.car_plate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-md shadow-sm"/></div>
              <div><label className="block text-sm font-medium text-gray-700">Modelo</label><input type="text" name="car_model" value={formData.car_model} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-md shadow-sm"/></div>
              <div><label className="block text-sm font-medium text-gray-700">Cor</label><input type="text" name="car_color" value={formData.car_color} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border text-gray-900 border-gray-300 rounded-md shadow-sm"/></div>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="observations" className="block text-sm font-medium text-gray-700">Observações</label>
          <textarea name="observations" value={formData.observations} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500"></textarea>
        </div>
        <div className="text-right">
          <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
            {loading ? 'Registrando...' : 'Registrar Visitante'}
          </button>
        </div>
      </form>
    </div>
  );
}