'use client';

import type { SearchProduct } from '../types';
import type { ViewMode } from '../SearchResults';
import ProductCardList from './ProductCardList';
import ProductCardDetail from './ProductCardDetail';
import ProductCardGrid from './ProductCardGrid';

interface ProductCardProps {
  product: SearchProduct;
  onClick: (product: SearchProduct) => void;
  onViewDetails?: (productId: string) => void;
  isSponsored?: boolean;
  viewMode?: ViewMode;
  isDraggable?: boolean;
}

export default function ProductCard({ product, onClick, onViewDetails, isSponsored = false, viewMode = 'grid', isDraggable = false }: ProductCardProps) {
  switch (viewMode) {
    case 'list':
      return <ProductCardList product={product} onClick={onClick} onViewDetails={onViewDetails} isDraggable={isDraggable} />;
    case 'detail':
      return <ProductCardDetail product={product} onClick={onClick} onViewDetails={onViewDetails} isSponsored={isSponsored} isDraggable={isDraggable} />;
    default:
      return <ProductCardGrid product={product} onClick={onClick} onViewDetails={onViewDetails} isSponsored={isSponsored} isDraggable={isDraggable} />;
  }
}

// Re-export config for external use
export { PRODUCT_TYPE_CONFIG, SUPPLIER_CONFIG, calculatePanelPrice, getTypeConfig, getSupplierConfig } from './config';
