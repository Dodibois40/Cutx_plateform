'use client';

import { Heart, Eye, MapPin, Star, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import type { ChuteCard as ChuteCardType } from '@/types/chutes';
import {
  PRODUCT_TYPE_LABELS,
  CONDITION_LABELS,
  CONDITION_COLORS,
  BOOST_LABELS,
  BOOST_COLORS,
} from '@/types/chutes';
import { formatPrice, formatRelativeDate } from '@/lib/services/chutes-api';

interface ChuteCardProps {
  chute: ChuteCardType;
}

export function ChuteCard({ chute }: ChuteCardProps) {
  const {
    id,
    title,
    productType,
    thickness,
    length,
    width,
    condition,
    price,
    acceptsOffers,
    boostLevel,
    city,
    postalCode,
    viewCount,
    favoriteCount,
    createdAt,
    primaryImage,
    seller,
    distance,
  } = chute;

  // Formater les dimensions en cm
  const formatDim = (mm: number) => Math.round(mm / 10);

  return (
    <Link href={`/chutes/${id}`} className="block group">
      <div className="cx-card cx-card-interactive overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-[var(--cx-surface-1)] overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <span className="text-4xl">📦</span>
            </div>
          )}

          {/* Badge Boost */}
          {boostLevel !== 'NONE' && (
            <div
              className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${BOOST_COLORS[boostLevel]}`}
            >
              {BOOST_LABELS[boostLevel]}
            </div>
          )}

          {/* Favoris et vues */}
          <div className="absolute top-2 right-2 flex items-center gap-2 text-xs text-white/70">
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
              <Heart size={12} />
              {favoriteCount}
            </span>
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
              <Eye size={12} />
              {viewCount}
            </span>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-4 space-y-3">
          {/* Titre et type */}
          <div>
            <h3 className="font-medium text-white truncate group-hover:text-[var(--cx-accent)]">
              {title}
            </h3>
            <p className="text-sm text-white/50">
              {PRODUCT_TYPE_LABELS[productType]} • {thickness}mm
            </p>
          </div>

          {/* Dimensions */}
          <p className="text-sm text-white/70">
            {formatDim(length)} × {formatDim(width)} cm
          </p>

          {/* Prix et état */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-semibold text-[var(--cx-accent)]">
                {formatPrice(price)}
              </span>
              {acceptsOffers && (
                <span className="ml-2 text-xs text-white/50">
                  Offres acceptées
                </span>
              )}
            </div>
            <span className={`px-2 py-1 rounded text-xs ${CONDITION_COLORS[condition]}`}>
              {CONDITION_LABELS[condition]}
            </span>
          </div>

          {/* Localisation */}
          <div className="flex items-center gap-1 text-sm text-white/50">
            <MapPin size={14} />
            <span>
              {city} ({postalCode.substring(0, 2)})
            </span>
            {distance !== undefined && (
              <span className="ml-auto">{Math.round(distance)} km</span>
            )}
          </div>

          {/* Vendeur */}
          {seller && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <div className="w-6 h-6 rounded-full bg-[var(--cx-surface-2)] flex items-center justify-center overflow-hidden">
                {seller.avatarUrl ? (
                  <img
                    src={seller.avatarUrl}
                    alt={seller.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-white/50">
                    {seller.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm text-white/70 truncate flex-1">
                {seller.displayName}
              </span>
              {seller.isVerified && (
                <CheckCircle size={14} className="text-green-400" />
              )}
              {seller.averageRating && (
                <span className="flex items-center gap-1 text-sm text-white/50">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  {seller.averageRating.toFixed(1)}
                </span>
              )}
            </div>
          )}

          {/* Date */}
          <p className="text-xs text-white/30">{formatRelativeDate(createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}
