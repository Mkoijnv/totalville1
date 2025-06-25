'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Definição da interface Unidade (mantida)
interface Unidade {
  id: number;
  tipo_unidade: string;
  bloco: string | null;
  numero: string;
  andar: number | null;
}

// Componentes auxiliares Input (incorporado no mesmo arquivo)
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
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
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
        className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'text-gray-900'}`}
      />
    </div>
  );
}

// Componente auxiliar Select (incorporado no mesmo arquivo)
function Select({ label, name, value, onChange, required = false, children }: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}{required && ' *'}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {children}
      </select>
    </div>
  );
}


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
    unidade_id: '',
  });

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true); // Loading para carregar unidades
  const [formLoading, setFormLoading] = useState(false); // Loading para submissão do formulário
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setTimeout(() => router.push('/dashboard/moradores'), 2000); // Redireciona para a lista
    } catch (err: any) {
      console.error("Erro completo:", err);
      setError(err.message || 'Falha ao cadastrar morador.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <p className="text-center text-gray-600 p-8">Carregando unidades...</p>;
  if (error && !formLoading) return <p className="text-center text-red-600 p-8">Erro: {error}</p>;

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
            <span>{success}</span>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Dados Pessoais</h2>
              
              <Input 
                label="Nome Completo" 
                name="nome_completo" 
                value={formData.nome_completo} 
                onChange={handleChange} 
                required 
              />
              
              <Input 
                label="E-mail" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                type="email" 
                required 
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
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Dados Residenciais</h2>
              
              <Select 
                label="Unidade" 
                name="unidade_id" 
                value={formData.unidade_id} 
                onChange={handleChange} 
                required
              >
                <option value="">Selecione uma unidade</option>
                {unidades.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.tipo_unidade === 'apartamento' 
                      ? `Apto ${unidade.bloco || ''}-${unidade.numero}` 
                      : `Casa ${unidade.numero}`}
                  </option>
                ))}
              </Select>
              
              <Select 
                label="Tipo de Morador" 
                name="tipo_morador" 
                value={formData.tipo_morador} 
                onChange={handleChange}
              >
                <option value="proprietario">Proprietário</option>
                <option value="inquilino">Inquilino</option>
                <option value="outro">Outro</option>
              </Select>
              
              <Input 
                label="Profissão" 
                name="profissao" 
                value={formData.profissao} 
                onChange={handleChange} 
              />
              
              <Input 
                label="WhatsApp" 
                name="whatsapp" 
                value={formData.whatsapp} 
                onChange={handleChange} 
                placeholder="(00) 00000-0000" 
              />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h2 className="text-lg font-semibold">Acesso ao Sistema</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Senha" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                type="password" 
                required 
              />
              
              <Input 
                label="Confirmar Senha" 
                name="confirm_password" 
                value={formData.confirm_password} 
                onChange={handleChange} 
                type="password" 
                required 
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
