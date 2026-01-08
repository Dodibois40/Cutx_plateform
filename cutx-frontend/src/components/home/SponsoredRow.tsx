'use client';

import { useTranslations } from 'next-intl';
import ProductCard from './ProductCard';
import type { SearchProduct } from './types';

interface SponsoredRowProps {
  products: SearchProduct[];
  onProductClick: (product: SearchProduct) => void;
}

export default function SponsoredRow({ products, onProductClick }: SponsoredRowProps) {
  const t = useTranslations('home');

  if (!products || products.length === 0) return null;

  return (
    <div className="w-full mb-6">
      {/* Sponsored label */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-[var(--cx-text-muted)] uppercase tracking-wider">
          {t('sponsored')}
        </span>
        <div className="flex-1 h-px bg-[var(--cx-border)]" />
      </div>

      {/* Sponsored products grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {products.slice(0, 4).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={onProductClick}
            isSponsored
          />
        ))}
      </div>
    </div>
  );
}
