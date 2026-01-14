'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RotateCcw, Layers } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// Types
interface Placement {
  pieceId: string;
  name: string;
  reference?: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotated?: boolean;
  edging?: { top?: string | null; bottom?: string | null; left?: string | null; right?: string | null };
}

interface FreeSpace {
  id: string;
  x: number;
  y: number;
  length: number;
  width: number;
}

interface Sheet {
  index: number;
  materialRef: string;
  materialName: string;
  length: number;
  width: number;
  thickness: number;
  placements: Placement[];
  freeSpaces?: FreeSpace[];
  efficiency: number;
  usedArea?: number;
  wasteArea?: number;
}

interface ShareData {
  sheets: Sheet[];
  projectName?: string;
  stats?: { totalPieces: number; totalSheets: number; globalEfficiency: number };
}

interface ShareResponse {
  data: ShareData;
  createdAt: string;
  expiresAt: string;
}

// Couleur unique pour les pièces - neutre pour bien voir les chants
const PIECE_COLOR = '#3A4A5A'; // gris-bleu neutre
const PIECE_BORDER = '#4A5A6A';

export default function AtelierPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  // States
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLandscape, setIsLandscape] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Wake Lock
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Request Wake Lock
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.log('Wake Lock non supporté');
      }
    }
  }, []);

  // Release Wake Lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`${API_URL}/api/optimization/share/${shareId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error('Lien expiré ou invalide');
          throw new Error(`Erreur ${response.status}`);
        }
        const result: ShareResponse = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }
    if (shareId) fetchData();
  }, [shareId]);

  // Wake Lock management
  useEffect(() => {
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || isTransitioning) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || !data) return;
    const threshold = 80;
    if (touchDelta > threshold && currentIndex > 0) goToPrev();
    else if (touchDelta < -threshold && currentIndex < data.sheets.length - 1) goToNext();
    setTouchStart(null);
    setTouchDelta(0);
  };

  const goToNext = () => {
    if (!data || currentIndex >= data.sheets.length - 1 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => setIsTransitioning(false), 200);
  };

  const goToPrev = () => {
    if (currentIndex <= 0 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev - 1);
    setTimeout(() => setIsTransitioning(false), 200);
  };

  // Portrait - Rotate message
  if (!isLandscape) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-16 h-16 mx-auto mb-6 text-[#FF6B4A] animate-pulse">
            <RotateCcw size={64} className="animate-[spin_2s_ease-in-out_infinite]" style={{ animationDirection: 'reverse' }} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Tournez votre écran</h2>
          <p className="text-sm text-[#A0A0A0]">Cette vue nécessite le mode paysage</p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[#FF6B4A] animate-spin" />
        <p className="text-sm text-[#A0A0A0]">Chargement du plan de découpe...</p>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#FF6B4A]/10 flex items-center justify-center">
          <AlertTriangle size={32} className="text-[#FF6B4A]" />
        </div>
        <h2 className="text-xl font-semibold text-white">Erreur</h2>
        <p className="text-sm text-[#A0A0A0]">{error || 'Données non disponibles'}</p>
      </div>
    );
  }

  const currentSheet = data.sheets[currentIndex];
  const totalPieces = currentSheet.placements.length;

  // Calculate scale
  const maxWidth = window.innerWidth - 180;
  const maxHeight = window.innerHeight - 120;
  const scaleX = maxWidth / currentSheet.length;
  const scaleY = maxHeight / currentSheet.width;
  const scale = Math.min(scaleX, scaleY) * 0.92;
  const svgWidth = currentSheet.length * scale;
  const svgHeight = currentSheet.width * scale;

  return (
    <div
      className="fixed inset-0 bg-[#0A0A0A] flex flex-col select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1F1F1F]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B4A]/10 flex items-center justify-center">
              <Layers size={18} className="text-[#FF6B4A]" />
            </div>
            <span className="text-2xl font-semibold text-white">
              {currentIndex + 1}<span className="text-[#666666]">/{data.sheets.length}</span>
            </span>
          </div>
          <div className="h-6 w-px bg-[#2A2A2A]" />
          <span className="text-sm text-[#A0A0A0] max-w-[200px] truncate">
            {currentSheet.materialName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <span className="text-xs text-[#A0A0A0]">{totalPieces} pièces</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <span className="text-sm font-medium text-emerald-500">
              {Math.round(currentSheet.efficiency)}%
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center relative px-16">
        {/* Nav buttons */}
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-12 h-20 rounded-xl
            flex items-center justify-center transition-all duration-200
            ${currentIndex === 0
              ? 'bg-[#111111] text-[#333333] cursor-not-allowed'
              : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:bg-[#222222] hover:border-[#3A3A3A] hover:text-white'
            }`}
        >
          <ChevronLeft size={24} />
        </button>

        {/* SVG */}
        <div
          className="transition-transform duration-200"
          style={{ transform: `translateX(${touchDelta * 0.2}px)` }}
        >
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${currentSheet.length} ${currentSheet.width}`}
            className="overflow-visible"
            style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.4))' }}
          >
            {/* Background - angles droits pour un vrai panneau */}
            <rect
              x={0} y={0}
              width={currentSheet.length}
              height={currentSheet.width}
              fill="#2A2A2A"
              stroke="#444444"
              strokeWidth="2"
            />

            {/* Grid pattern */}
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#222222" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x={0} y={0} width={currentSheet.length} height={currentSheet.width} fill="url(#grid)" />

            {/* Free spaces */}
            {currentSheet.freeSpaces?.map((space, i) => (
              <rect
                key={`chute-${i}`}
                x={space.x} y={space.y}
                width={space.length} height={space.width}
                fill="rgba(255, 107, 74, 0.05)"
                stroke="#FF6B4A"
                strokeWidth="1"
                strokeDasharray="8 4"
                strokeOpacity="0.3"
              />
            ))}

            {/* Pieces */}
            {currentSheet.placements.map((piece) => {
              const minDim = Math.min(piece.length, piece.width);
              // Seuils plus bas pour afficher le texte
              const showLabel = piece.length > 80 && piece.width > 40;
              const showDims = piece.length > 120 && piece.width > 60;
              // Taille de texte adaptative mais plus grande
              const labelSize = Math.max(Math.min(minDim * 0.18, 28), 14);
              const dimsSize = Math.max(Math.min(minDim * 0.12, 18), 10);

              return (
                <g key={piece.pieceId}>
                  {/* Pièce - couleur neutre uniforme, angles droits */}
                  <rect
                    x={piece.x} y={piece.y}
                    width={piece.length} height={piece.width}
                    fill={PIECE_COLOR}
                    stroke={PIECE_BORDER}
                    strokeWidth="1.5"
                  />

                  {/* Référence - bien visible */}
                  {showLabel && (
                    <text
                      x={piece.x + piece.length / 2}
                      y={piece.y + piece.width / 2 - (showDims ? dimsSize * 0.8 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={labelSize}
                      fontWeight="600"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {piece.reference || piece.name}
                    </text>
                  )}

                  {/* Dimensions */}
                  {showDims && (
                    <text
                      x={piece.x + piece.length / 2}
                      y={piece.y + piece.width / 2 + labelSize * 0.6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.7)"
                      fontSize={dimsSize}
                      fontWeight="500"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {piece.length} × {piece.width}
                    </text>
                  )}

                  {/* Indicateurs de chants - jaune vif pour bien ressortir */}
                  {piece.edging?.top && (
                    <line x1={piece.x + 4} y1={piece.y + 3} x2={piece.x + piece.length - 4} y2={piece.y + 3} stroke="#FBBF24" strokeWidth="5" strokeLinecap="square" />
                  )}
                  {piece.edging?.bottom && (
                    <line x1={piece.x + 4} y1={piece.y + piece.width - 3} x2={piece.x + piece.length - 4} y2={piece.y + piece.width - 3} stroke="#FBBF24" strokeWidth="5" strokeLinecap="square" />
                  )}
                  {piece.edging?.left && (
                    <line x1={piece.x + 3} y1={piece.y + 4} x2={piece.x + 3} y2={piece.y + piece.width - 4} stroke="#FBBF24" strokeWidth="5" strokeLinecap="square" />
                  )}
                  {piece.edging?.right && (
                    <line x1={piece.x + piece.length - 3} y1={piece.y + 4} x2={piece.x + piece.length - 3} y2={piece.y + piece.width - 4} stroke="#FBBF24" strokeWidth="5" strokeLinecap="square" />
                  )}
                </g>
              );
            })}

            {/* Dimensions labels */}
            <text
              x={currentSheet.length / 2}
              y={-12}
              textAnchor="middle"
              fill="#666666"
              fontSize="20"
              fontFamily="Inter, sans-serif"
            >
              {currentSheet.length} mm
            </text>
            <text
              x={-12}
              y={currentSheet.width / 2}
              textAnchor="middle"
              fill="#666666"
              fontSize="20"
              fontFamily="Inter, sans-serif"
              transform={`rotate(-90, -12, ${currentSheet.width / 2})`}
            >
              {currentSheet.width} mm
            </text>
          </svg>
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === data.sheets.length - 1}
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-12 h-20 rounded-xl
            flex items-center justify-center transition-all duration-200
            ${currentIndex === data.sheets.length - 1
              ? 'bg-[#111111] text-[#333333] cursor-not-allowed'
              : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0] hover:bg-[#222222] hover:border-[#3A3A3A] hover:text-white'
            }`}
        >
          <ChevronRight size={24} />
        </button>
      </main>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-2 py-3 border-t border-[#1F1F1F]">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {data.sheets.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (!isTransitioning) {
                  setIsTransitioning(true);
                  setCurrentIndex(i);
                  setTimeout(() => setIsTransitioning(false), 200);
                }
              }}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === currentIndex
                  ? 'w-6 bg-[#FF6B4A]'
                  : 'w-2 bg-[#2A2A2A] hover:bg-[#3A3A3A]'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-[#666666] flex items-center gap-2">
          <ChevronLeft size={12} />
          <span>Swipe pour naviguer</span>
          <ChevronRight size={12} />
        </p>
      </footer>
    </div>
  );
}
