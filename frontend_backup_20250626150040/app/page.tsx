'use client';

import Link from 'next/link';
import Header from './components/Header';
import FeatureCard from './components/FeatureCard';
import { useEffect, useState } from 'react';
import Image from 'next/image'; // Importar o componente Image do Next.js

export default function Home() {
  const [inflatingCard, setInflatingCard] = useState(0);
  const [isInflating, setIsInflating] = useState(true);

  const cards = [
    {
      icon: "🏠",
      title: "Reservar Espaços",
      description: "Agende churrasqueiras, salão de festas e outros espaços comuns do condomínio.",
      cardBgColor: "bg-emerald-50",
      iconBgColor: "bg-emerald-100",
      iconTextColor: "text-emerald-700"
    },
    {
      icon: "👥",
      title: "Liberar Visitantes",
      description: "Cadastre e autorize a entrada de visitantes no condomínio com antecedência.",
      cardBgColor: "bg-lime-50",
      iconBgColor: "bg-lime-100",
      iconTextColor: "text-lime-700"
    },
    {
      icon: "📢",
      title: "Avisos e Comunicados",
      description: "Mantenha-se informado sobre eventos e comunicados importantes.",
      cardBgColor: "bg-green-50",
      iconBgColor: "bg-green-100",
      iconTextColor: "text-green-700"
    },
    {
      icon: "📦",
      title: "Acompanhe Encomendas",
      description: "Receba notificações sobre a chegada de suas entregas na portaria.",
      cardBgColor: "bg-amber-50",
      iconBgColor: "bg-amber-100",
      iconTextColor: "text-amber-700"
    },
  ];

  useEffect(() => {
    const cycle = () => {
      // Fase de inflar (1.5s)
      setIsInflating(true);
      
      // Depois de 1.5s, começa a desinflar
      setTimeout(() => {
        setIsInflating(false);
        
        // Depois de mais 1.5s, muda para o próximo card
        setTimeout(() => {
          setInflatingCard((prev) => (prev + 1) % cards.length);
        }, 1500);
      }, 1500);
    };

    const interval = setInterval(cycle, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <head>
        <title>Total Ville 1 Online - Seu Condomínio Conectado</title>
        <meta name="description" content="Plataforma exclusiva para moradores do Condomínio Total Ville 1: reserve espaços, libere visitantes e receba avisos importantes." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='green'><path d='M12 2L3 9v12h18V9L12 2zm0 2.691l7 5.25v9.059h-14V7.941l7-5.25zM15 16h-2v-4h-2v4H9v-6h6v6z'/></svg>" type="image/svg+xml" />
      </head>

      <div className="min-h-screen bg-lime-50 flex flex-col">
        <Header />

        <section className="flex flex-col items-center justify-center text-center py-20 px-4 bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight animate-fadeInUp">
            Total Ville 1:<br className="hidden sm:inline"/> Sua Vida no Paraíso, Simplificada.
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl animate-fadeInUp delay-200">
            Reserve espaços, libere visitantes, acompanhe encomendas e receba avisos importantes.
          </p>
          <Link
            href="/login"
            className="bg-yellow-300 text-green-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-yellow-400 transition-transform transform hover:scale-105 shadow-xl animate-fadeInUp delay-400 inline-block"
          >
            Acessar Área do Morador
          </Link>
        </section>

        <section className="py-16 px-4 bg-white">
          <h2 className="text-4xl font-bold text-center text-green-800 mb-12">
            Facilidades Exclusivas para Moradores Total Ville 1
          </h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
              <div 
                key={index}
                onMouseEnter={() => {
                  setInflatingCard(index);
                  setIsInflating(true);
                }}
                className="relative"
              >
                <FeatureCard
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                  cardBgColor={card.cardBgColor}
                  iconBgColor={card.iconBgColor}
                  iconTextColor={card.iconTextColor}
                />
              </div>
            ))}
          </div>
        </section>

        {/* --- NOVA SEÇÃO PARA O MAPA DO CONDOMÍNIO --- */}
        <section className="py-8 px-4 bg-lime-50">
          <h2 className="text-2xl font-bold text-center text-green-800 mb-6">
            Explore o Condomínio
          </h2>
          <div className="max-w-4xl mx-auto shadow-lg rounded-lg overflow-hidden border border-gray-200">
            {/* O componente Image do Next.js é usado para otimização */}
            <Image
              src="/Mapa condominio.jpg" // Caminho da imagem na pasta public
              alt="Mapa detalhado do Condomínio Total Ville 1, mostrando a disposição das áreas e casas."
              layout="responsive" // Torna a imagem responsiva
              width={1200} // Largura original da imagem (aproximada para otimização)
              height={675} // Altura original da imagem (aproximada para otimização)
              objectFit="contain" // Garante que a imagem se ajuste sem cortar, mantendo a proporção
              className="w-full h-auto" // Tailwind para largura total e altura automática
            />
          </div>
          <p className="text-center text-gray-600 mt-4 text-sm">
            Visualize a disposição das casas, blocos e áreas comuns do nosso condomínio para facilitar sua navegação.
          </p>
        </section>
        {/* --- FIM DA NOVA SEÇÃO --- */}

        <footer className="w-full bg-green-900 text-white p-6 text-center text-sm mt-auto shadow-inner">
          <p>&copy; {new Date().getFullYear()} Total Ville 1 Online. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:underline hover:text-emerald-200 transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:underline hover:text-emerald-200 transition-colors">Termos de Uso</a>
          </div>
        </footer>
      </div>
    </>
  );
}
