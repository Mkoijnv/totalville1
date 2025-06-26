// portaria/frontend/app/dashboard/avisos/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiSave, FiXCircle, FiEdit, FiAlertCircle, FiPlusCircle, FiEye, FiEyeOff } from 'react-icons/fi'; // Ícones ajustados

// --- Interfaces (mantidas) ---
interface Aviso {
    id: number;
    titulo: string;
    conteudo: string;
    imagem_url: string | null;
    prioridade: number;
    data_publicacao: string;
    data_expiracao: string | null;
    registrado_por_user_id: number | null;
    registrado_por_user_role: string | null;
    ativo: boolean; // Importante para inativação
}

// Componentes auxiliares Input e Textarea (mantidos)
function Input({ label, name, value, onChange, type = 'text', placeholder = '', required = false, readOnly = false }: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900 mb-1">
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

function Textarea({ label, name, value, onChange, placeholder = '', required = false, rows = 3 }: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900 mb-1">
        {label}{required && ' *'}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      ></textarea>
    </div>
  );
}

// Componente PrioritySlider (mantido)
interface PrioritySliderProps {
    value: number;
    onChange: (name: string, value: string) => void;
    name: string;
}

function PrioritySlider({ value, onChange, name }: PrioritySliderProps) {
    const priorityLevels = [
        { label: 'Leve', value: 0, color: 'bg-green-500' },
        { label: 'Médio', value: 1, color: 'bg-yellow-500' },
        { label: 'Crítico', value: 2, color: 'bg-red-500' },
    ];

    const currentLevel = priorityLevels.find(level => level.value === value) || priorityLevels[0];

    return (
        <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Prioridade do Aviso *</label>
            <div className="flex items-center space-x-2">
                {priorityLevels.map(level => (
                    <button
                        key={level.value}
                        type="button"
                        onClick={() => onChange(name, String(level.value))}
                        className={`flex-1 py-2 px-4 rounded-md text-white font-semibold transition-colors duration-200
                                    ${level.color} ${value === level.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : 'opacity-70 hover:opacity-100'}`}
                    >
                        {level.label}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-sm text-gray-600 text-center">
                Prioridade selecionada: <span className={`font-semibold ${currentLevel.color.replace('bg-', 'text-')}`}>{currentLevel.label}</span>
            </p>
        </div>
    );
}

export default function GerenciarAvisosPage() {
  const router = useRouter();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [formData, setFormData] = useState<{
    id: number | null;
    titulo: string;
    conteudo: string;
    imagem_url: string;
    prioridade: string;
    data_expiracao: string;
  }>({
    id: null,
    titulo: '',
    conteudo: '',
    imagem_url: '',
    prioridade: '0',
    data_expiracao: '',
  });

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Função para buscar os avisos
  const fetchAvisos = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!token) {
      setError("Autenticação não encontrada. Faça login novamente.");
      setLoading(false);
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('http://34.95.214.56:5000/api/avisos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar avisos.');
      }
      setAvisos(data);
    } catch (err: any) {
      console.error("Erro ao buscar avisos:", err);
      setError(err.message || 'Erro desconhecido ao buscar avisos.');
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  // Efeito para carregar avisos e verificar permissões
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      const user = JSON.parse(userString);
      if (user.role !== 'ADMIN' && user.role !== 'PORTARIA') {
        setError("Acesso negado. Apenas administradores e portarias podem gerenciar avisos.");
        router.push('/dashboard');
        return;
      }
    } else {
      setError("Informações do usuário não encontradas. Faça login novamente.");
      router.push('/login');
      return;
    }

    fetchAvisos();
  }, [router, fetchAvisos]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePriorityChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      id: null,
      titulo: '',
      conteudo: '',
      imagem_url: '',
      prioridade: '0',
      data_expiracao: '',
    });
    setIsEditing(false);
  };

  const handleEditClick = (aviso: Aviso) => {
    setFormData({
      id: aviso.id,
      titulo: aviso.titulo,
      conteudo: aviso.conteudo,
      imagem_url: aviso.imagem_url || '',
      prioridade: String(aviso.prioridade),
      // Ajustar formato da data para 'YYYY-MM-DD' para o input type="date"
      data_expiracao: aviso.data_expiracao ? new Date(aviso.data_expiracao).toISOString().split('T')[0] : '',
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Alterada de handleDelete para handleInactivate
  const handleInactivate = async (id: number) => {
    if (!confirm('Tem certeza que deseja inativar este aviso? Ele não será mais exibido publicamente.')) return;

    setFormLoading(true);
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Autenticação não encontrada. Faça login novamente.');
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://34.95.214.56:5000/api/avisos/inativar/${id}`, {
        method: 'PUT', // Método PUT para inativar
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao inativar aviso.');
      }

      setSuccess('Aviso inativado com sucesso!');
      fetchAvisos(); // Recarregar a lista de avisos
      resetForm(); // Limpar formulário
    } catch (err: any) {
      console.error("Erro ao inativar aviso:", err);
      setError(err.message || 'Erro desconhecido ao inativar aviso.');
    } finally {
      setFormLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Autenticação não encontrada. Faça login novamente.');
      setFormLoading(false);
      return;
    }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `http://34.95.214.56:5000/api/avisos/${formData.id}` : 'http://34.95.214.56:5000/api/avisos';

    try {
      const payload: {
        titulo: string;
        conteudo: string;
        imagem_url: string;
        prioridade: number;
        data_expiracao: string | null;
      } = {
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        imagem_url: formData.imagem_url,
        prioridade: parseInt(formData.prioridade),
        data_expiracao: formData.data_expiracao || null,
      };

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Falha ao ${isEditing ? 'atualizar' : 'postar'} aviso.`);
      }

      setSuccess(`Aviso ${isEditing ? 'atualizado' : 'postado'} com sucesso!`);
      resetForm();
      fetchAvisos();
    } catch (err: any) {
      console.error(`Erro ao ${isEditing ? 'atualizar' : 'postar'} aviso:`, err);
      setError(err.message || `Erro desconhecido ao ${isEditing ? 'atualizar' : 'postar'} aviso.`);
    } finally {
      setFormLoading(false);
    }
  };

  // Renderização condicional para acesso negado
  if (error === "Acesso negado. Apenas administradores e portarias podem gerenciar avisos.") {
      return (
          <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-md border border-red-200 text-center">
                  <h1 className="text-2xl font-bold text-red-700 mb-4">Acesso Negado</h1>
                  <p className="text-gray-700 mb-4">{error}</p>
                  <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                      ← Voltar para o Dashboard
                  </Link>
              </div>
          </div>
      );
  }
  
  if (loading) return <p className="text-center text-gray-600 p-8">Carregando avisos...</p>;
  if (error && error !== "Autenticação não encontrada. Faça login novamente." && error !== "Acesso negado. Apenas administradores e portarias podem gerenciar avisos.") {
      return <p className="text-center text-red-600 p-8">Erro: {error}</p>;
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-green-800">Gerenciar Avisos</h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Voltar para o Dashboard
          </Link>
        </div>

        {/* Mensagens de Sucesso/Erro para o formulário */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
            <span>{success}</span>
          </div>
        )}
        {error && (error === "Autenticação não encontrada. Faça login novamente.") ? null :
            error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
                <span>Erro: {error}</span>
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6 mb-10 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{isEditing ? 'Editar Aviso Existente' : 'Criar Novo Aviso'}</h2>
          
          <Input
            label="Título do Aviso"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            required
            placeholder="Ex: Manutenção da piscina, Reunião de Condomínio"
          />
          <Textarea
            label="Conteúdo do Aviso"
            name="conteudo"
            value={formData.conteudo}
            onChange={handleChange}
            required
            placeholder="Detalhes importantes sobre o aviso."
            rows={5}
          />
          {/* Campo de URL da Imagem */}
          <Input
            label="URL da Imagem (Opcional)"
            name="imagem_url"
            value={formData.imagem_url}
            onChange={handleChange}
            type="text"
            placeholder="Ex: https://exemplo.com/imagem.jpg"
          />
          
          <PrioritySlider
            name="prioridade"
            value={parseInt(formData.prioridade)}
            onChange={handlePriorityChange}
          />

          <Input
            label="Data de Expiração (Opcional)"
            name="data_expiracao"
            value={formData.data_expiracao}
            onChange={handleChange}
            type="date"
          />

          <div className="flex justify-end space-x-4">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md 
                           text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiXCircle className="mr-2" /> Cancelar Edição
              </button>
            )}
            <button
              type="submit"
              disabled={formLoading}
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md 
                           text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                           disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? (isEditing ? 'Atualizando...' : 'Postando...') : (isEditing ? 'Salvar Alterações' : 'Postar Novo Aviso')} <FiSave className="ml-2" />
            </button>
          </div>
        </form>

        {/* Seção de Listagem de Avisos */}
        <h2 className="text-xl font-bold text-green-800 mb-4 flex items-center"><FiAlertCircle className="mr-2 text-yellow-500" />Lista de Avisos</h2>
        {avisos.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Nenhum aviso encontrado. Crie um novo aviso acima!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publicação
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiração
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {avisos.map((aviso) => (
                  <tr key={aviso.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {aviso.titulo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {aviso.prioridade === 0 ? 'Leve' : aviso.prioridade === 1 ? 'Médio' : 'Crítico'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(aviso.data_publicacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {aviso.data_expiracao ? new Date(aviso.data_expiracao).toLocaleDateString('pt-BR') : 'Sem expiração'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${aviso.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {aviso.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(aviso)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar Aviso"
                      >
                        <FiEdit className="inline-block w-5 h-5" />
                      </button>
                      {aviso.ativo ? (
                        <button
                          onClick={() => handleInactivate(aviso.id)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Inativar Aviso"
                        >
                          <FiEyeOff className="inline-block w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          // Implementar reativação se desejar. Por enquanto, só inativa.
                          className="text-gray-400 cursor-not-allowed"
                          title="Aviso já inativo"
                          disabled
                        >
                          <FiEye className="inline-block w-5 h-5" />
                        </button>
                      )}
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