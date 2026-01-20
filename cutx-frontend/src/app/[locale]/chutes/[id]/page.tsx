'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Heart,
  Share2,
  MessageCircle,
  MapPin,
  Star,
  CheckCircle,
  Eye,
  Calendar,
  Ruler,
  Package,
  Tag,
  User,
  Clock,
  Shield,
} from 'lucide-react';
import { getChuteById, formatPrice, formatRelativeDate } from '@/lib/services/chutes-api';
import type { ChuteOfferingDetail } from '@/types/chutes';
import {
  PRODUCT_TYPE_LABELS,
  CONDITION_LABELS,
  CONDITION_COLORS,
  BOOST_LABELS,
  BOOST_COLORS,
} from '@/types/chutes';
import { CutXAppsMenu } from '@/components/ui/CutXAppsMenu';
import { UserAccountMenu } from '@/components/ui/UserAccountMenu';

export default function ChuteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [chute, setChute] = useState<ChuteOfferingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchChute = async () => {
      try {
        setLoading(true);
        const data = await getChuteById(id);
        setChute(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchChute();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cx-surface-0)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-[var(--cx-accent)]" />
      </div>
    );
  }

  if (error || !chute) {
    return (
      <div className="min-h-screen bg-[var(--cx-surface-0)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Chute non trouvée'}</p>
          <button onClick={() => router.back()} className="cx-btn cx-btn-secondary">
            Retour
          </button>
        </div>
      </div>
    );
  }

  const seller = chute.seller;
  const sellerProfile = seller.sellerProfile;
  const displayName =
    sellerProfile?.displayName ||
    seller.company ||
    `${seller.firstName || ''} ${seller.lastName || ''}`.trim() ||
    'Vendeur';

  // Formater les dimensions
  const formatDim = (mm: number) => {
    if (mm >= 100) {
      return `${(mm / 10).toFixed(mm % 10 === 0 ? 0 : 1)} cm`;
    }
    return `${mm} mm`;
  };

  // Calculer la surface
  const surfaceM2 = (chute.length * chute.width) / 1000000;

  // Images (ou placeholder)
  const images =
    chute.images.length > 0
      ? chute.images
      : [{ id: 'placeholder', url: '', thumbnailUrl: null, order: 0, isPrimary: true }];

  return (
    <div className="min-h-screen bg-[var(--cx-surface-0)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--cx-surface-0)]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/70 hover:text-white"
            >
              <ArrowLeft size={20} />
              <span>Retour</span>
            </button>

            <div className="flex items-center gap-3">
              <button className="cx-btn cx-btn-ghost flex items-center gap-2">
                <Heart size={18} />
                <span className="hidden sm:inline">Favoris</span>
              </button>
              <button className="cx-btn cx-btn-ghost flex items-center gap-2">
                <Share2 size={18} />
                <span className="hidden sm:inline">Partager</span>
              </button>
              <CutXAppsMenu />
              <UserAccountMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche - Images */}
          <div className="space-y-4">
            {/* Image principale */}
            <div className="aspect-square bg-[var(--cx-surface-1)] rounded-xl overflow-hidden">
              {images[selectedImage]?.url ? (
                <img
                  src={images[selectedImage].url}
                  alt={chute.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <Package size={64} />
                </div>
              )}
            </div>

            {/* Miniatures */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index
                        ? 'border-[var(--cx-accent)]'
                        : 'border-transparent'
                    }`}
                  >
                    {img.url ? (
                      <img
                        src={img.thumbnailUrl || img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--cx-surface-1)] flex items-center justify-center">
                        <Package size={24} className="text-white/20" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colonne droite - Infos */}
          <div className="space-y-6">
            {/* Titre et badges */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {chute.boostLevel !== 'NONE' && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${BOOST_COLORS[chute.boostLevel]}`}>
                    {BOOST_LABELS[chute.boostLevel]}
                  </span>
                )}
                <span className={`px-2 py-1 rounded text-xs ${CONDITION_COLORS[chute.condition]}`}>
                  {CONDITION_LABELS[chute.condition]}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-white">{chute.title}</h1>
              <p className="text-white/50 mt-1">
                {PRODUCT_TYPE_LABELS[chute.productType]}
                {chute.material && ` • ${chute.material}`}
              </p>
            </div>

            {/* Prix */}
            <div className="p-4 bg-[var(--cx-surface-1)] rounded-xl">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-[var(--cx-accent)]">
                  {formatPrice(chute.price)}
                </span>
                {chute.originalPanelPrice && (
                  <span className="text-sm text-white/50">
                    Neuf ~{formatPrice(chute.originalPanelPrice * surfaceM2)}
                  </span>
                )}
              </div>
              {chute.acceptsOffers && (
                <p className="text-sm text-white/50 mt-1">
                  Offres acceptées
                  {chute.minimumOffer && ` (min. ${formatPrice(chute.minimumOffer)})`}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 cx-btn cx-btn-primary flex items-center justify-center gap-2">
                <Tag size={18} />
                Faire une offre
              </button>
              <button className="flex-1 cx-btn cx-btn-secondary flex items-center justify-center gap-2">
                <MessageCircle size={18} />
                Contacter
              </button>
            </div>

            {/* Caractéristiques */}
            <div className="p-4 bg-[var(--cx-surface-1)] rounded-xl space-y-3">
              <h3 className="font-medium text-white">Caractéristiques</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <Ruler size={16} className="text-white/30" />
                  <span>
                    {formatDim(chute.length)} × {formatDim(chute.width)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Package size={16} className="text-white/30" />
                  <span>Épaisseur: {chute.thickness} mm</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Tag size={16} className="text-white/30" />
                  <span>Surface: {surfaceM2.toFixed(2)} m²</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Package size={16} className="text-white/30" />
                  <span>Quantité: {chute.quantity}</span>
                </div>
              </div>
            </div>

            {/* Certification */}
            {chute.certificationChecks.length > 0 && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Shield size={18} />
                  <span className="font-medium">Certifié par le vendeur</span>
                </div>
                <ul className="space-y-1 text-sm text-white/70">
                  {chute.certificationChecks.includes('no_scratch') && (
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-400" />
                      Aucune rayure visible
                    </li>
                  )}
                  {chute.certificationChecks.includes('no_chip') && (
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-400" />
                      Aucun éclat sur les chants
                    </li>
                  )}
                  {chute.certificationChecks.includes('no_glue') && (
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-400" />
                      Pas de colle/adhésif
                    </li>
                  )}
                  {chute.certificationChecks.includes('not_warped') && (
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-400" />
                      Non gondolé
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Localisation */}
            <div className="p-4 bg-[var(--cx-surface-1)] rounded-xl">
              <div className="flex items-center gap-2 text-white mb-2">
                <MapPin size={18} className="text-white/50" />
                <span className="font-medium">
                  {chute.city} ({chute.postalCode})
                </span>
              </div>
              <p className="text-sm text-white/50">Retrait sur place uniquement</p>
            </div>

            {/* Vendeur */}
            <div className="p-4 bg-[var(--cx-surface-1)] rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--cx-surface-2)] flex items-center justify-center overflow-hidden">
                  {sellerProfile?.avatarUrl ? (
                    <img
                      src={sellerProfile.avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={24} className="text-white/30" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{displayName}</span>
                    {sellerProfile?.isVerified && (
                      <CheckCircle size={16} className="text-green-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    {sellerProfile?.averageRating && (
                      <span className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        {sellerProfile.averageRating.toFixed(1)} ({sellerProfile.ratingCount})
                      </span>
                    )}
                    {sellerProfile?.totalSales !== undefined && sellerProfile.totalSales > 0 && (
                      <span>{sellerProfile.totalSales} vente{sellerProfile.totalSales > 1 ? 's' : ''}</span>
                    )}
                    {sellerProfile?.responseTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Répond en ~{sellerProfile.responseTime}min
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/chutes/vendeur/${seller.id}`}
                className="mt-3 block text-center text-sm text-[var(--cx-accent)] hover:underline"
              >
                Voir le profil du vendeur
              </Link>
            </div>

            {/* Description */}
            {chute.description && (
              <div>
                <h3 className="font-medium text-white mb-2">Description</h3>
                <p className="text-white/70 whitespace-pre-wrap">{chute.description}</p>
              </div>
            )}

            {/* Infos */}
            <div className="flex items-center justify-between text-xs text-white/30 pt-4 border-t border-white/5">
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {chute.viewCount} vue{chute.viewCount > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Heart size={12} />
                {chute.favoriteCount} favori{chute.favoriteCount > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Publié {formatRelativeDate(chute.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
