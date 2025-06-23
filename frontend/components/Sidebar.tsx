// frontend/components/Sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiUsers, FiAlertTriangle, FiCalendar, FiLogOut, FiHome } from 'react-icons/fi';

export default function Sidebar() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    router.push('/login');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: <FiHome size={24} /> },
    { name: 'Registro de Visitantes', href: '/dashboard/visitantes', icon: <FiUsers size={24} /> },
    { name: 'Registro de Ocorrências', href: '/dashboard/ocorrencias', icon: <FiAlertTriangle size={24} /> },
    { name: 'Reserva de Espaços', href: '/dashboard/reservas', icon: <FiCalendar size={24} /> },
  ];

  return (
    <aside 
      className={`min-h-screen bg-green-800 text-white flex flex-col p-4 shadow-lg relative transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="text-2xl font-bold mb-10 text-center border-b border-green-700 pb-4">
        {isExpanded ? 'Total Ville 1' : 'TV1'}
      </div>

      <nav className="flex-grow">
        <ul>
          {navLinks.map((link) => (
            <li key={link.name} className="mb-3">
              <Link href={link.href} className="flex items-center p-3 rounded-lg hover:bg-green-700 transition-colors duration-200">
                {link.icon}
                {isExpanded && <span className="ml-4 font-semibold">{link.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-green-700 pt-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors duration-200"
        >
          <FiLogOut size={24} />
          {isExpanded && <span className="ml-4 font-semibold">Sair</span>}
        </button>
      </div>
    </aside>
  );
}