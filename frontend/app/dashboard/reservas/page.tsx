// frontend/app/dashboard/reservas/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

// Lista de espaços disponíveis, agora como um array de objetos
const availableSpaces = [
  { name: "Churrasqueira 1 (dentro do gourmet)", image: "/churrasqueira_gourmet.jpeg" },
  { name: "Churrasqueira 2 (ao lado da quadra)", image: "/churrasqueira_quadra.jpeg" },
  { name: "Churrasqueira 3 (final do condomínio)", image: "/churrasqueira_fundo.jpeg" },
  { name: "Salão de Festas", image: "/salao_festa.jpeg" },
  { name: "Sinuca", image: "/sinuca.jpeg" },
];

export default function ReservasPage() {
  const [spaceName, setSpaceName] = useState(availableSpaces[0].name);
  const [reservationDate, setReservationDate] = useState('');
  
  // Estado para controlar a imagem exibida, começando com a primeira da lista
  const [selectedImage, setSelectedImage] = useState(availableSpaces[0].image);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Função atualizada para lidar com a mudança no menu de seleção
  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setSpaceName(selectedName);

    // Encontra o objeto do espaço selecionado para pegar o caminho da imagem
    const selectedSpaceObject = availableSpaces.find(space => space.name === selectedName);
    if (selectedSpaceObject) {
      setSelectedImage(selectedSpaceObject.image);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) { setError('Autenticação necessária.'); setLoading(false); return; }
    try {
      const response = await fetch('http://127.0.0.1:5000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ space_name: spaceName, reservation_date: reservationDate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao solicitar reserva.');
      setSuccess('Sua solicitação de reserva foi enviada com sucesso!');
      setReservationDate('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
            {availableSpaces.map(space => <option key={space.name} value={space.name}>{space.name}</option>)}
          </select>
        </div>

        {/* Bloco que exibe a imagem dinamicamente */}
        {selectedImage && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Visualização do Espaço:</p>
            <div className="relative w-full h-64 rounded-lg overflow-hidden border bg-black/5">
                <Image
                    src={selectedImage}
                    alt={`Imagem do espaço: ${spaceName}`}
                    layout="fill"
                    objectFit="contain" // A MUDANÇA PRINCIPAL ESTÁ AQUI
                    className="transition-transform duration-300 hover:scale-105"
                />
            </div>
          </div>
        )}
        
        <div>
          <label htmlFor="reservation_date" className="block text-sm font-medium text-gray-700">Data da Reserva</label>
          <input 
            type="date" 
            id="reservation_date" 
            value={reservationDate} 
            onChange={(e) => setReservationDate(e.target.value)} 
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"
          />
        </div>

        <div className="text-right">
          <button 
            type="submit" 
            disabled={loading} 
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Solicitando...' : 'Solicitar Reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}