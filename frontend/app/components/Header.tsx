// app/components/Header.tsx
'use client';

export default function Header() {
  return (
    <header className="w-full bg-green-800 text-white p-4 flex justify-between items-center shadow-md z-10 relative">
      <div className="text-3xl font-bold tracking-wide">
        Total Ville 1
        {/* Aqui você pode adicionar um ícone de casa, folha ou algo tropical */}
      </div>
      <button className="bg-yellow-300 text-green-900 px-6 py-2 rounded-full font-semibold hover:bg-yellow-400 transition-colors duration-300 transform hover:scale-105 shadow-md">
        Entrar
      </button>
    </header>
  );
}