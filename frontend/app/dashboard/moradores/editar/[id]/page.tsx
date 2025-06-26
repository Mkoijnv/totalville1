// portaria/frontend/app/dashboard/moradores/editar/[id]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react'; // Adicionado useRef e useCallback
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi'; // Ícones para feedback

interface Unidade {
  id: number;
  tipo_unidade: string;
  bloco: string | null;
  numero: string;
  andar: number | null;
}

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
  ativo: boolean;
}

// Componente Input (mantido com estilos ajustados para padronização)
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
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
          readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );
}

// Componente Select removido (será substituído por busca dinâmica)
// function Select(...) { ... }

export default function EditarMoradorPage() {
  const router = useRouter();
  const params = useParams();
  const moradorId = params.id ? parseInt(params.id as string) : null;

  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    password: '', // Nova Senha
    confirm_password: '', // Confirmar Nova Senha
    cpf: '',
    rg: '',
    profissao: '',
    whatsapp: '',
    tipo_morador: 'proprietario',
    unidade_id: '',
  });

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para a busca dinâmica de unidades
  const [unidadeSearch, setUnidadeSearch] = useState(''); // Termo de busca digitado ou nome da unidade atual
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


  useEffect(() => {
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

      if (!moradorId) {
        setError('ID do morador não fornecido ou inválido.');
        setLoading(false);
        return;
      }

      try {
        // 1. Buscar Unidades
        const resUnidades = await fetch('http://34.95.214.56:5000/api/unidades', {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });
        if (!resUnidades.ok) {
          throw new Error(`Falha ao buscar unidades: ${await resUnidades.text()}`);
        }
        const unidadesData: Unidade[] = await resUnidades.json();
        setUnidades(unidadesData);

        // 2. Buscar Dados do Morador
        const resMorador = await fetch(`http://34.95.214.56:5000/api/moradores/${moradorId}`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });
        if (!resMorador.ok) {
          throw new Error(`Falha ao buscar dados do morador: ${await resMorador.text()}`);
        }
        const moradorData: Morador = await resMorador.json();

        setFormData({
            nome_completo: moradorData.nome_completo,
            email: moradorData.email,
            password: '', // Senha vazia para não alterar ao editar, a menos que o usuário digite
            confirm_password: '',
            cpf: moradorData.cpf || '',
            rg: moradorData.rg || '',
            profissao: moradorData.profissao || '',
            whatsapp: moradorData.whatsapp || '',
            tipo_morador: moradorData.tipo_morador,
            unidade_id: String(moradorData.unidade_id),
        });

        // Preencher o campo de busca de unidade com a unidade atual do morador
        const currentUnidade = unidadesData.find(u => u.id === moradorData.unidade_id);
        if (currentUnidade) {
            const displayValue = currentUnidade.tipo_unidade === 'apartamento'
                ? `Apto ${currentUnidade.bloco ? `${currentUnidade.bloco}-` : ''}${currentUnidade.numero}`
                : `Casa ${currentUnidade.numero}`;
            setUnidadeSearch(displayValue);
        }

      } catch (err: any) {
        console.error('Erro ao buscar morador para edição:', err);
        setError(err.message || 'Falha ao carregar dados do morador para edição.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router, moradorId]); // Adicionado moradorId como dependência

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
    // Apenas valida as senhas se elas foram preenchidas
    if (formData.password || formData.confirm_password) {
      if (formData.password !== formData.confirm_password) {
        setError("As senhas não coincidem.");
        setFormLoading(false);
        return;
      }
      if (formData.password.length < 6) { // Exemplo de validação de tamanho mínimo
        setError("A nova senha deve ter no mínimo 6 caracteres.");
        setFormLoading(false);
        return;
      }
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
      const payload: any = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        unidade_id: parseInt(formData.unidade_id),
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        profissao: formData.profissao || null,
        whatsapp: formData.whatsapp || null,
        tipo_morador: formData.tipo_morador
      };

      // Adiciona a senha ao payload APENAS se ela foi preenchida
      if (formData.password.length > 0) {
        payload.password = formData.password;
      }

      const response = await fetch(`http://34.95.214.56:5000/api/moradores/${moradorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Erro HTTP ${response.status}`);
      }

      setSuccess('Morador atualizado com sucesso!');
      // Não limpa o formulário, mas pode redefinir as senhas para vazio
      setFormData(prev => ({ ...prev, password: '', confirm_password: '' }));
      setTimeout(() => router.push('/dashboard/moradores'), 2000);
    } catch (err: any) {
      console.error("Erro completo:", err);
      setError(err.message || 'Falha ao atualizar morador.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <p className="text-center text-gray-600 p-8">Carregando dados do morador...</p>;
  if (error && !formLoading && error !== "Autenticação não encontrada. Faça login novamente.") {
      return (
          <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-md border border-red-200 text-center">
                  <h1 className="text-2xl font-bold text-red-700 mb-4">Erro de Carregamento</h1>
                  <p className="text-gray-700 mb-4">{error}</p>
                  <Link href="/dashboard/moradores" className="text-blue-600 hover:text-blue-800">
                      ← Voltar para a Lista de Moradores
                  </Link>
              </div>
          </div>
      );
  }
  if (!moradorId) return <p className="text-center text-red-600 p-8">Erro: ID do morador não encontrado para edição.</p>;


  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-green-800">Editar Morador</h1>
            <Link href="/dashboard/moradores" className="text-blue-600 hover:text-blue-800">
                ← Voltar para a Lista
            </Link>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
            <span className="flex items-center"><FiCheckCircle className="mr-2" />{success}</span>
          </div>
        )}

        {error && (error !== "Autenticação não encontrada. Faça login novamente.") && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            <span className="flex items-center"><FiAlertCircle className="mr-2" />{error}</span> {/* Ícone de alerta */}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção Dados Pessoais */}
          <div className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Dados Pessoais</h2>

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
                value={formData.cpf || ''} // Garante que seja string para o input
                onChange={handleChange}
                placeholder="000.000.000-00"
              />

              <Input
                label="RG"
                name="rg"
                value={formData.rg || ''} // Garante que seja string para o input
                onChange={handleChange}
                placeholder="Ex: 123456789"
              />
            </div>
          </div>

          {/* Seção Dados Residenciais */}
          <div className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Dados Residenciais</h2>

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
              {/* Feedback visual da unidade selecionada */}
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
              value={formData.profissao || ''} // Garante string
              onChange={handleChange}
              placeholder="Ex: Engenheiro, Estudante"
            />

            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp || ''} // Garante string
              onChange={handleChange}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Seção Acesso ao Sistema */}
          <div className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Acesso ao Sistema <span className="text-gray-500 font-normal text-base">(Deixe em branco para não alterar a senha)</span></h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nova Senha"
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                placeholder="Mínimo 6 caracteres"
              />

              <Input
                label="Confirmar Nova Senha"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                type="password"
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-4">
            <button
                type="button"
                onClick={() => router.push('/dashboard/moradores')}
                className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                Cancelar
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md
                         text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}