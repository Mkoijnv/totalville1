// portaria/frontend/app/dashboard/moradores/cadastrar/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiCheckCircle } from 'react-icons/fi'; // Importe ícones se for usar

// Definição da interface Unidade (mantida)
interface Unidade {
  id: number;
  tipo_unidade: string;
  bloco: string | null;
  numero: string;
  andar: number | null;
}

// Componentes auxiliares Input (mantido, mas estilizado via classes CSS)
function Input({ label, name, value, onChange, type = 'text', placeholder = '', required = false, readOnly = false }: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900 mb-1"> {/* Estilo ajustado */}
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

// Componente Select removido, pois será substituído pela busca dinâmica.
// Seus estilos foram migrados para o input de busca.

export default function CadastrarMoradorPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    password: '',
    confirm_password: '',
    cpf: '',
    rg: '',
    profissao: '',
    whatsapp: '',
    tipo_morador: 'proprietario',
    unidade_id: '', // ID da unidade selecionada
  });

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para a busca dinâmica de unidades
  const [unidadeSearch, setUnidadeSearch] = useState(''); // Termo de busca digitado
  const [showUnidadeList, setShowUnidadeList] = useState(false); // Controla a visibilidade da lista de sugestões
  const unidadeSearchRef = useRef<HTMLDivElement>(null); // Referência para o clique fora

  // Hook para fechar a lista de sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (unidadeSearchRef.current && !unidadeSearchRef.current.contains(event.target as Node)) {
        setShowUnidadeList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [unidadeSearchRef]);


  // Efeito para buscar UNIDADES ao carregar a página de cadastro
  useEffect(() => {
    const fetchUnidades = async () => {
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
        const resUnidades = await fetch('http://127.0.0.1:5000/api/unidades', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });
        if (!resUnidades.ok) {
          throw new Error(`Falha ao buscar unidades: ${await resUnidades.text()}`);
        }
        const unidadesData: Unidade[] = await resUnidades.json();
        setUnidades(unidadesData);

      } catch (err: any) {
        console.error('Erro ao buscar unidades:', err);
        setError(err.message || 'Falha ao carregar unidades.');
      } finally {
        setLoading(false);
      }
    };
    fetchUnidades();
  }, [router]);

  // Função genérica para lidar com mudanças nos campos do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Função para lidar com a seleção de uma unidade na lista de sugestões
  const handleUnidadeSelect = (unidade: Unidade) => {
    const displayValue = unidade.tipo_unidade === 'apartamento'
      ? `Apto ${unidade.bloco ? `${unidade.bloco}-` : ''}${unidade.numero}`
      : `Casa ${unidade.numero}`;
    
    setUnidadeSearch(displayValue); // Preenche o campo de busca com o nome amigável
    setFormData(prev => ({ ...prev, unidade_id: String(unidade.id) })); // Guarda o ID no formData
    setShowUnidadeList(false); // Fecha a lista
  };

  // Filtrar unidades baseado no termo de busca
  const filteredUnidades = unidades.filter(uni => {
    const searchLower = unidadeSearch.toLowerCase();
    const unidadeDisplay = uni.tipo_unidade === 'apartamento'
      ? `apto ${uni.bloco || ''}-${uni.numero}`
      : `casa ${uni.numero}`;
    
    return unidadeDisplay.includes(searchLower) ||
           String(uni.numero).includes(searchLower) ||
           (uni.bloco && uni.bloco.toLowerCase().includes(searchLower));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    // Validações
    if (formData.password !== formData.confirm_password) {
      setError("As senhas não coincidem.");
      setFormLoading(false);
      return;
    }

    if (!formData.password) {
        setError("A senha é obrigatória para novos cadastros.");
        setFormLoading(false);
        return;
    }

    if (!formData.unidade_id) {
      setError("Selecione uma unidade.");
      setFormLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Token de autenticação não encontrado. Faça login novamente.");
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        password: formData.password,
        unidade_id: parseInt(formData.unidade_id),
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        profissao: formData.profissao || null,
        whatsapp: formData.whatsapp || null,
        tipo_morador: formData.tipo_morador
      };

      const response = await fetch('http://127.0.0.1:5000/api/moradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Erro HTTP ${response.status}`);
      }

      setSuccess('Morador cadastrado com sucesso!');
      // Limpa o formulário após o sucesso
      setFormData({
        nome_completo: '', email: '', password: '', confirm_password: '',
        cpf: '', rg: '', profissao: '', whatsapp: '',
        tipo_morador: 'proprietario', unidade_id: ''
      });
      setUnidadeSearch(''); // Limpa o campo de busca da unidade
      setTimeout(() => router.push('/dashboard/moradores'), 2000); // Redireciona para a lista
    } catch (err: any) {
      console.error("Erro completo:", err);
      setError(err.message || 'Falha ao cadastrar morador.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <p className="text-center text-gray-600 p-8">Carregando unidades...</p>;
  // O erro de autenticação é tratado pelo redirecionamento, então não precisa exibir aqui
  if (error && error !== "Autenticação não encontrada. Faça login novamente." && !formLoading) {
      return (
          <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-md border border-red-200 text-center">
                  <h1 className="text-2xl font-bold text-red-700 mb-4">Erro de Carregamento</h1>
                  <p className="text-gray-700 mb-4">{error}</p>
                  <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                      ← Voltar para o Dashboard
                  </Link>
              </div>
          </div>
      );
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-green-800">Cadastrar Novo Morador</h1>
            <Link href="/dashboard/moradores" className="text-blue-600 hover:text-blue-800">
                ← Voltar para a Lista
            </Link>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
            <span className="flex items-center"><FiCheckCircle className="mr-2" />{success}</span>
          </div>
        )}

        {error && (error !== "Autenticação não encontrada. Faça login novamente.") && ( // Não exibe erro de autenticação aqui
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            <span className="flex items-center"><FiHome className="mr-2" />{error}</span> {/* Use um ícone apropriado para erro, FiHome é um placeholder */}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8"> {/* Aumento do espaçamento */}
          {/* Seção Dados Pessoais */}
          <div className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50"> {/* Container da seção */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Dados Pessoais</h2> {/* Título mais claro */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nome Completo"
                name="nome_completo"
                value={formData.nome_completo}
                onChange={handleChange}
                required
                placeholder="Nome completo do morador"
              />

              <Input
                label="E-mail"
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                required
                placeholder="email@example.com"
              />

              <Input
                label="CPF"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
              />

              <Input
                label="RG"
                name="rg"
                value={formData.rg}
                onChange={handleChange}
                placeholder="Ex: 123456789"
              />
            </div>
          </div>

          {/* Seção Dados Residenciais */}
          <div className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50"> {/* Container da seção */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Dados Residenciais</h2> {/* Título mais claro */}

            {/* Campo de busca dinâmica para Unidades */}
            <div className="relative" ref={unidadeSearchRef}>
              <label htmlFor="unidade_search" className="block text-sm font-bold text-gray-900 mb-1">
                Unidade *
              </label>
              <input
                type="text"
                id="unidade_search"
                value={unidadeSearch}
                onChange={(e) => {
                    setUnidadeSearch(e.target.value);
                    setFormData(prev => ({ ...prev, unidade_id: '' })); // Limpa o ID da unidade ao digitar
                    setShowUnidadeList(true);
                }}
                onFocus={() => setShowUnidadeList(true)}
                placeholder="Digite para buscar unidade (ex: Apto B-101, Casa 50)"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />

              {showUnidadeList && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {filteredUnidades.length > 0 ? (
                    filteredUnidades.map(unidade => (
                      <div
                        key={unidade.id}
                        className="cursor-pointer p-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        onClick={() => handleUnidadeSelect(unidade)}
                      >
                        <div className="font-medium text-gray-900">
                          {unidade.tipo_unidade === 'apartamento'
                            ? `Apto ${unidade.bloco ? `${unidade.bloco}-` : ''}${unidade.numero}`
                            : `Casa ${unidade.numero}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {unidade.andar && `Andar: ${unidade.andar}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-gray-500">Nenhuma unidade encontrada.</div>
                  )}
                </div>
              )}
               {formData.unidade_id && unidadeSearch && !showUnidadeList && (
                  <p className="mt-2 text-sm text-gray-600 flex items-center">
                      <FiCheckCircle className="text-green-500 mr-1" /> Unidade selecionada: <span className="font-semibold ml-1">{unidadeSearch}</span>
                  </p>
              )}
            </div>

            {/* Tipo de Morador - Mantido como Select */}
            <div>
              <label htmlFor="tipo_morador" className="block text-sm font-bold text-gray-900 mb-1">
                Tipo de Morador *
              </label>
              <select
                id="tipo_morador"
                name="tipo_morador"
                value={formData.tipo_morador}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="proprietario">Proprietário</option>
                <option value="inquilino">Inquilino</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <Input
              label="Profissão"
              name="profissao"
              value={formData.profissao}
              onChange={handleChange}
              placeholder="Ex: Engenheiro, Estudante"
            />

            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Seção Acesso ao Sistema */}
          <div className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50"> {/* Container da seção */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Acesso ao Sistema</h2> {/* Título mais claro */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Senha"
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
              />

              <Input
                label="Confirmar Senha"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                type="password"
                required
                placeholder="Repita a senha"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={formLoading}
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md
                         text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? 'Cadastrando...' : 'Cadastrar Morador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}