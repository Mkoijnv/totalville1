// app/page.tsx
'use client'; // MANTENHA ESTA LINHA NO TOPO!

import Link from 'next/link'; // Importa Link para navegação
import Header from './components/Header';
import FeatureCard from './components/FeatureCard';

// Exporta metadados para SEO no App Router
// NOTA: Conforme o erro anterior, este bloco não pode estar aqui se 'use client' estiver no topo.
// Se você quiser SEO, ele deve ser movido para app/layout.tsx ou app/template.tsx
// ou remova 'use client' e use Server Components, o que é mais complexo para interatividade.
// Por simplicidade para este projeto, vamos focar na funcionalidade cliente.
// O título da aba do navegador virá de <title> no Head, se presente, ou do layout.
/*
export const metadata = {
  title: 'Total Ville 1 Online - Seu Condomínio Conectado',
  description: 'Plataforma exclusiva para moradores do Condomínio Total Ville 1: acesse boletos, acompanhe encomendas e receba avisos importantes.',
};
*/

export default function Home() {
  return (
    <>
      {/* Adicionado o título para a aba do navegador diretamente aqui para funcionar com 'use client' */}
      <head>
        <title>Total Ville 1 Online - Seu Condomínio Conectado</title>
        <meta name="description" content="Plataforma exclusiva para moradores do Condomínio Total Ville 1: acesse boletos, acompanhe encomendas e receba avisos importantes." />
        <link rel="icon" href="/favicon.ico" />
      </head>


      {/* Container principal com um fundo sutil que remete ao verde claro/areia */}
      <div className="min-h-screen bg-lime-50 flex flex-col">

        {/* 1. Header (Cabeçalho) */}
        <Header />

        {/* 2. Hero Section (Seção Principal de Destaque) */}
        {/* Gradiente verde mais vivo para o destaque */}
        <section className="flex flex-col items-center justify-center text-center py-20 px-4 bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight animate-fadeInUp">
            Total Ville 1:<br className="hidden sm:inline"/> Sua Vida no Paraíso, Simplificada.
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl animate-fadeInUp delay-200">
            Acesse seus boletos, acompanhe suas encomendas e receba avisos importantes. Tudo para a sua comodidade e segurança no condomínio.
          </p>
          <Link
            href="/login" // Link para a página de login
            className="bg-yellow-300 text-green-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-yellow-400 transition-transform transform hover:scale-105 shadow-xl animate-fadeInUp delay-400 inline-block"
          >
            Acessar Área do Morador
          </Link>
        </section>

        {/* 3. Seções de Destaque (Boletos, Encomendas, Avisos) */}
        {/* Fundo branco para os cards, com títulos em verde escuro */}
        <section className="py-16 px-4 bg-white">
          <h2 className="text-4xl font-bold text-center text-green-800 mb-12">
            Facilidades Exclusivas para Moradores Total Ville 1
          </h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="📄" // Ícone de documento/boleto
              title="Boletos Digitais"
              description="Acesse seus boletos mensais do Total Ville 1 a qualquer hora, em qualquer lugar, de forma 100% digital e segura."
              cardBgColor="bg-emerald-50" // Cor de fundo do card específica
              iconBgColor="bg-emerald-100" // Cor de fundo do círculo do ícone
              iconTextColor="text-emerald-700" // Cor do texto do ícone
            />
            <FeatureCard
              icon="📦" // Ícone de caixa/pacote
              title="Acompanhe Suas Encomendas"
              description="Receba notificações instantâneas sobre a chegada de suas entregas na portaria do Total Ville 1."
              cardBgColor="bg-lime-50"
              iconBgColor="bg-lime-100"
              iconTextColor="text-lime-700"
            />
            <FeatureCard
              icon="📢" // Ícone de megafone/aviso
              title="Avisos e Comunicados"
              description="Mantenha-se informado sobre manutenções, eventos e comunicados importantes do seu condomínio Total Ville 1."
              cardBgColor="bg-green-50"
              iconBgColor="bg-green-100"
              iconTextColor="text-green-700"
            />
          </div>
        </section>

        {/* 4. Footer (Rodapé) */}
        {/* Fundo verde escuro para o rodapé */}
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