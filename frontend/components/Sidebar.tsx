'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiUsers, FiAlertTriangle, FiCalendar, FiLogOut, FiHome,
  FiInstagram, FiMessageSquare, FiLock, FiUnlock 
} from 'react-icons/fi';

export default function Sidebar() {
  const router = useRouter();
  
  const [isLocked, setIsLocked] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const isExpanded = isLocked || (!isLocked && isHovering);

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
    <aside 
      className={`sticky top-0 h-screen bg-green-800 text-white flex flex-col p-4 shadow-lg transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-50
        ${isExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => !isLocked && setIsHovering(true)}
      onMouseLeave={() => !isLocked && setIsHovering(false)}
    >
      {/* Cabeçalho */}
      {isExpanded ? (
        <div className="flex items-center justify-between border-b border-green-700 pb-4 mb-10 transition-opacity duration-300">
          <div className="font-bold text-2xl whitespace-nowrap">
            <Link href="/dashboard">Total Ville 1</Link>
          </div>
          <button 
            onClick={() => setIsLocked(!isLocked)} 
            className="p-1 rounded-lg hover:bg-green-700 transition-colors"
            title={isLocked ? "Destravar Barra" : "Travar Barra"}
          >
            {isLocked ? <FiLock size={20} /> : <FiUnlock size={20} />}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center border-b border-green-700 pb-4 mb-10 transition-opacity duration-300">
          <div className="font-bold text-2xl mb-2">TV1</div>
          <button 
            onClick={() => setIsLocked(!isLocked)} 
            className="p-1 rounded-lg hover:bg-green-700 transition-colors"
            title={isLocked ? "Destravar Barra" : "Travar Barra"}
          >
            {isLocked ? <FiLock size={20} /> : <FiUnlock size={20} />}
          </button>
        </div>
      )}

      {/* Navegação Principal */}
      <nav className="flex-grow">
        <ul>
          {navLinks.map((link) => (
            <li key={link.name} className="mb-3 overflow-hidden">
              <Link 
                href={link.href} 
                className={`flex items-center p-3 rounded-lg hover:bg-green-700 transition-all duration-300
                  ${!isExpanded ? 'justify-center' : ''}`}
              >
                <span className="flex-shrink-0">
                  {link.icon}
                </span>
                <span className={`
                  ml-4 font-semibold whitespace-nowrap
                  transition-all duration-300 ease-out
                  ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[-20px] absolute'}
                `}>
                  {link.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Seção de Contato */}
      <div className="border-t border-green-700 pt-4 mb-4">
        <ul>
          {contactLinks.map((link) => (
            <li key={link.name} className="mb-2 overflow-hidden">
              <a 
                href={link.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`flex items-center p-3 rounded-lg hover:bg-green-700 transition-all duration-300
                  ${!isExpanded ? 'justify-center' : ''}`}
              >
                <span className="flex-shrink-0">
                  {link.icon}
                </span>
                <span className={`
                  ml-4 font-semibold whitespace-nowrap
                  transition-all duration-300 ease-out
                  ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[-20px] absolute'}
                `}>
                  {link.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Botão de Sair */}
      <div className="border-t border-green-700 pt-4 overflow-hidden">
        <button 
          onClick={handleLogout} 
          className={`w-full flex items-center p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-all duration-300
            ${!isExpanded ? 'justify-center' : ''}`}
        >
          <span className="flex-shrink-0">
            <FiLogOut size={24} />
          </span>
          <span className={`
            ml-4 font-semibold whitespace-nowrap
            transition-all duration-300 ease-out
            ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[-20px] absolute'}
          `}>
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}