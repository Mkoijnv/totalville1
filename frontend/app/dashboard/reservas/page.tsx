'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import { FiCopy } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

// Garante que a tradução para português seja registrada
try {
  registerLocale('pt-BR', ptBR);
} catch (error) {
  console.error("Locale 'pt-BR' pode já ter sido registrada.", error);
}

const availableSpaces = [
  { name: "Churrasqueira 1 (dentro do gourmet)", image: "/churrasqueira_gourmet.jpeg" },
  { name: "Churrasqueira 2 (ao lado da quadra)", image: "/churrasqueira_quadra.jpeg" },
  { name: "Churrasqueira 3 (final do condomínio)", image: "/churrasqueira_fundo.jpeg" },
  { name: "Salão de Festas", image: "/salao_festa.jpeg" },
  { name: "Sinuca", image: "/sinuca.jpeg" },
];

interface PixData {
  qr_code_image: string;
  qr_code_text: string;
}

export default function ReservasPage() {
  const router = useRouter();
  const [spaceName, setSpaceName] = useState(availableSpaces[0].name);
  const [reservationDate, setReservationDate] = useState<Date | null>(null);
  const [selectedImage, setSelectedImage] = useState(availableSpaces[0].image);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookedDates = async () => {
      if (!spaceName) return;
      const token = localStorage.getItem('token'); // Usa a chave 'token' consistentemente
      if (!token) {
        // Se não houver token, define um erro e não tenta buscar as datas
        setError("Autenticação não encontrada para carregar datas reservadas. Faça login novamente.");
        return;
      }
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/reservations/booked-dates?space=${encodeURIComponent(spaceName)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          // Tenta ler a mensagem de erro do backend se a resposta não for OK
          const errorData = await response.json();
          throw new Error(errorData.error || "Falha ao carregar datas reservadas.");
        }
        const datesAsStrings = await response.json();
        
        if (Array.isArray(datesAsStrings)) {
          const validDates = datesAsStrings.map(dateStr => {
            // Assume que a data vem no formato 'YYYY-MM-DD' do backend
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day); // month - 1 porque o mês em JS é base 0
          });
          setBookedDates(validDates);
        } else {
          setBookedDates([]); // Garante que bookedDates seja um array vazio se o backend não retornar um array
        }
      } catch (error: any) {
        console.error("Erro ao buscar datas reservadas:", error);
        setError(error.message || "Não foi possível carregar o calendário de datas.");
      }
    };
    fetchBookedDates();
  }, [spaceName]); // spaceName como dependência para recarregar datas ao mudar o espaço

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setSpaceName(selectedName);
    const selectedSpaceObject = availableSpaces.find(space => space.name === selectedName);
    if (selectedSpaceObject) setSelectedImage(selectedSpaceObject.image);
    setReservationDate(null); // Limpa a data selecionada ao mudar o espaço
    setTermsAccepted(false); // Desseleciona os termos
    setError(null); // Limpa erros
    setSuccess(null); // Limpa sucessos
  };

  const handleDateChange = (date: Date | null) => {
    setReservationDate(date);
    if (!date) {
      setTermsAccepted(false); // Desseleciona os termos se a data for limpa
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationDate || !termsAccepted) {
      setError("Por favor, selecione uma data e aceite os termos de uso.");
      return;
    }
    setLoading(true); 
    setError(null); 
    setSuccess(null);
    
    const token = localStorage.getItem('token'); // Usa a chave 'token' consistentemente
    if (!token) { 
      setError('Autenticação necessária. Faça login novamente.'); 
      setLoading(false); 
      return; 
    }
    
    // Formata a data para 'YYYY-MM-DD' para enviar ao backend
    const formattedDate = new Date(Date.UTC(
      reservationDate.getFullYear(), 
      reservationDate.getMonth(), 
      reservationDate.getDate()
    )).toISOString().split('T')[0];

    try {
      // CORREÇÃO: Altera a URL para o endpoint correto do backend: /api/reservas
      const response = await fetch('http://127.0.0.1:5000/api/reservas', { // <-- Endpoint corrigido
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          space_name: spaceName, 
          reservation_date: formattedDate 
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        // Lança um erro com a mensagem do backend para exibir ao usuário
        throw new Error(data.error || 'Falha ao solicitar reserva.');
      }
      
      // Se a reserva for bem-sucedida, exibe o PIX
      setPixData(data);
      setIsPaymentModalOpen(true);
      setSuccess('Reserva solicitada! Por favor, realize o pagamento via PIX.');
      
      // Resetar o formulário após a reserva
      setReservationDate(null);
      setTermsAccepted(false);
      
      // Atualiza a lista de datas reservadas para incluir a nova reserva imediatamente no frontend
      // Isso é otimista e pode ser refinado com uma nova chamada fetchBookedDates se preferir
      setBookedDates(prev => [...prev, new Date(formattedDate)]); 
      
    } catch (err: any) {
      setError(err.message);
      // Se for um erro do backend que já indicava status (ex: 409 Conflito), o alert não deve ser usado.
      // alert(`Erro: ${err.message}`); // Removido alert(), use o estado 'error' para feedback visual.
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    if (pixData) {
      // Usar execCommand é mais compatível em ambientes de iframe (como o Canvas)
      const el = document.createElement('textarea');
      el.value = pixData.qr_code_text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setSuccess("Código PIX copiado!"); // Mensagem de sucesso para feedback
    }
  };

  const isSubmitDisabled = loading || !reservationDate || !termsAccepted;

  return (
    <>
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-green-800 mb-6">Reserva de Espaços Comuns</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="space_name" className="block text-sm font-medium text-gray-700">Espaço Desejado</label>
            <select 
              id="space_name" 
              value={spaceName} 
              onChange={handleSpaceChange} 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              {availableSpaces.map(space => (
                <option key={space.name} value={space.name}>{space.name}</option>
              ))}
            </select>
          </div>

          {selectedImage && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Visualização do Espaço:</p>
              <div className="relative w-full h-64 rounded-lg overflow-hidden border bg-black/5">
                <Image 
                  src={selectedImage} 
                  alt={`Imagem do espaço: ${spaceName}`} 
                  layout="fill" 
                  objectFit="contain" 
                  // Adicionado onError para lidar com imagens que não carregam
                  onError={(e) => { 
                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/CCCCCC/FFFFFF?text=Imagem+Nao+Disponivel'; 
                  }}
                />
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="reservation_date" className="block text-sm font-medium text-gray-700">Data da Reserva</label>
            <DatePicker 
              id="reservation_date" 
              selected={reservationDate} 
              onChange={handleDateChange} 
              excludeDates={bookedDates} 
              minDate={new Date()} 
              dateFormat="dd/MM/yyyy" 
              locale="pt-BR" 
              placeholderText="Selecione uma data" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900" 
              required 
            />
          </div>

          {reservationDate && (
            <div className="space-y-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
              <h3 className="text-md font-bold text-yellow-800">Termos de Uso e Responsabilidade</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700">
                <li>O responsável pela reserva compromete-se a zelar pela <strong>limpeza e conservação</strong> do espaço, entregando-o nas mesmas condições em que foi recebido.</li>
                <li>É estritamente proibido som em volume que perturbe o <strong>sossego dos demais moradores</strong>, especialmente após as 22h, conforme regimento interno.</li>
                <li>Qualquer <strong>dano causado</strong> ao patrimônio do condomínio (mesas, cadeiras, equipamentos, etc.) durante o uso será de total responsabilidade do morador titular da reserva.</li>
                <li>O morador é responsável por todos os seus convidados e por garantir que as regras do condomínio sejam respeitadas por todos.</li>
              </ul>
              <div className="flex items-start pt-2">
                <input 
                  id="terms" 
                  name="terms" 
                  type="checkbox" 
                  checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)} 
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1" 
                />
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-800">Li e concordo com os termos de uso.</label>
                </div>
              </div>
            </div>
          )}

          <div className="text-right">
            <button 
              type="submit" 
              disabled={isSubmitDisabled} 
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Gerando PIX...' : 'Solicitar Reserva e Pagar'}
            </button>
          </div>
        </form>
      </div>

      {isPaymentModalOpen && pixData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento via PIX</h2>
            <p className="text-gray-600 mb-4">Sua reserva será aprovada automaticamente após a confirmação do pagamento.</p>
            
            <div className="flex justify-center my-6">
              <img 
                src={`data:image/png;base64,${pixData.qr_code_image}`} 
                alt="PIX QR Code" 
                className="border-4 border-gray-300 rounded-lg w-64 h-64 object-contain"
                // Fallback para imagem caso o QR Code não carregue
                onError={(e) => { 
                    (e.target as HTMLImageElement).src = 'https://placehold.co/256x256/E0E0E0/808080?text=QR+Code+Indisponível'; 
                }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 text-left">PIX Copia e Cola:</label>
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={pixData.qr_code_text} 
                  readOnly 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-600 text-xs font-mono"
                />
                <button 
                  onClick={copyToClipboard} 
                  title="Copiar código PIX"
                  className="bg-green-600 text-white p-2.5 rounded-r-lg hover:bg-green-700"
                >
                  <FiCopy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Após o pagamento, você pode fechar esta janela. O status da sua reserva será atualizado.
            </p>
            
            <button 
              onClick={() => {
                setIsPaymentModalOpen(false);
                router.push('/dashboard'); // Redireciona para o dashboard após fechar o modal
              }} 
              className="mt-6 w-full py-2.5 px-4 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              Ir para o Inicio
            </button>
          </div>
        </div>
      )}
    </>
  );
}
