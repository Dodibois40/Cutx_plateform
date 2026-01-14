'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  RotateCcw,
  Layers,
  Maximize,
  List,
  X
} from 'lucide-react';

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

// Couleur neutre pour les pièces
const PIECE_COLOR = '#3D4F5F';
const PIECE_BORDER = '#526270';
const PIECE_SELECTED = '#4A90D9';

export default function AtelierPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLandscape, setIsLandscape] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);

  // Touch handling
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Wake Lock
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Fullscreen API
  const enterFullscreen = useCallback(async () => {
    if (containerRef.current && document.fullscreenEnabled) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.log('Fullscreen non supporté');
      }
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Wake Lock
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.log('Wake Lock non supporté');
      }
    }
  }, []);

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
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null || touchStartX === null || !data) return;

    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const threshold = 60;

    // Vertical swipe priority (for list)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold) {
      if (deltaY < 0 && !showList) {
        // Swipe up → show list
        setShowList(true);
      } else if (deltaY > 0 && showList) {
        // Swipe down → hide list
        setShowList(false);
        setSelectedPiece(null);
      }
    }
    // Horizontal swipe (change panel, only when list is hidden)
    else if (!showList && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (deltaX < 0 && currentIndex < data.sheets.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }

    setTouchStartY(null);
    setTouchStartX(null);
  };

  const goToNext = () => {
    if (!data || currentIndex >= data.sheets.length - 1) return;
    setCurrentIndex(prev => prev + 1);
  };

  const goToPrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex(prev => prev - 1);
  };

  // Get edging count for a piece
  const getEdgingCount = (edging?: Placement['edging']) => {
    if (!edging) return 0;
    return [edging.top, edging.bottom, edging.left, edging.right].filter(Boolean).length;
  };

  // Portrait - Rotate message
  if (!isLandscape) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center px-8">
          <div className="w-16 h-16 mx-auto mb-6 text-[#FF6B4A]">
            <RotateCcw size={64} className="animate-[spin_3s_ease-in-out_infinite]" style={{ animationDirection: 'reverse' }} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Tournez votre écran</h2>
          <p className="text-sm text-[#888]">Mode paysage requis</p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[#FF6B4A] animate-spin" />
        <p className="text-sm text-[#888]">Chargement...</p>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={48} className="text-[#FF6B4A]" />
        <h2 className="text-xl font-semibold text-white">Erreur</h2>
        <p className="text-sm text-[#888]">{error || 'Données non disponibles'}</p>
      </div>
    );
  }

  const currentSheet = data.sheets[currentIndex];
  const totalPieces = currentSheet.placements.length;

  // Calculate scale to fill screen
  const padding = isFullscreen ? 20 : 60;
  const headerHeight = isFullscreen ? 0 : 48;
  const footerHeight = isFullscreen ? 0 : 40;
  const availableWidth = (typeof window !== 'undefined' ? window.innerWidth : 800) - padding * 2;
  const availableHeight = (typeof window !== 'undefined' ? window.innerHeight : 600) - headerHeight - footerHeight - padding;

  const scaleX = availableWidth / currentSheet.length;
  const scaleY = availableHeight / currentSheet.width;
  const scale = Math.min(scaleX, scaleY);
  const svgWidth = currentSheet.length * scale;
  const svgHeight = currentSheet.width * scale;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#0A0A0A] flex flex-col select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mini header - only when not fullscreen */}
      {!isFullscreen && (
        <header className="h-12 flex items-center justify-between px-4 bg-[#111] border-b border-[#222] shrink-0">
          <div className="flex items-center gap-3">
            <Layers size={18} className="text-[#FF6B4A]" />
            <span className="text-lg font-semibold text-white">
              {currentIndex + 1}<span className="text-[#555]">/{data.sheets.length}</span>
            </span>
            <span className="text-xs text-[#666] max-w-[150px] truncate">
              {currentSheet.materialName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#888] px-2 py-1 bg-[#1A1A1A] rounded">
              {totalPieces} pièces
            </span>
            <span className="text-xs font-medium text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded">
              {Math.round(currentSheet.efficiency)}%
            </span>
            <button
              onClick={enterFullscreen}
              className="p-2 text-[#888] hover:text-white hover:bg-[#222] rounded transition-colors"
              title="Plein écran"
            >
              <Maximize size={18} />
            </button>
          </div>
        </header>
      )}

      {/* Main - Panneau plein écran */}
      <main className="flex-1 flex items-center justify-center relative">
        {/* Fullscreen header overlay */}
        {isFullscreen && (
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white">
                {currentIndex + 1}/{data.sheets.length}
              </span>
              <span className="text-sm text-white/70">{totalPieces} pièces</span>
              <span className="text-sm font-medium text-emerald-400">{Math.round(currentSheet.efficiency)}%</span>
            </div>
            <button
              onClick={exitFullscreen}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Nav arrows */}
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-16 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-white/50 hover:text-white transition-all z-10"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {currentIndex < data.sheets.length - 1 && (
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-16 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-white/50 hover:text-white transition-all z-10"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* SVG Panel - Maximum size */}
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${currentSheet.length} ${currentSheet.width}`}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        >
          {/* Background */}
          <rect
            x={0} y={0}
            width={currentSheet.length}
            height={currentSheet.width}
            fill="#1E1E1E"
            stroke="#3A3A3A"
            strokeWidth="3"
          />

          {/* Grid */}
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#2A2A2A" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x={0} y={0} width={currentSheet.length} height={currentSheet.width} fill="url(#grid)" />

          {/* Free spaces (chutes) */}
          {currentSheet.freeSpaces?.map((space, i) => (
            <rect
              key={`chute-${i}`}
              x={space.x} y={space.y}
              width={space.length} height={space.width}
              fill="rgba(255,107,74,0.08)"
              stroke="#FF6B4A"
              strokeWidth="1"
              strokeDasharray="10 5"
              strokeOpacity="0.4"
            />
          ))}

          {/* Pieces */}
          {currentSheet.placements.map((piece) => {
            const isSelected = selectedPiece === piece.pieceId;
            const minDim = Math.min(piece.length, piece.width);
            const showText = minDim > 60;
            const fontSize = Math.max(Math.min(minDim * 0.2, 32), 16);

            return (
              <g key={piece.pieceId} onClick={() => setSelectedPiece(isSelected ? null : piece.pieceId)}>
                {/* Piece rectangle */}
                <rect
                  x={piece.x} y={piece.y}
                  width={piece.length} height={piece.width}
                  fill={isSelected ? PIECE_SELECTED : PIECE_COLOR}
                  stroke={isSelected ? '#6BB5FF' : PIECE_BORDER}
                  strokeWidth={isSelected ? 3 : 1.5}
                  style={{ cursor: 'pointer' }}
                />

                {/* Reference text */}
                {showText && (
                  <>
                    <text
                      x={piece.x + piece.length / 2}
                      y={piece.y + piece.width / 2 - fontSize * 0.3}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="700"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {piece.reference || piece.name}
                    </text>
                    <text
                      x={piece.x + piece.length / 2}
                      y={piece.y + piece.width / 2 + fontSize * 0.6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.6)"
                      fontSize={fontSize * 0.6}
                      fontWeight="500"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {piece.length} × {piece.width}
                    </text>
                  </>
                )}

                {/* Edging indicators - Yellow */}
                {piece.edging?.top && (
                  <rect x={piece.x + 2} y={piece.y + 2} width={piece.length - 4} height={6} fill="#FBBF24" />
                )}
                {piece.edging?.bottom && (
                  <rect x={piece.x + 2} y={piece.y + piece.width - 8} width={piece.length - 4} height={6} fill="#FBBF24" />
                )}
                {piece.edging?.left && (
                  <rect x={piece.x + 2} y={piece.y + 2} width={6} height={piece.width - 4} fill="#FBBF24" />
                )}
                {piece.edging?.right && (
                  <rect x={piece.x + piece.length - 8} y={piece.y + 2} width={6} height={piece.width - 4} fill="#FBBF24" />
                )}
              </g>
            );
          })}
        </svg>

        {/* Swipe up indicator */}
        {!showList && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/30 animate-bounce">
            <ChevronUp size={20} />
            <span className="text-xs">Liste</span>
          </div>
        )}
      </main>

      {/* Footer dots - only when not fullscreen */}
      {!isFullscreen && !showList && (
        <footer className="h-10 flex items-center justify-center gap-2 bg-[#111] border-t border-[#222] shrink-0">
          {data.sheets.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? 'w-6 bg-[#FF6B4A]' : 'w-2 bg-[#333] hover:bg-[#444]'
              }`}
            />
          ))}
        </footer>
      )}

      {/* Slide-up List Panel */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-[#111] border-t border-[#333] rounded-t-2xl transition-transform duration-300 ease-out ${
          showList ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '70%', maxHeight: '70vh' }}
      >
        {/* Handle bar */}
        <div
          className="flex flex-col items-center py-3 cursor-pointer"
          onClick={() => setShowList(false)}
        >
          <div className="w-12 h-1 bg-[#444] rounded-full mb-2" />
          <div className="flex items-center gap-2 text-[#888]">
            <ChevronDown size={16} />
            <span className="text-xs">Fermer</span>
          </div>
        </div>

        {/* List header */}
        <div className="px-4 pb-2 border-b border-[#222]">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <List size={18} className="text-[#FF6B4A]" />
            {totalPieces} pièces sur ce panneau
          </h3>
        </div>

        {/* List content */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 100px)' }}>
          {currentSheet.placements.map((piece, i) => {
            const edgingCount = getEdgingCount(piece.edging);
            const isSelected = selectedPiece === piece.pieceId;

            return (
              <div
                key={piece.pieceId}
                onClick={() => {
                  setSelectedPiece(piece.pieceId);
                  setShowList(false);
                }}
                className={`flex items-center gap-4 px-4 py-3 border-b border-[#1A1A1A] cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#4A90D9]/20' : 'hover:bg-[#1A1A1A]'
                }`}
              >
                {/* Index */}
                <div className="w-8 h-8 rounded-lg bg-[#222] flex items-center justify-center text-sm font-bold text-white">
                  {i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-white truncate">
                    {piece.reference || piece.name}
                  </div>
                  <div className="text-sm text-[#888]">
                    {piece.length} × {piece.width} mm
                  </div>
                </div>

                {/* Edging badge */}
                {edgingCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-[#FBBF24]/10 rounded">
                    <div className="w-3 h-3 bg-[#FBBF24] rounded-sm" />
                    <span className="text-xs font-medium text-[#FBBF24]">{edgingCount} chant{edgingCount > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Arrow */}
                <ChevronRight size={18} className="text-[#444]" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
