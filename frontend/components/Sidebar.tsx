// frontend/components/Sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiUsers, FiAlertTriangle, FiCalendar, FiLogOut, FiHome,
  FiInstagram, FiMessageSquare, FiChevronsLeft, FiChevronsRight 
} from 'react-icons/fi';

export default function Sidebar() {
  const router = useRouter();
  
  // 1. Agora temos dois estados para controlar a lógica
  const [isPinned, setIsPinned] = useState(true); // Controla se a sidebar está FIXA no modo expandido
  const [isHovering, setIsHovering] = useState(false); // Controla se o MOUSE está em cima

  // A sidebar é considerada expandida se estiver fixada OU se o mouse estiver sobre ela.
  const isExpanded = isPinned || isHovering;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    router.push('/login');
  };

  const navLinks = [
    { name: 'Inicio', href: '/dashboard', icon: <FiHome size={24} /> },
    { name: 'Registro de Visitantes', href: '/dashboard/visitantes', icon: <FiUsers size={24} /> },
    { name: 'Registro de Ocorrências', href: '/dashboard/ocorrencias', icon: <FiAlertTriangle size={24} /> },
    { name: 'Reserva de Espaços', href: '/dashboard/reservas', icon: <FiCalendar size={24} /> },
  ];

  const contactLinks = [
    { name: 'Portaria (WhatsApp)', href: 'https://wa.me/556992811832', icon: <FiMessageSquare size={24} /> },
    { name: 'Administração (WhatsApp)', href: 'https://wa.me/556993989491', icon: <FiMessageSquare size={24} /> },
    { name: 'Nosso Instagram', href: 'https://www.instagram.com/condominiototalville1/', icon: <FiInstagram size={24} /> },
  ];

  return (
    // 2. Adicionamos os eventos de mouse de volta
    <aside 
      className={`sticky top-0 h-screen bg-green-800 text-white flex flex-col p-4 shadow-lg transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* --- CABEÇALHO COM O BOTÃO SEMPRE VISÍVEL --- */}
      <div className="flex items-center justify-between border-b border-green-700 pb-4 mb-10">
        <div className="font-bold text-2xl">
          {isExpanded ? (
            <Link href="/dashboard">Total Ville 1</Link>
          ) : (
            // A sigla TV1 aparece quando a sidebar está recuada
            <span>TV1</span>
          )}
        </div>
        
        {/* 3. O botão para fixar/liberar está sempre visível */}
        <button 
          onClick={() => setIsPinned(!isPinned)} 
          className="p-1 rounded-lg hover:bg-green-700"
          title={isPinned ? "Recolher Barra" : "Fixar Barra"}
        >
          {/* O ícone muda dependendo se está fixo ou não */}
          {isPinned ? <FiChevronsLeft size={24} /> : <FiChevronsRight size={24} />}
        </button>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-grow">
        <ul>
          {navLinks.map((link) => (
            <li key={link.name} className="mb-3">
              <Link href={link.href} className="flex items-center p-3 rounded-lg hover:bg-green-700">
                {link.icon}
                {isExpanded && <span className="ml-4 font-semibold">{link.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Seção de Contato */}
      <div className="border-t border-green-700 pt-4 mb-4">
        <ul>
          {contactLinks.map((link) => (
            <li key={link.name} className="mb-2">
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 rounded-lg hover:bg-green-700">
                {link.icon}
                {isExpanded && <span className="ml-4 font-semibold">{link.name}</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Seção de Logout */}
      <div className="border-t border-green-700 pt-4">
        <button onClick={handleLogout} className="w-full flex items-center justify-center p-3 rounded-lg bg-red-600 hover:bg-red-700">
          <FiLogOut size={24} />
          {isExpanded && <span className="ml-4 font-semibold">Sair</span>}
        </button>
      </div>
    </aside>
  );
}