import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Color = 'green' | 'blue' | 'yellow' | 'red' | 'indigo' | 'purple' | 'orange';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color: Color;
  trend?: { value: number; label: string };
}

const COLOR_MAP: Record<Color, { bg: string; iconBg: string; iconText: string; trendUp: string; trendDown: string }> = {
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-500',
    iconText: 'text-white',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-500',
    iconText: 'text-white',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
  yellow: {
    bg: 'bg-yellow-50',
    iconBg: 'bg-yellow-500',
    iconText: 'text-white',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-500',
    iconText: 'text-white',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
  indigo: {
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-600',
    iconText: 'text-white',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-600',
    iconText: 'text-white',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
  orange: {
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-500',
    iconText: 'text-white',
    trendUp: 'text-green-600',
    trendDown: 'text-red-500',
  },
};

export default function StatsCard({ title, value, subtitle, icon, color, trend }: StatsCardProps) {
  const c = COLOR_MAP[color];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>}

          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend.value > 0 ? c.trendUp : trend.value < 0 ? c.trendDown : 'text-gray-400'
              }`}
            >
              {trend.value > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              <span>
                {trend.value > 0 ? '+' : ''}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>

        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${c.iconBg} ${c.iconText} ml-4`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
