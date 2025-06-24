// frontend/app/dashboard/reservas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import { FiCopy } from 'react-icons/fi';

// Registra a localidade para o calendário em português
registerLocale('pt-BR', ptBR);

// --- Estruturas de Dados ---
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
  // --- Estados do Componente ---
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

  // Efeito para buscar as datas já reservadas
  useEffect(() => {
    const fetchBookedDates = async () => {
      if (!spaceName) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/reservations/booked-dates?space=${encodeURIComponent(spaceName)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const dates: string[] = await response.json();
        setBookedDates(dates.map(dateStr => new Date(dateStr)));
      } catch (error) { console.error("Erro ao buscar datas reservadas:", error); }
    };
    fetchBookedDates();
  }, [spaceName]);

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setSpaceName(selectedName);
    const selectedSpaceObject = availableSpaces.find(space => space.name === selectedName);
    if (selectedSpaceObject) setSelectedImage(selectedSpaceObject.image);
    setReservationDate(null);
    setTermsAccepted(false);
  };

  // Lógica de submissão que agora gera o PIX e abre o modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationDate || !termsAccepted) {
      setError("Por favor, selecione uma data e aceite os termos de uso.");
      return;
    }
    setLoading(true); setError(null); setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) { setError('Autenticação necessária.'); setLoading(false); return; }
    
    const formattedDate = new Date(Date.UTC(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate())).toISOString().split('T')[0];

    try {
      const response = await fetch('http://127.0.0.1:5000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ space_name: spaceName, reservation_date: formattedDate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao solicitar reserva.');
      
      setPixData(data);
      setIsPaymentModalOpen(true);
      setReservationDate(null);
      setTermsAccepted(false);
      setBookedDates(prev => [...prev, reservationDate]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (pixData) {
      navigator.clipboard.writeText(pixData.qr_code_text);
      alert("Código PIX copiado!");
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
            <select id="space_name" value={spaceName} onChange={handleSpaceChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500">
              {availableSpaces.map(space => <option key={space.name} value={space.name}>{space.name}</option>)}
            </select>
          </div>

          {selectedImage && <div className="mt-4"><p className="text-sm font-medium text-gray-700 mb-2">Visualização do Espaço:</p><div className="relative w-full h-64 rounded-lg overflow-hidden border bg-black/5"><Image src={selectedImage} alt={`Imagem do espaço: ${spaceName}`} layout="fill" objectFit="contain" /></div></div>}
          
          <div>
            <label htmlFor="reservation_date" className="block text-sm font-medium text-gray-700">Data da Reserva</label>
            <DatePicker id="reservation_date" selected={reservationDate} onChange={(date: Date | null) => setReservationDate(date)} excludeDates={bookedDates} minDate={new Date()} dateFormat="dd/MM/yyyy" locale="pt-BR" placeholderText="Selecione uma data" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900" required />
          </div>

          {reservationDate && (
            <div className="space-y-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
              <h3 className="text-md font-bold text-yellow-800">Termos de Uso e Responsabilidade</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                <li>O responsável pela reserva compromete-se a zelar pela limpeza e conservação do espaço.</li>
                <li>É proibido som em volume que perturbe o sossego dos demais moradores.</li>
              </ul>
              <div className="flex items-start">
                <input id="terms" name="terms" type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1" />
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-800">Li e concordo com os termos de uso.</label>
                </div>
              </div>
            </div>
          )}

          <div className="text-right">
            <button type="submit" disabled={isSubmitDisabled} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {loading ? 'Gerando PIX...' : 'Solicitar Reserva e Pagar'}
            </button>
          </div>
        </form>
      </div>

      {isPaymentModalOpen && pixData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pague com PIX para Confirmar</h2>
            <p className="text-gray-600 mb-4">Sua reserva será aprovada automaticamente após o pagamento.</p>
            <div className="flex justify-center my-6">
              <img src={`data:image/png;base64,${pixData.qr_code_image}`} alt="PIX QR Code" className="border-4 border-gray-300 rounded-lg"/>
            </div>
            <label className="text-left block text-sm font-medium text-gray-700">PIX Copia e Cola:</label>
            <div className="flex items-center mt-1">
              <input type="text" value={pixData.qr_code_text} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-600 text-xs"/>
              <button onClick={copyToClipboard} title="Copiar" className="bg-green-600 text-white p-3 rounded-r-md hover:bg-green-700"><FiCopy /></button>
            </div>
            <p className="text-sm text-yellow-600 mt-6 animate-pulse">Aguardando confirmação do pagamento...</p>
            <button onClick={() => setIsPaymentModalOpen(false)} className="mt-6 w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}