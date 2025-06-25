// frontend/app/dashboard/ocorrencias/page.tsx
'use client';

import { useState } from 'react';

const occurrenceTypes = [
  "Barulho excessivo",
  "Uso indevido de área comum",
  "Problema de segurança",
  "Manutenção necessária",
  "Vazamento ou infiltração",
  "Outro",
];

export default function OcorrenciasPage() {
  const [occurrenceType, setOccurrenceType] = useState(occurrenceTypes[0]);
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    const token = localStorage.getItem('token');
    if (!token) { setError('Autenticação necessária.'); setLoading(false); return; }
    const payload = { occurrence_type: occurrenceType, custom_type: customType, description, location, occurrence_date: occurrenceDate };
    try {
      const response = await fetch('http://127.0.0.1:5000/api/ocorrencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao registrar.');
      setSuccess('Ocorrência registrada com sucesso!');
      setOccurrenceType(occurrenceTypes[0]); setCustomType(''); setDescription(''); setLocation(''); setOccurrenceDate('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
      <h1 className="text-2xl font-bold text-green-800 mb-6">Registro de Ocorrências</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{success}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="occurrence_type" className="block text-sm font-medium text-gray-700">Tipo de Ocorrência</label>
          <select id="occurrence_type" value={occurrenceType} onChange={(e) => setOccurrenceType(e.target.value)}
            // CORREÇÃO APLICADA AQUI
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500">
            {occurrenceTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        {occurrenceType === 'Outro' && (
          <div>
            <label htmlFor="custom_type" className="block text-sm font-medium text-gray-700">Especifique o tipo</label>
            <input type="text" id="custom_type" value={customType} onChange={(e) => setCustomType(e.target.value)} required
              // CORREÇÃO APLICADA AQUI
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"/>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Local da Ocorrência</label>
            <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Corredor do Bloco B"
              // CORREÇÃO APLICADA AQUI
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"/>
          </div>
          <div>
            <label htmlFor="occurrence_date" className="block text-sm font-medium text-gray-700">Data e Hora da Ocorrência</label>
            <input type="datetime-local" id="occurrence_date" value={occurrenceDate} onChange={(e) => setOccurrenceDate(e.target.value)} required
              // CORREÇÃO APLICADA AQUI
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"/>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrição Detalhada</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4}
            // CORREÇÃO APLICADA AQUI
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900"/>
        </div>

        <div className="text-right">
          <button type="submit" disabled={loading} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
            {loading ? 'Registrando...' : 'Registrar Ocorrência'}
          </button>
        </div>
      </form>
    </div>
  );
}