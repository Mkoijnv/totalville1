// app/components/FeatureCard.tsx
'use client';

interface FeatureCardProps {
  icon: string; // Para um emoji ou um path para SVG/Image
  title: string;
  description: string;
  cardBgColor: string;    // Nova: cor de fundo do card
  iconBgColor: string;    // Nova: cor de fundo do círculo do ícone
  iconTextColor: string;  // Nova: cor do texto/emoji do ícone
}

export default function FeatureCard({ icon, title, description, cardBgColor, iconBgColor, iconTextColor }: FeatureCardProps) {
  return (
    <div className={`${cardBgColor} rounded-lg shadow-lg p-8 text-center border border-gray-100 transition-transform transform hover:scale-105 hover:shadow-xl duration-300`}>
      {/* Círculo do ícone com cores dinâmicas */}
      <div className={`text-6xl mb-6 flex justify-center items-center h-20 w-20 mx-auto rounded-full ${iconBgColor} ${iconTextColor}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-green-800 mb-3">{title}</h3>
      <p className="text-gray-700 leading-relaxed">{description}</p>
    </div>
  );
}