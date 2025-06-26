'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Importação de ícones para as ações da lista
import { FiEdit, FiPower, FiUserCheck, FiPlusCircle } from 'react-icons/fi'; 

// Definição da interface Unidade (mantida)
interface Unidade {
  id: number;
  tipo_unidade: string;
  bloco: string | null;
  numero: string;
  andar: number | null;
}

// Interface para o Morador
interface Morador {
  id: number;
  nome_completo: string;
  email: string;
  cpf: string | null;
  rg: string | null;
  profissao: string | null;
  whatsapp: string | null;
  tipo_morador: 'proprietario' | 'inquilino' | 'outro';
  unidade_id: number;
  unidade_numero?: string; // Para exibição na lista
  unidade_bloco?: string | null; // Para exibição na lista
  ativo: boolean; // Para o status de ativação/inativação
}

export default function GerenciarMoradoresPage() { 
  const router = useRouter();
  const [moradores, setMoradores] = useState<Morador[]>([]); 
  const [unidades, setUnidades] = useState<Unidade[]>([]); // Estado para as unidades (para mapear na lista)
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const [loading, setLoading] = useState(true); // Estado de loading para buscar dados iniciais
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Função para buscar UNIDADES e MORADORES
  const fetchData = async () => {
    setError(null);
    setLoading(true); 
    const token = localStorage.getItem('token'); 

    if (!token) {
      setError('Autenticação não encontrada. Faça login novamente.');
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      // Busca Unidades (necessário para exibir unidade_numero e bloco)
      const resUnidades = await fetch('http://127.0.0.1:5000/api/unidades', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!resUnidades.ok) {
        throw new Error(`Falha ao buscar unidades: ${await resUnidades.text()}`);
      }
      const unidadesData: Unidade[] = await resUnidades.json();
      setUnidades(unidadesData);

      // Busca Moradores
      const resMoradores = await fetch('http://127.0.0.1:5000/api/moradores', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!resMoradores.ok) {
        throw new Error(`Falha ao buscar moradores: ${await resMoradores.text()}`);
      }
      let moradoresData: Morador[] = await resMoradores.json();
      
      // Adiciona informações da unidade aos moradores para exibição
      moradoresData = moradoresData.map(morador => {
          const unidade = unidadesData.find(u => u.id === morador.unidade_id);
          return {
              ...morador,
              unidade_numero: unidade ? unidade.numero : 'N/A',
              unidade_bloco: unidade ? unidade.bloco : null
          };
      });
      setMoradores(moradoresData);

    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message || 'Falha ao carregar dados do gerenciamento de moradores.');
    } finally {
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchData(); 
  }, [router, success]); // Recarrega se o sucesso de uma operação ocorrer em outras páginas

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredMoradores = moradores.filter(morador => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      morador.nome_completo.toLowerCase().includes(lowerCaseSearchTerm) ||
      morador.email.toLowerCase().includes(lowerCaseSearchTerm) ||
      (morador.unidade_numero && morador.unidade_numero.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (morador.unidade_bloco && morador.unidade_bloco.toLowerCase().includes(lowerCaseSearchTerm)) ||
      (morador.cpf && morador.cpf.toLowerCase().includes(lowerCaseSearchTerm))
    );
  });

  // Redireciona para a página de cadastro
  const handleRedirectToCreate = () => {
    router.push('/dashboard/moradores/novo');
  };

  // Redireciona para a página de edição com o ID do morador
  const handleRedirectToEdit = (moradorId: number) => {
    router.push(`/dashboard/moradores/editar/${moradorId}`);
  };

  // Lógica para ativar/inativar morador (mantida aqui, pois é uma ação direta na lista)
  const handleToggleActive = async (moradorId: number, currentStatus: boolean) => {
    setLoading(true); 
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem('token'); 
    if (!token) {
      setError("Token de autenticação não encontrado. Faça login novamente.");
      setLoading(false);
      return;
    }

    try {
      const newStatus = !currentStatus;
      const response = await fetch(`http://127.0.0.1:5000/api/moradores/${moradorId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ativo: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Falha ao ${newStatus ? 'ativar' : 'inativar'} morador.`);
      }

      setSuccess(`Morador ${newStatus ? 'ativado' : 'inativado'} com sucesso!`);
      fetchData(); // Recarrega a lista para mostrar o status atualizado
      setTimeout(() => setSuccess(null), 3000); 
    } catch (err: any) {
      setError(err.message || 'Falha ao alterar status do morador.');
    } finally {
      // setLoading(false); já será definido como false pelo fetchData no finally
    }
  };


  if (loading) return <p className="text-center text-gray-600 p-8">Carregando dados...</p>;
  if (error) return <p className="text-center text-red-600 p-8">Erro: {error}</p>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        
        {/* Mensagens de Sucesso e Erro (no topo para serem sempre visíveis) */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
            <span>{success}</span>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Cabeçalho da Lista e Botão Novo Morador */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-green-800">Gerenciar Moradores</h1>
            <button 
                onClick={handleRedirectToCreate} // Redireciona para a nova página de cadastro
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <FiPlusCircle className="mr-2" /> Novo Morador
            </button>
        </div>
        
        {/* Campo de Busca */}
        <div className="mb-6">
            <input
                type="text"
                placeholder="Buscar por nome, e-mail, CPF ou apartamento..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500"
            />
        </div>

        {/* Seção de Listagem de Moradores */}
        {filteredMoradores.length === 0 && !loading ? (
            <p className="text-gray-600 text-center">Nenhum morador encontrado.</p>
        ) : (
            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMoradores.map((morador) => (
                            <tr key={morador.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{morador.nome_completo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{morador.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {morador.unidade_numero ? 
                                        `${morador.unidade_bloco ? morador.unidade_bloco + '-' : ''}${morador.unidade_numero}` 
                                        : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${morador.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {morador.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                    <button 
                                        onClick={() => handleRedirectToEdit(morador.id)} // Redireciona para a página de edição
                                        className="text-indigo-600 hover:text-indigo-900 mx-1"
                                        title={`Editar morador ${morador.nome_completo}`}
                                    >
                                        <FiEdit className="inline-block w-5 h-5" /> {/* Ícone de Edição */}
                                    </button>
                                    <button 
                                        onClick={() => handleToggleActive(morador.id, morador.ativo)}
                                        className={`${morador.ativo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} mx-1`}
                                        title={`${morador.ativo ? 'Inativar' : 'Ativar'} morador ${morador.nome_completo}`}
                                    >
                                        {morador.ativo ? <FiPower className="inline-block w-5 h-5" /> : <FiUserCheck className="inline-block w-5 h-5" />} {/* Ícone de Ativar/Inativar (FiPower para inativar) */}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}
