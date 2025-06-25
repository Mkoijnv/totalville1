// This file is part of the frontend for the Encomendas (Packages) management.
// It allows administrators to register new packages, view a list of all packages,
// and record when a package has been picked up by a resident.

'use client'; // This directive is necessary for Next.js App Router components using client-side features.

import { useState, useEffect } from 'react'; // React hooks for state and lifecycle management
import { useRouter } from 'next/navigation'; // Next.js hook for client-side navigation
import Link from 'next/link'; // Next.js component for client-side navigation
// Icons from react-icons/fi for visual actions (add, check, package, search, close)
import { FiPlusCircle, FiCheckCircle, FiPackage, FiSearch, FiXCircle } from 'react-icons/fi';

// Helper component for text input fields
function Input({ label, name, value, onChange, type = 'text', placeholder = '', required = false, readOnly = false }: {
  label: string; // Label text for the input
  name: string; // HTML 'name' attribute, used for form data
  value: string; // Current value of the input
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Event handler for input changes
  type?: string; // HTML 'type' attribute (e.g., 'text', 'date', 'password')
  placeholder?: string; // Placeholder text
  required?: boolean; // Whether the input is required
  readOnly?: boolean; // Whether the input is read-only
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900"> {/* Improved legibility: font-bold text-gray-900 */}
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

// Helper component for select (dropdown) fields
function Select({ label, name, value, onChange, required = false, children }: {
  label: string; // Label text for the select
  name: string; // HTML 'name' attribute
  value: string; // Current value of the select
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; // Event handler for select changes
  required?: boolean; // Whether the select is required
  children: React.ReactNode; // Options to be rendered inside the select
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-gray-900"> {/* Improved legibility: font-bold text-gray-900 */}
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

// Interface representing an Encomenda (Package) record from the backend
interface Encomenda {
    id: number; // Unique ID of the package
    remetente: string; // Sender of the package
    descricao: string | null; // Optional description of the package
    data_chegada: string; // Date of package arrival (YYYY-MM-DD format)
    status: 'Na Administração' | 'Retirada'; // Current status of the package
    data_retirada: string | null; // Date of package pickup
    morador_id: number; // ID of the resident the package is for
    unidade_destino_id: number; // ID of the destination unit
    morador_nome?: string; // Resident's name (for display, populated on frontend)
    morador_unidade_numero?: string; // Unit number (for display)
    morador_unidade_bloco?: string | null; // Unit block (for display)
    morador_unidade_tipo?: string; // Unit type ('apartamento' or 'casa') (for display)
    registrado_por_admin_id: number | null; // ID of the admin who registered it
    criado_em: string; // Creation timestamp
}

// Interface for resident options in dropdowns
interface MoradorOption {
  id: number; // Resident ID
  nome_completo: string; // Full name of the resident
  unidade_id?: number; // ID of the resident's unit
  unidade_numero?: string; // Unit number
  unidade_bloco?: string | null; // Unit block
  unidade_tipo?: string; // Unit type ('apartamento' or 'casa')
}

// Interface for unit options in dropdowns (e.g., for unregistered residents)
interface UnidadeOption {
  id: number; // Unit ID
  numero: string; // Unit number
  bloco: string | null; // Unit block
  tipo_unidade: string; // Unit type ('apartamento' or 'casa')
}

// Placeholder ID for "Unregistered Resident" in the database.
// IMPORTANT: Replace with the actual ID from your database for the "Morador Não Cadastrado" entry.
const UNREGISTERED_MORADOR_PLACEHOLDER_ID = 4; 

// Main component for Encomendas (Packages) management page
export default function EncomendasPage() {
  const router = useRouter(); // Next.js router instance
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]); // State for the list of packages
  const [moradoresOptions, setMoradoresOptions] = useState<MoradorOption[]>([]); // Options for resident dropdown
  const [unidadesOptions, setUnidadesOptions] = useState<UnidadeOption[]>([]); // Options for unit dropdown (for unregistered residents)
  const [searchTerm, setSearchTerm] = useState(''); // State for the search input
  
  const [showForm, setShowForm] = useState(false); // Controls visibility of the package registration form
  const [formData, setFormData] = useState({ // State for the package registration form
    remetente: '',
    descricao: '',
    data_chegada: '',
    morador_id: '',
    unidade_destino_id: '', 
  });

  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false); // Controls visibility of the pickup confirmation modal
  const [selectedEncomendaForWithdrawal, setSelectedEncomendaForWithdrawal] = useState<Encomenda | null>(null); // Package selected for pickup
  const [withdrawalAuth, setWithdrawalAuth] = useState({ cpf: '', password: '' }); // Authentication data for pickup
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null); // Error message for pickup modal
  const [withdrawalLoading, setWithdrawalLoading] = useState(false); // Loading state for pickup confirmation

  const [loading, setLoading] = useState(true); // Global loading state for initial data fetch
  const [formLoading, setFormLoading] = useState(false); // Loading state for form submission
  const [error, setError] = useState<string | null>(null); // General error message
  const [success, setSuccess] = useState<string | null>(null); // General success message

  // Function to fetch all necessary data (packages, residents, units) from the backend
  const fetchData = async () => {
    setError(null); // Clear previous errors
    setLoading(true); // Activate global loading
    const token = localStorage.getItem('token'); // Retrieve authentication token

    // Redirect to login if no token is found
    if (!token) {
      setError('Autenticação não encontrada. Faça login novamente.');
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch All Units (for unit destination select and mapping to residents/packages)
      const resAllUnidades = await fetch('http://127.0.0.1:5000/api/unidades', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!resAllUnidades.ok) {
        throw new Error(`Falha ao buscar todas as unidades: ${await resAllUnidades.text()}`);
      }
      const allUnidadesData: UnidadeOption[] = await resAllUnidades.json();
      setUnidadesOptions(allUnidadesData); // Populate state for unit dropdown

      // Create a Map for efficient unit lookup
      const unidadesMap = new Map<number, { numero: string; bloco: string | null; tipo_unidade: string }>();
      allUnidadesData.forEach((u: any) => {
        unidadesMap.set(u.id, { numero: u.numero, bloco: u.bloco, tipo_unidade: u.tipo_unidade });
      });


      // 2. Fetch Residents (to populate the resident dropdown in the package registration form)
      const resMoradores = await fetch('http://127.0.0.1:5000/api/moradores', {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!resMoradores.ok) {
        throw new Error(`Falha ao buscar moradores: ${await resMoradores.text()}`);
      }
      const moradoresData = await resMoradores.json();
      
      // Map resident data to include unit details for display
      const moradoresOptionsData: MoradorOption[] = moradoresData.map((morador: any) => {
        const unidadeInfo = morador.unidade_id ? unidadesMap.get(morador.unidade_id) : null;
        return {
          id: morador.id,
          nome_completo: morador.nome_completo,
          unidade_id: morador.unidade_id, 
          unidade_numero: unidadeInfo ? unidadeInfo.numero : null,
          unidade_bloco: unidadeInfo ? unidadeInfo.bloco : null,
          unidade_tipo: unidadeInfo ? unidadeInfo.tipo_unidade : null, // Store unit type for display
        };
      });
      setMoradoresOptions(moradoresOptionsData);

      // 3. Fetch Packages (with search term if provided)
      const queryParams = searchTerm ? `?search_term=${encodeURIComponent(searchTerm)}` : '';
      const resEncomendas = await fetch(`http://127.0.0.1:5000/api/encomendas${queryParams}`, { 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!resEncomendas.ok) {
        throw new Error(`Falha ao buscar encomendas: ${await resEncomendas.text()}`);
      }
      let encomendasData: Encomenda[] = await resEncomendas.json();

      // Map package data to include resident's name, unit, and block for display
      encomendasData = encomendasData.map(encomenda => {
        const morador = moradoresOptionsData.find(m => m.id === encomenda.morador_id);
        const unidadeDestino = encomenda.unidade_destino_id ? unidadesMap.get(encomenda.unidade_destino_id) : null; 

        return {
          ...encomenda,
          // Determine resident's display name: use description for placeholder, actual name otherwise
          morador_nome: morador && morador.id === UNREGISTERED_MORADOR_PLACEHOLDER_ID 
                        ? (encomenda.descricao || 'Morador Não Cadastrado') 
                        : (morador ? morador.nome_completo : 'Morador Desconhecido/Removido'),
          morador_unidade_numero: unidadeDestino ? unidadeDestino.numero : 'N/A', 
          morador_unidade_bloco: unidadeDestino ? unidadeDestino.bloco : null, 
          morador_unidade_tipo: unidadeDestino ? unidadeDestino.tipo_unidade : null, // Store unit type for destination unit
        };
      });
      setEncomendas(encomendasData);

    } catch (err: any) {
      console.error('Erro ao carregar dados de encomendas:', err);
      setError(err.message || 'Falha ao carregar a página de gerenciamento de encomendas.');
    } finally {
      setLoading(false); // Deactivate global loading
    }
  };

  // Effect hook to fetch data on component mount or when dependencies change
  useEffect(() => {
    fetchData(); // Initial data fetch
  }, [router, success, searchTerm]); // Refetch data when router changes, an operation succeeds, or search term changes

  // Handle changes in the package registration form inputs
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle submission of the package registration form
  const handleAddEncomenda = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setFormLoading(true); // Activate form loading
    setError(null); // Clear previous errors
    setSuccess(null); // Clear previous success messages

    const token = localStorage.getItem('token'); // Retrieve authentication token
    if (!token) {
      setError('Autenticação não encontrada. Faça login novamente.');
      setFormLoading(false);
      return;
    }

    // Validate unit destination ID for "Unregistered Resident"
    if (parseInt(formData.morador_id) === UNREGISTERED_MORADOR_PLACEHOLDER_ID && !formData.unidade_destino_id) {
        setError("Selecione a unidade de destino para morador não cadastrado.");
        setFormLoading(false);
        return;
    }
    // Determine the final destination unit ID: either from the form (for unregistered) or from the selected resident's unit
    const moradorSelecionado = moradoresOptions.find(m => m.id === parseInt(formData.morador_id));
    const finalUnidadeDestinoId = parseInt(formData.morador_id) === UNREGISTERED_MORADOR_PLACEHOLDER_ID
        ? parseInt(formData.unidade_destino_id)
        : (moradorSelecionado?.unidade_id || null); 

    if (!finalUnidadeDestinoId) {
        setError("Não foi possível determinar a unidade de destino.");
        setFormLoading(false);
        return;
    }

    try {
      const payload = {
        remetente: formData.remetente,
        descricao: formData.descricao || null,
        data_chegada: formData.data_chegada,
        morador_id: parseInt(formData.morador_id),
        unidade_destino_id: finalUnidadeDestinoId, 
      };

      const response = await fetch('http://127.0.0.1:5000/api/encomendas', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao cadastrar encomenda.');
      }

      setSuccess('Encomenda cadastrada com sucesso!');
      // Clear the form fields after successful registration
      setFormData({ remetente: '', descricao: '', data_chegada: '', morador_id: '', unidade_destino_id: '' }); 
      setShowForm(false); // Hide form and show list
      fetchData(); // Refetch data to update the package list
      setTimeout(() => setSuccess(null), 3000); // Hide success message after 3 seconds
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar encomenda.');
    } finally {
      setFormLoading(false); // Deactivate form loading
    }
  };

  // Handle opening the pickup confirmation modal
  const handleOpenWithdrawalModal = (encomenda: Encomenda) => {
    setSelectedEncomendaForWithdrawal(encomenda); // Set the selected package
    setWithdrawalAuth({ cpf: '', password: '' }); // Clear authentication fields
    setWithdrawalError(null); // Clear previous errors
    setWithdrawalModalOpen(true); // Open the modal
  };

  // Handle changes in the authentication inputs within the pickup modal
  const handleWithdrawalAuthChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target;
    setWithdrawalAuth(prev => ({ ...prev, [name]: value }));
  };

  // Handle submission of the pickup confirmation form (authentication with CPF and password)
  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    if (!selectedEncomendaForWithdrawal) return; // Do nothing if no package is selected

    setWithdrawalLoading(true); // Activate loading for the modal button
    setWithdrawalError(null); // Clear previous errors
    setSuccess(null); // Clear previous success messages

    const token = localStorage.getItem('token'); // Retrieve authentication token
    // Admin authentication check (this action is usually restricted to admins)
    if (!token) {
        setWithdrawalError('Autenticação de administrador necessária. Faça login novamente.');
        setWithdrawalLoading(false);
        return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/encomendas/${selectedEncomendaForWithdrawal.id}/retirada`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
            cpf: withdrawalAuth.cpf, 
            password: withdrawalAuth.password,
            unidade_destino_id: selectedEncomendaForWithdrawal.unidade_destino_id // Pass destination unit ID to backend
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao registrar retirada.');
      }

      setSuccess('Retirada registrada com sucesso!'); // Set success message
      setWithdrawalModalOpen(false); // Close the modal
      setSelectedEncomendaForWithdrawal(null); // Clear selected package
      fetchData(); // Refetch data to update the package list
      setTimeout(() => setSuccess(null), 3000); // Hide success message after 3 seconds
    } catch (err: any) {
      setWithdrawalError(err.message || 'Erro ao confirmar retirada.'); // Set error message
    } finally {
      setWithdrawalLoading(false); // Deactivate loading for the modal button
    }
  };

  // Filter packages based on search term
  const filteredEncomendas = encomendas.filter(encomenda => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    // Determine the resident's display name for search purposes
    const moradorDisplayName = encomenda.morador_id === UNREGISTERED_MORADOR_PLACEHOLDER_ID 
                               ? (encomenda.descricao || 'morador não cadastrado') // Use description if unregistered
                               : (encomenda.morador_nome || ''); // Use resident's name if registered
    
    // Format unit display for search purposes
    const unidadeDisplay = `${encomenda.morador_unidade_tipo === 'apartamento' ? 'apto' : 'casa'} ${encomenda.morador_unidade_bloco ? `${encomenda.morador_unidade_bloco}-` : ''}${encomenda.morador_unidade_numero}`.toLowerCase();

    return (
      encomenda.remetente.toLowerCase().includes(lowerCaseSearchTerm) || // Search by sender
      moradorDisplayName.toLowerCase().includes(lowerCaseSearchTerm) || // Search by resident display name (or description)
      unidadeDisplay.includes(lowerCaseSearchTerm) || // Search by unit display (e.g., "apto 101")
      (encomenda.descricao && encomenda.descricao.toLowerCase().includes(lowerCaseSearchTerm)) // Also search original description field
    );
  });

  // Helper function to format dates for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
  };

  // Conditional rendering based on loading and error states
  if (loading) return <p className="text-center text-gray-600 p-8">Carregando encomendas...</p>;
  if (error && !showForm) return <p className="text-center text-red-600 p-8">Erro: {error}</p>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-6"> 
        
        {/* Success and Error messages display */}
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

        {/* Package Registration Form */}
        {showForm ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-green-800">Registrar Nova Encomenda</h1>
              <button 
                onClick={() => setShowForm(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Voltar para a Lista
              </button>
            </div>
            <form onSubmit={handleAddEncomenda} className="space-y-6">
              <Input label="Remetente" name="remetente" value={formData.remetente} onChange={handleFormChange} required placeholder="Ex: Amazon, Mercado Livre" />
              <Input label="Descrição (Opcional)" name="descricao" value={formData.descricao} onChange={handleFormChange} placeholder="Ex: Pacote pequeno, Caixa grande" />
              <Input label="Data de Chegada" name="data_chegada" value={formData.data_chegada} onChange={handleFormChange} type="date" required />
              
              <Select 
                label="Morador Destinatário" // Label with improved legibility
                name="morador_id" 
                value={formData.morador_id} 
                onChange={handleFormChange} 
                required
              >
                <option value="">Selecione um morador</option>
                {/* Option for "Unregistered Resident" */}
                <option value={UNREGISTERED_MORADOR_PLACEHOLDER_ID}>Morador Não Cadastrado</option>
                {moradoresOptions
                  .filter(m => m.id !== UNREGISTERED_MORADOR_PLACEHOLDER_ID) 
                  .map(morador => (
                    <option key={morador.id} value={morador.id}>
                      {morador.nome_completo} ({morador.unidade_tipo === 'apartamento' ? 'Apto' : 'Casa'} {morador.unidade_bloco ? `${morador.unidade_bloco}-` : ''}{morador.unidade_numero})
                    </option>
                  ))}
              </Select>

              {/* Unit Destination field, visible only if "Unregistered Resident" is selected */}
              {parseInt(formData.morador_id) === UNREGISTERED_MORADOR_PLACEHOLDER_ID && (
                <Select
                  label="Unidade de Destino (para morador não cadastrado)"
                  name="unidade_destino_id"
                  value={formData.unidade_destino_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Selecione a unidade</option>
                  {unidadesOptions.map(unidade => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.tipo_unidade === 'apartamento'
                        ? `Apto ${unidade.bloco || ''}-${unidade.numero}`
                        : `Casa ${unidade.numero}`}
                    </option>
                  ))}
                </Select>
              )}

              <div className="text-right">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md 
                               text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Registrando...' : 'Cadastrar Encomenda'}
                </button>
              </div>
            </form>
          </>
        ) : (
          // List of Packages
          <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-green-800">Gerenciar Encomendas</h1>
                <button 
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <FiPlusCircle className="mr-2" /> Nova Encomenda
                </button>
            </div>
            
            {/* Search Input */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar por remetente, morador ou unidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500"
                />
            </div>

            {/* Package List Table */}
            {filteredEncomendas.length === 0 && !loading ? (
                <p className="text-gray-600 text-center">Nenhuma encomenda encontrada.</p>
            ) : (
                <div className="overflow-x-auto shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remetente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Morador Destino</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Chegada</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Retirada</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredEncomendas.map((encomenda) => (
                                <tr key={encomenda.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{encomenda.remetente}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* Logic for "Morador Destino": display description for placeholder, name and unit type for registered resident */}
                                        {encomenda.morador_id === UNREGISTERED_MORADOR_PLACEHOLDER_ID ? (
                                            <>
                                                {encomenda.descricao || 'Morador Não Cadastrado'}
                                                {encomenda.morador_unidade_numero ? ` (${encomenda.morador_unidade_tipo === 'apartamento' ? 'Apto' : 'Casa'} ${encomenda.morador_unidade_bloco ? `${encomenda.morador_unidade_bloco}-` : ''}${encomenda.morador_unidade_numero})` : ''}
                                            </>
                                        ) : (
                                            <>
                                                {encomenda.morador_nome} ({encomenda.morador_unidade_tipo === 'apartamento' ? 'Apto' : 'Casa'} {encomenda.morador_unidade_bloco ? `${encomenda.morador_unidade_bloco}-` : ''}{encomenda.morador_unidade_numero})
                                            </>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(encomenda.data_chegada)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${encomenda.status === 'Na Administração' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {encomenda.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{encomenda.data_retirada ? formatDate(encomenda.data_retirada) : '---'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                        {encomenda.status === 'Na Administração' && (
                                            <button 
                                                onClick={() => handleOpenWithdrawalModal(encomenda)}
                                                className="text-blue-600 hover:text-blue-900 mx-1"
                                                title={`Registrar retirada de ${encomenda.remetente}`}
                                            >
                                                <FiCheckCircle className="inline-block w-5 h-5" /> {/* Check/Pickup Icon */}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </>
        )}
      </div>

      {/* Pickup Confirmation Modal */}
      {withdrawalModalOpen && selectedEncomendaForWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmar Retirada de Encomenda</h2>
            <p className="text-gray-600 mb-4">
              Encomenda de <strong>{selectedEncomendaForWithdrawal.remetente}</strong> para 
              <strong> {selectedEncomendaForWithdrawal.morador_nome} </strong>
              ({selectedEncomendaForWithdrawal.morador_unidade_bloco ? `${selectedEncomendaForWithdrawal.morador_unidade_bloco}-` : ''}{selectedEncomendaForWithdrawal.morador_unidade_numero}).
            </p>
            <p className="text-red-500 text-sm mb-4">
              Para evitar extravios, a retirada deve ser confirmada por um morador registrado da unidade, utilizando seu CPF e senha.
            </p>

            <form onSubmit={handleConfirmWithdrawal} className="space-y-4">
              <Input 
                label="CPF do Morador" 
                name="cpf" 
                value={withdrawalAuth.cpf} 
                onChange={handleWithdrawalAuthChange} 
                type="text" 
                placeholder="000.000.000-00" 
                required 
              />
              <Input 
                label="Senha do Morador" 
                name="password" 
                value={withdrawalAuth.password} 
                onChange={handleWithdrawalAuthChange} 
                type="password" 
                placeholder="********" 
                required 
              />
              {withdrawalError && (
                <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{withdrawalError}</div>
              )}
              <div className="flex justify-end space-x-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setWithdrawalModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={withdrawalLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawalLoading ? 'Autenticando...' : 'Confirmar Retirada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
