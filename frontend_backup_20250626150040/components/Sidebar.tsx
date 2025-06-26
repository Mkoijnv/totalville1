'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiUsers, FiAlertTriangle, FiCalendar, FiLogOut, FiHome,
  FiInstagram, FiMessageSquare, FiLock, FiUnlock, FiUserPlus, FiPackage, FiBell // Adicionado FiBell para Avisos
} from 'react-icons/fi'; // Certifique-se de que FiBell está importado

export default function Sidebar() {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null); // Novo estado para o papel do usuário

  // Simula carregamento e busca o papel do usuário
  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('http://127.0.0.1:5000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role); // Define o papel do usuário
          } else {
            // Se o token for inválido/expirado, ou não autorizado, limpa e redireciona
            console.error('Falha ao buscar dados do usuário:', response.status);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/login');
          }
        } catch (error) {
          console.error('Erro de rede ao buscar dados do usuário:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
        }
      } else {
        router.push('/login'); // Redireciona se não houver token
      }
      setLoading(false); // Termina o carregamento
    };

    fetchUserRole();
  }, [router]);

  const isExpanded = isLocked || (!isLocked && isHovering);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Define os links de navegação com base no papel do usuário
  const getNavLinks = () => {
    const commonLinks = [
      { name: 'Início', href: '/dashboard', icon: <FiHome size={24} /> },
      { name: 'Visitantes', href: '/dashboard/visitantes', icon: <FiUsers size={24} /> },
      { name: 'Ocorrências', href: '/dashboard/ocorrencias', icon: <FiAlertTriangle size={24} /> },
      { name: 'Reservas', href: '/dashboard/reservas', icon: <FiCalendar size={24} /> },
    ];

    if (userRole === 'ADMIN') {
      return [
        ...commonLinks,
        { name: 'Encomendas', href: '/dashboard/encomendas', icon: <FiPackage size={24} /> },
        { name: 'Moradores', href: '/dashboard/moradores', icon: <FiUserPlus size={24} /> },
        { name: 'Avisos', href: '/dashboard/avisos/novo', icon: <FiBell size={24} /> } // Rota e ícone ajustados
      ];
    } else if (userRole === 'PORTARIA') {
        return [
            ...commonLinks,
            { name: 'Encomendas', href: '/dashboard/encomendas', icon: <FiPackage size={24} /> },
            { name: 'Avisos', href: '/dashboard/avisos', icon: <FiBell size={24} /> }
        ];
    }
    // Para moradores ou outros, retorna apenas os links comuns
    return commonLinks;
  };

  const contactLinks = [
    { name: 'Portaria', href: 'https://wa.me/556992811832', icon: <FiMessageSquare size={24} /> },
    { name: 'Administração', href: 'https://wa.me/556993989491', icon: <FiMessageSquare size={24} /> },
    { name: 'Instagram', href: 'https://www.instagram.com/condominiototalville1/', icon: <FiInstagram size={24} /> },
  ];

  if (loading) {
    return (
      <div className="sticky top-0 h-screen bg-green-800 text-white flex flex-col p-4 w-20 items-center justify-center">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  const navLinksToRender = getNavLinks();

  return (
    <aside
      className={`sticky top-0 h-screen bg-green-800 text-white flex flex-col p-4 shadow-lg transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] z-50
        ${isExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => !isLocked && setIsHovering(true)}
      onMouseLeave={() => !isLocked && setIsHovering(false)}
    >
      {/* Cabeçalho */}
      {isExpanded ? (
        <div className="flex items-center justify-between border-b border-green-700 pb-4 mb-6">
          <div className="font-bold text-xl whitespace-nowrap">
            <Link href="/dashboard">Total Ville 1</Link>
          </div>
          <button
            onClick={() => setIsLocked(!isLocked)}
            className="p-1 rounded-lg hover:bg-green-700 transition-colors"
            title={isLocked ? "Destravar" : "Travar"}
          >
            {isLocked ? <FiLock size={18} /> : <FiUnlock size={18} />}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center border-b border-green-700 pb-4 mb-6">
          <div className="font-bold text-xl mb-2">TV1</div>
          <button
            onClick={() => setIsLocked(!isLocked)}
            className="p-1 rounded-lg hover:bg-green-700 transition-colors"
            title={isLocked ? "Destravar" : "Travar"}
          >
            {isLocked ? <FiLock size={18} /> : <FiUnlock size={18} />}
          </button>
        </div>
      )}

      {/* Navegação Principal */}
      <nav className="flex-grow">
        <ul className="space-y-2">
          {navLinksToRender.map((link) => (
            <li key={link.name}>
              <Link
                href={link.href}
                className={`flex items-center p-3 rounded-lg hover:bg-green-700 transition-all
                  ${!isExpanded ? 'justify-center' : ''}`}
              >
                <span className="flex-shrink-0">{link.icon}</span>
                <span className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 absolute'}`}>
                  {link.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Seção de Contato */}
      <div className="border-t border-green-700 pt-4 mb-4">
        <ul className="space-y-2">
          {contactLinks.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center p-3 rounded-lg hover:bg-green-700 transition-all
                  ${!isExpanded ? 'justify-center' : ''}`}
              >
                <span className="flex-shrink-0">{link.icon}</span>
                <span className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 absolute'}`}>
                  {link.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Botão de Sair */}
      <div className="border-t border-green-700 pt-4">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-all
            ${!isExpanded ? 'justify-center' : ''}`}
        >
          <FiLogOut size={20} />
          <span className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 absolute'}`}>
            Sair
          </span>
        </button>
      </div>
    </aside>
  );
}