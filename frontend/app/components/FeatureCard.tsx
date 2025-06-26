interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  cardBgColor?: string;
  iconBgColor?: string;
  iconTextColor?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  cardBgColor = "bg-white",
  iconBgColor = "bg-gray-100",
  iconTextColor = "text-gray-800",
}: FeatureCardProps) {
  return (
    <div
      className={`p-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105
        h-full min-h-[280px] flex flex-col justify-between ${cardBgColor}`}
    >
      {/* Ícone */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4 ${iconBgColor} ${iconTextColor}`}
      >
        {icon}
      </div>

      {/* Título */}
      <h3 className="text-xl font-bold mb-2 text-green-900">{title}</h3>

      {/* Descrição */}
      <p className="text-sm text-green-800 flex-grow">{description}</p>
    </div>
  );
}
