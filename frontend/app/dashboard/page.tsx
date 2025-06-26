'use client';  

import { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation'; 
import Link from 'next/link'; 
// Importação de ícones
import { FiPlusCircle, FiCheckCircle, FiPackage, FiSearch, FiXCircle, FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiUser, FiHome } from 'react-icons/fi'; 

// --- Interfaces para todos os tipos de dados do dashboard --- 
interface Reservation {
  space_name: string;
  reservation_date: string;
  status: string;
  resident_name: string;
  unit_type?: string;   // 'apartamento' ou 'casa'
  unit_number?: string; // apenas o número (ex: "101")
  block?: string;       // bloco (se aplicável)
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

interface Encomenda {
    id: number;
    remetente: string;
    descricao: string | null;
    data_chegada: string; 
    status: 'Na Administração' | 'Retirada';
    data_retirada: string | null; 
    morador_id: number;
    unidade_destino_id: number;
    morador_nome?: string; 
    morador_unidade_numero?: string;
    morador_unidade_bloco?: string | null;
    morador_unidade_tipo?: string;
    registrado_por_admin_id: number | null;
    criado_em: string;
}

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
    ativo: boolean;
}


// Mapa de cores para cada espaço
const SPACE_COLORS: Record<string, string> = {
  "Churrasqueira 1 (dentro do gourmet)": "#FF6384", // Vermelho
  "Churrasqueira 2 (ao lado da quadra)": "#36A2EB", // Azul
  "Churrasqueira 3 (final do condomínio)": "#FFCE56", // Amarelo
  "Salão de Festas": "#4BC0C0", // Ciano
  "Sinuca": "#9966FF", // Roxo
};

// Cores para status
const STATUS_COLORS = {
  Aprovada: "#28a745", // Verde
  Pendente: "#ffc107", // Amarelo
};

export default function DashboardHomePage() { 
  const router = useRouter(); 
  const [reservations, setReservations] = useState<Reservation[]>([]); 
  const [visitors, setVisitors] = useState<Visitor[]>([]); 
  const [occurrenceSummary, setOccurrenceSummary] = useState<OccurrenceSummary[]>([]); 
  const [minhasEncomendas, setMinhasEncomendas] = useState<Encomenda[]>([]); 
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [currentAvisoIndex, setCurrentAvisoIndex] = useState(0);
  
  // --- Estados para o Calendário de Reservas ---
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  const [allReservationsForCalendar, setAllReservationsForCalendar] = useState<Reservation[]>([]); 
  const [selectedDateReservations, setSelectedDateReservations] = useState<Reservation[]>([]); 
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false); 

  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null); 

  // Efeito que busca todos os dados dinâmicos quando a página carrega 
  useEffect(() => { 
    const fetchDashboardData = async () => { 
      const token = localStorage.getItem('token');  
      if (!token) { 
        setError("Autenticação não encontrada. Faça login novamente."); 
        setLoading(false); 
        router.push('/login'); 
        return; 
      } 
      try { 
        const [resReservations, resVisitors, resOccurrences, resEncomendas, resAvisos, resAllReservations] = await Promise.all([ 
          fetch('http://127.0.0.1:5000/api/minhas-reservas', {  
            headers: { 'Authorization': `Bearer ${token}` }  
          }), 
          fetch('http://127.0.0.1:5000/api/meus-visitantes', {  
            headers: { 'Authorization': `Bearer ${token}` }  
          }), 
          fetch('http://127.0.0.1:5000/api/ocorrencias/resumo', {  
            headers: { 'Authorization': `Bearer ${token}` }  
          }),
          fetch('http://127.0.0.1:5000/api/minhas-encomendas', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://127.0.0.1:5000/api/avisos', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://127.0.0.1:5000/api/reservas/resumo-geral', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]); 
        
        // Verificação de sucesso de TODAS as respostas
        if (!resReservations.ok || !resVisitors.ok || !resOccurrences.ok || !resEncomendas.ok || !resAvisos.ok || !resAllReservations.ok) { 
          const errorTextReservations = await resReservations.text(); 
          const errorTextVisitors = await resVisitors.text(); 
          const errorTextOccurrences = await resOccurrences.text(); 
          const errorTextEncomendas = await resEncomendas.text(); 
          const errorTextAvisos = await resAvisos.text(); 
          const errorTextAllReservations = await resAllReservations.text(); 
          
          let errorMessage = 'Falha ao buscar dados do dashboard.'; 
          if (!resReservations.ok) errorMessage += ` Reservas: ${errorTextReservations}`; 
          if (!resVisitors.ok) errorMessage += ` Visitantes: ${errorTextVisitors}`; 
          if (!resOccurrences.ok) errorMessage += ` Ocorrências: ${errorTextOccurrences}`; 
          if (!resEncomendas.ok) errorMessage += ` Encomendas: ${errorTextEncomendas}`; 
          if (!resAvisos.ok) errorMessage += ` Avisos: ${errorTextAvisos}`; 
          if (!resAllReservations.ok) errorMessage += ` Todas as Reservas: ${errorTextAllReservations}`; 
          
          throw new Error(errorMessage); 
        } 
        
        const reservationsData = await resReservations.json(); 
        const visitorsData = await resVisitors.json(); 
        const occurrencesData = await resOccurrences.json(); 
        const encomendasData = await resEncomendas.json(); 
        const avisosData = await resAvisos.json(); 
        const allReservationsRaw = await resAllReservations.json(); 
        
        setReservations(reservationsData); 
        setVisitors(visitorsData); 
        setOccurrenceSummary(occurrencesData); 
        setMinhasEncomendas(encomendasData); 
        setAvisos(avisosData); 
        setCurrentAvisoIndex(0); 
        setAllReservationsForCalendar(allReservationsRaw); 
      } catch (err: any) { 
        setError(err.message); 
      } finally { 
        setLoading(false); 
      } 
    }; 
    fetchDashboardData(); 
  }, [router]); 

  // Funções de navegação do carrossel de avisos
  const goToPreviousAviso = () => {
    setCurrentAvisoIndex((prevIndex) => 
      prevIndex === 0 ? avisos.length - 1 : prevIndex - 1
    );
  };

  const goToNextAviso = () => {
    setCurrentAvisoIndex((prevIndex) => 
      prevIndex === avisos.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Efeito para auto-play do carrossel de avisos
  useEffect(() => {
    if (avisos.length > 1) { 
      const autoPlayTimer = setInterval(goToNextAviso, 5000); 
      return () => clearInterval(autoPlayTimer); 
    }
  }, [avisos, currentAvisoIndex]); 

  const formatDate = (dateString: string) => { 
    if (!dateString) return '---'; 
    const date = new Date(dateString); 
    const userTimezoneOffset = date.getTimezoneOffset() * 60000; 
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR'); 
  }

  // Função para normalizar qualquer string de data para o formato YYYY-MM-DD
  const normalizeDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // Corrige problemas de fuso horário
      const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      const year = adjustedDate.getFullYear();
      const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
      const day = String(adjustedDate.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Erro ao normalizar data:', dateString, error);
      return '';
    }
  };

  // --- Funções e Lógica do Calendário de Reservas ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    const startDayOfWeek = firstDayOfMonth.getDay(); 
    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() - 1, 1);
      return newMonth;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1);
      return newMonth;
    });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Função para formatar datas no formato YYYY-MM-DD
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDayClick = (day: Date | null) => {
    if (day) {
      const clickedDateFormatted = formatDateToYYYYMMDD(day);
      
      const reservationsForDay = allReservationsForCalendar.filter(res => {
        if (!res.reservation_date) return false;
        
        // Normaliza a data da reserva para comparação
        const resDateNormalized = normalizeDate(res.reservation_date);
        return resDateNormalized === clickedDateFormatted;
      });
      
      setSelectedDateReservations(reservationsForDay);
      setIsCalendarModalOpen(true);
    }
  };

  const daysInCurrentMonth = getDaysInMonth(currentMonth);
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Função para obter o estilo de fundo combinado
  const getDayStyle = (day: Date | null) => {
    if (!day) return {};
    
    const formattedDay = formatDateToYYYYMMDD(day);
    
    // Encontrar todas as reservas para este dia
    const reservationsForDay = allReservationsForCalendar.filter(res => {
      if (!res.reservation_date) return false;
      const resDateNormalized = normalizeDate(res.reservation_date);
      return resDateNormalized === formattedDay;
    });

    if (reservationsForDay.length === 0) return {};

    // Criar gradiente com as cores dos espaços e status
    const anglePerReservation = 360 / reservationsForDay.length;
    let gradientParts: string[] = [];
    
    reservationsForDay.forEach((res, index) => {
      const spaceColor = SPACE_COLORS[res.space_name] || "#CCCCCC";
      const statusColor = STATUS_COLORS[res.status as keyof typeof STATUS_COLORS] || "#6c757d";
      
      // Para cada reserva, adicionar um gradiente angular
      const startAngle = index * anglePerReservation;
      const endAngle = (index + 1) * anglePerReservation;
      
      gradientParts.push(
        `${spaceColor} 0 ${startAngle}deg, 
        ${statusColor} ${startAngle}deg ${endAngle}deg`
      );
    });

    // Combinar os gradientes em formato de pizza
    const background = `conic-gradient(${gradientParts.join(', ')})`;
    
    return {
      background: background,
      borderRadius: '50%',
      width: '28px',
      height: '28px',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#000',
      fontWeight: 'bold',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };
  };


  if (loading) return <p className="text-center text-gray-600">Carregando dados do dashboard...</p>; 
  if (error) return <p className="text-center text-red-600">Erro: {error}</p>; 

  const currentAviso = avisos.length > 0 ? avisos[currentAvisoIndex] : null;

  return ( 
    <>
      <div className="flex flex-col min-h-screen bg-gray-50 p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-green-800 mb-4 md:mb-6">Página Inicial do Dashboard</h1> 
        <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8"> 
          Aqui está um resumo das suas atividades e do status do condomínio. 
        </p> 

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Carrossel de Avisos */}
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 relative flex flex-col justify-between">
            <h2 className="text-xl font-bold text-green-700 mb-3 flex items-center"><span className="mr-2 text-green-500"><FiPlusCircle/></span>Avisos do Condomínio</h2>
            {currentAviso ? (
              <div className="flex items-center justify-center space-x-2">
              {avisos.length > 1 && (
                <button
                onClick={goToPreviousAviso}
                className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none shadow-sm"
                aria-label="Aviso anterior"
                >
                <FiChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
              )}

              <div className="flex-1 text-center max-w-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{currentAviso.titulo}</h3>
                <p className="text-sm text-gray-700 mb-2 line-clamp-3">{currentAviso.conteudo}</p>
                {currentAviso.imagem_url && (
                <div className="relative w-full max-w-xs mx-auto h-24 mb-2 rounded-lg overflow-hidden border">
                  <img
                  src={currentAviso.imagem_url}
                  alt={currentAviso.titulo}
                  className="object-contain w-full h-full"
                  onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/200x100/CCCCCC/FFFFFF?text=Imagem+Nao+Disponivel'}
                  />
                </div>
                )}
                <p className="text-xs text-gray-500">Publicado em: {formatDate(currentAviso.data_publicacao)}</p>
              </div>

              {avisos.length > 1 && (
                <button
                onClick={goToNextAviso}
                className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none shadow-sm"
                aria-label="Próximo aviso"
                >
                <FiChevronRight className="w-6 h-6 text-gray-800" />
                </button>
              )}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">Nenhum aviso ativo no momento.</p>
            )}
            <div className="text-right mt-3">
              <Link href="/dashboard/avisos/novo" className="text-blue-600 hover:text-blue-800 text-sm">
                Postar Novo Aviso
              </Link>
            </div>
          </div>

          {/* Card da Agenda de Reservas */}
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200 flex flex-col">
            <h2 className="text-xl font-bold text-green-700 mb-3 md:mb-4 flex items-center">
              <span className="mr-2 text-blue-500"><FiCalendar/></span>Agenda de Reservas
            </h2>
            
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <button 
                onClick={handlePrevMonth} 
                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 shadow-sm"
              >
                <FiChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <h3 className="text-base md:text-lg font-semibold text-gray-800">{getMonthName(currentMonth)}</h3>
              <button 
                onClick={handleNextMonth} 
                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 shadow-sm"
              >
                <FiChevronRight className="w-6 h-6 text-gray-800" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-xs md:text-sm text-center flex-grow">
              {daysOfWeek.map(day => (
                <div key={day} className="font-bold text-gray-700 py-1 md:py-2 text-xs">{day}</div>
              ))}
              {daysInCurrentMonth.map((day, index) => (
                <div
                  key={index}
                  className={`relative py-1 md:py-2 cursor-pointer transition-colors duration-100
                              ${day ? 'hover:bg-gray-50' : 'text-gray-400'}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day ? (
                    <div 
                      className="flex items-center justify-center mx-auto"
                      style={getDayStyle(day)}
                    >
                      <span className="font-bold text-gray-900">{day.getDate()}</span>
                    </div>
                  ) : ''}
                </div>
              ))}
            </div>
            
            <div className="mt-4 md:mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">                
                <div>
                  <h4 className="font-medium text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Cores por Status:</h4>
                  <ul className="text-xs md:text-sm text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <span 
                        className="inline-block w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: STATUS_COLORS.Aprovada }}
                      ></span>
                      Reserva Aprovada
                    </li>
                    <li className="flex items-center">
                      <span 
                        className="inline-block w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: STATUS_COLORS.Pendente }}
                      ></span>
                      Reserva Pendente
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card de Resumo de Ocorrências */} 
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200"> 
            <h2 className="text-xl font-bold text-green-700 mb-3 md:mb-4 flex items-center"><span className="mr-2 text-red-500"><FiXCircle/></span>Resumo de Ocorrências Abertas</h2> 
            {occurrenceSummary.length > 0 ? ( 
              <ul className="space-y-2"> 
                {occurrenceSummary.map((item, index) => ( 
                  <li key={index} className="flex justify-between items-center p-2 rounded-md bg-gray-50"> 
                    <span className="text-gray-800 text-sm md:text-base">{item.occurrence_type}</span> 
                    <span className="font-bold text-lg text-red-600">{item.count}</span> 
                  </li> 
                ))} 
              </ul> 
            ) : (<p className="text-gray-600">Nenhuma ocorrência aberta no momento.</p>)} 
          </div> 

          {/* Card de Reservas Pessoais */} 
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200"> 
            <h2 className="text-xl font-bold text-green-700 mb-3 md:mb-4 flex items-center"><span className="mr-2 text-blue-500"><FiCheckCircle/></span>Minhas Próximas Reservas</h2> 
            {reservations.length > 0 ? ( 
              <ul className="space-y-2"> 
                {reservations.map((res, index) => ( 
                  <li key={index} className="flex justify-between items-center p-2 rounded-md bg-gray-50"> 
                    <div>
                      <div className="text-gray-800 font-medium">{res.space_name}</div>
                      <div className="text-sm text-gray-600">{formatDate(res.reservation_date)}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${res.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{res.status}</span> 
                  </li> 
                ))} 
              </ul> 
            ) : (<p className="text-gray-600">Você não possui reservas ativas.</p>)} 
          </div> 

          {/* Card de Visitantes */} 
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200"> 
            <h2 className="text-xl font-bold text-green-700 mb-3 md:mb-4 flex items-center"><span className="mr-2 text-purple-500"><FiSearch/></span>Meus Visitantes Liberados</h2> 
            {visitors.length > 0 ? ( 
              <div className="overflow-x-auto"> 
                <table className="min-w-full"> 
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs md:text-sm">Nome</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs md:text-sm">CPF</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs md:text-sm">Liberado até</th>
                    </tr>
                  </thead> 
                  <tbody> 
                    {visitors.map((vis, index) => ( 
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3 text-gray-800 text-sm">{vis.name}</td>
                        <td className="py-2 px-3 text-gray-700 text-sm">{vis.cpf}</td>
                        <td className="py-2 px-3 text-gray-700 text-sm">{formatDate(vis.release_date)}</td>
                      </tr> 
                    ))} 
                  </tbody> 
                </table> 
              </div> 
            ) : (<p className="text-gray-600">Nenhum visitante liberado por você no momento.</p>)} 
          </div> 
        </div>
        
        {/* Card de Encomendas */} 
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200 mt-6"> 
          <h2 className="text-xl font-bold text-green-700 mb-3 md:mb-4 flex items-center"><span className="mr-2 text-orange-500"><FiPackage/></span>Minhas Encomendas</h2> 
          {minhasEncomendas.length > 0 ? ( 
            <div className="overflow-x-auto"> 
              <table className="min-w-full"> 
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs md:text-sm">Remetente</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs md:text-sm">Destino</th> 
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs md:text-sm">Chegada</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 text-xs md:text-sm">Status</th>
                  </tr>
                </thead> 
                <tbody> 
                  {minhasEncomendas.map((encomenda) => ( 
                    <tr key={encomenda.id} className="border-t hover:bg-gray-50"> 
                      <td className="py-2 px-3 text-gray-800 font-medium text-sm">{encomenda.remetente}</td> 
                      <td className="py-2 px-3 text-gray-700 text-sm">
                        {encomenda.morador_nome} ({encomenda.morador_unidade_tipo === 'apartamento' ? 'Apto' : 'Casa'} {encomenda.morador_unidade_bloco ? `${encomenda.morador_unidade_bloco}-` : ''}{encomenda.morador_unidade_numero})
                      </td> 
                      <td className="py-2 px-3 text-gray-700 text-sm">{formatDate(encomenda.data_chegada)}</td> 
                      <td className="py-2 px-3">
                        <span className={`py-1 px-2 rounded-full text-xs font-semibold ${encomenda.status === 'Na Administração' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {encomenda.status}
                        </span>
                      </td> 
                    </tr> 
                  ))} 
                </tbody> 
              </table> 
            </div> 
          ) : (<p className="text-gray-600">Você não possui encomendas registradas.</p>)} 
        </div> 
      </div> 

      {/* Modal de Detalhes do Dia (Calendário) */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Reservas para {selectedDateReservations[0] ? 
                  formatDate(selectedDateReservations[0].reservation_date) : 
                  ''}
              </h2>
              <button 
                onClick={() => setIsCalendarModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiXCircle className="w-6 h-6" />
              </button>
            </div>
            
            {selectedDateReservations.length > 0 ? (
              <div className="space-y-4">
                {selectedDateReservations.map((res, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800 text-lg">{res.space_name}</h3>
                      <span 
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${res.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {res.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-gray-700">
                      <div className="flex items-center">
                        <FiUser className="mr-2 text-gray-500" />
                        <span>{res.resident_name}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <FiHome className="mr-2 text-gray-500" />
                        <span>
                          {res.unit_type === 'apartamento' ? 'Apartamento' : 'Casa'} 
                          {' '} 
                          {res.block ? `${res.block}-` : ''}{res.unit_number}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FiCalendar className="mx-auto text-gray-400 w-12 h-12 mb-3" />
                <p className="text-gray-600">Nenhuma reserva para esta data</p>
              </div>
            )}
            
            <div className="mt-6">
              <button 
                onClick={() => setIsCalendarModalOpen(false)}
                className="w-full py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </> 
  ); 
}