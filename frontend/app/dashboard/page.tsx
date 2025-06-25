// frontend/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';

// --- Interfaces para todos os tipos de dados do dashboard ---
interface Reservation {
  space_name: string;
  reservation_date: string;
  status: string;
}

interface Visitor {
  name: string;
  cpf: string;
  release_date: string;
}

interface OccurrenceSummary {
  occurrence_type: string;
  count: number;
}

interface Package {
  id: string;
  sender: string;
  arrivalDate: string;
  status: 'Na Administração' | 'Retirada';
  retrievalDate: string | null;
}


export default function DashboardHomePage() {
  // --- Estados para guardar os dados dinâmicos ---
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [occurrenceSummary, setOccurrenceSummary] = useState<OccurrenceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Dados Fictícios de Encomendas (para design) ---
  const fictitiousPackages: Package[] = [
    { id: 'AMZ789BRL', sender: 'Amazon', arrivalDate: '23/06/2025', status: 'Na Administração', retrievalDate: null },
    { id: 'MLIVRE456', sender: 'Mercado Livre', arrivalDate: '21/06/2025', status: 'Retirada', retrievalDate: '22/06/2025' },
    { id: 'ALIEXP333', sender: 'AliExpress', arrivalDate: '22/06/2025', status: 'Na Administração', retrievalDate: null },
  ];

  // Efeito que busca todos os dados dinâmicos quando a página carrega
useEffect(() => {
    const fetchDashboardData = async () => {
      // CORREÇÃO: Mudança da chave de busca do token para 'token' (consistente com LoginPage)
      const token = localStorage.getItem('token'); 
      if (!token) {
        setError("Autenticação não encontrada. Faça login novamente.");
        setLoading(false);
        // Não redirecionamos aqui; o layout já fará isso se necessário.
        return;
      }
      try {
        const [resReservations, resVisitors, resOccurrences] = await Promise.all([
          fetch('http://127.0.0.1:5000/api/minhas-reservas', { 
            headers: { 'Authorization': `Bearer ${token}` } 
          }),
          fetch('http://127.0.0.1:5000/api/meus-visitantes', { 
            headers: { 'Authorization': `Bearer ${token}` } 
          }),
          fetch('http://127.0.0.1:5000/api/ocorrencias/resumo', { 
            headers: { 'Authorization': `Bearer ${token}` } 
          })
        ]);
        
        if (!resReservations.ok || !resVisitors.ok || !resOccurrences.ok) {
          // Tenta ler o erro do corpo da resposta, se disponível
          const errorTextReservations = await resReservations.text();
          const errorTextVisitors = await resVisitors.text();
          const errorTextOccurrences = await resOccurrences.text();
          
          let errorMessage = 'Falha ao buscar dados do dashboard.';
          if (!resReservations.ok) errorMessage += ` Reservas: ${errorTextReservations}`;
          if (!resVisitors.ok) errorMessage += ` Visitantes: ${errorTextVisitors}`;
          if (!resOccurrences.ok) errorMessage += ` Ocorrências: ${errorTextOccurrences}`;
          
          throw new Error(errorMessage);
        }
        
        const reservationsData = await resReservations.json();
        const visitorsData = await resVisitors.json();
        const occurrencesData = await resOccurrences.json();
        
        setReservations(reservationsData);
        setVisitors(visitorsData);
        setOccurrenceSummary(occurrencesData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []); // O array de dependências vazio garante que isso rode apenas uma vez ao montar o componente

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
  }

  if (loading) return <p className="text-center text-gray-600">Carregando dados do dashboard...</p>;
  if (error) return <p className="text-center text-red-600">Erro: {error}</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-green-800 mb-6">Página Inicial do Dashboard</h1>
      <p className="text-lg text-gray-600 mb-8">
        Aqui está um resumo das suas atividades e do status do condomínio.
      </p>

      {/* Card de Resumo de Ocorrências (Dinâmico) */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-green-700 mb-4">Resumo de Ocorrências Abertas</h2>
        {occurrenceSummary.length > 0 ? (
          <ul className="space-y-2">
            {occurrenceSummary.map((item, index) => (
              <li key={index} className="flex justify-between items-center p-2 rounded-md bg-gray-50">
                <span className="text-gray-800">{item.occurrence_type}</span>
                <span className="font-bold text-lg text-red-600">{item.count}</span>
              </li>
            ))}
          </ul>
        ) : (<p className="text-gray-600">Nenhuma ocorrência aberta no momento.</p>)}
      </div>

      {/* Card de Reservas (Dinâmico) */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-green-700 mb-4">Minhas Próximas Reservas</h2>
        {reservations.length > 0 ? (
          <ul className="space-y-2">
            {reservations.map((res, index) => (
              <li key={index} className="flex justify-between items-center p-2 rounded-md bg-gray-50">
                <span className="text-gray-800"><strong>{res.space_name}</strong> para {formatDate(res.reservation_date)}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${res.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{res.status}</span>
              </li>
            ))}
          </ul>
        ) : (<p className="text-gray-600">Você não possui reservas ativas.</p>)}
      </div>

      {/* Tabela de Visitantes (Dinâmica) */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-green-700 mb-4">Meus Visitantes Liberados</h2>
        {visitors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50"><tr><th className="text-left py-2 px-4 font-semibold text-gray-600">Nome</th><th className="text-left py-2 px-4 font-semibold text-gray-600">CPF</th><th className="text-left py-2 px-4 font-semibold text-gray-600">Liberado até</th></tr></thead>
              <tbody>
                {visitors.map((vis, index) => (
                  <tr key={index} className="border-t"><td className="py-2 px-4 text-gray-800">{vis.name}</td><td className="py-2 px-4 text-gray-700">{vis.cpf}</td><td className="py-2 px-4 text-gray-700">{formatDate(vis.release_date)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (<p className="text-gray-600">Nenhum visitante liberado por você no momento.</p>)}
      </div>
      
      {/* Card de Encomendas (Fictício) */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-green-700 mb-4">Minhas Encomendas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50"><tr><th className="text-left py-2 px-4 font-semibold text-gray-600">Remetente</th><th className="text-left py-2 px-4 font-semibold text-gray-600">Status</th><th className="text-left py-2 px-4 font-semibold text-gray-600">Data de Chegada</th><th className="text-left py-2 px-4 font-semibold text-gray-600">Data de Retirada</th></tr></thead>
            <tbody>
              {fictitiousPackages.map((pkg) => (
                <tr key={pkg.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800 font-medium">{pkg.sender}</td>
                  <td className="py-3 px-4"><span className={`py-1 px-3 rounded-full text-xs font-semibold ${pkg.status === 'Na Administração' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>{pkg.status}</span></td>
                  <td className="py-3 px-4 text-gray-700">{pkg.arrivalDate}</td>
                  <td className="py-3 px-4 text-gray-700">{pkg.retrievalDate || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}