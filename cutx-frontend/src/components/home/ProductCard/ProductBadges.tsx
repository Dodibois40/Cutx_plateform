import { Package } from 'lucide-react';

interface TypeBadgeProps {
  config: { label: string; color: string } | null;
  size?: 'sm' | 'md' | 'lg';
}

export function TypeBadge({ config, size = 'md' }: TypeBadgeProps) {
  if (!config) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`${sizeClasses[size]} font-semibold border rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

interface SupplierBadgeProps {
  config: { letter: string; color: string; title: string } | null;
  size?: 'sm' | 'md' | 'lg';
}

export function SupplierBadge({ config, size = 'md' }: SupplierBadgeProps) {
  if (!config) return null;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-5 h-5 text-[10px]',
    lg: 'w-7 h-7 text-xs',
  };

  return (
    <span
      className={`${sizeClasses[size]} flex items-center justify-center font-bold border rounded ${config.color}`}
      title={config.title}
    >
      {config.letter}
    </span>
  );
}

interface StockBadgeProps {
  isInStock: boolean;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StockBadge({ isInStock, label, size = 'md', showLabel = true }: StockBadgeProps) {
  const color = isInStock ? 'text-emerald-500' : 'text-amber-500';

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className="flex items-center gap-1.5">
      <Package className={`${iconSizes[size]} ${color}`} />
      {showLabel && (
        <span className={`${textSizes[size]} font-medium ${color}`}>{label}</span>
      )}
    </div>
  );
}
