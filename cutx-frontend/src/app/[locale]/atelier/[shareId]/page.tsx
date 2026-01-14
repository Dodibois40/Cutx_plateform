'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

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

// Couleurs pour les pièces (palette industrielle)
const PIECE_COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];

function getPieceColor(index: number): string {
  return PIECE_COLORS[index % PIECE_COLORS.length];
}

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
        console.log('Wake Lock activé');
      } catch (err) {
        console.log('Wake Lock non supporté:', err);
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
      const isLand = window.innerWidth > window.innerHeight;
      setIsLandscape(isLand);
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
          if (response.status === 404) {
            throw new Error('Lien expiré ou invalide');
          }
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

    if (shareId) {
      fetchData();
    }
  }, [shareId]);

  // Wake Lock management
  useEffect(() => {
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || isTransitioning) return;
    const delta = e.touches[0].clientX - touchStart;
    setTouchDelta(delta);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || !data) return;

    const threshold = 80;
    if (touchDelta > threshold && currentIndex > 0) {
      goToPrev();
    } else if (touchDelta < -threshold && currentIndex < data.sheets.length - 1) {
      goToNext();
    }

    setTouchStart(null);
    setTouchDelta(0);
  };

  const goToNext = () => {
    if (!data || currentIndex >= data.sheets.length - 1 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrev = () => {
    if (currentIndex <= 0 || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(prev => prev - 1);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Portrait message
  if (!isLandscape) {
    return (
      <div className="rotate-screen">
        <div className="rotate-content">
          <div className="rotate-icon">
            <RotateCcw size={64} />
          </div>
          <h2>Tournez votre écran</h2>
          <p>Cette vue nécessite le mode paysage</p>
        </div>
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@400;700&display=swap');

          .rotate-screen {
            position: fixed;
            inset: 0;
            background: #0a0a0f;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Space Grotesk', sans-serif;
          }

          .rotate-content {
            text-align: center;
            color: #f59e0b;
          }

          .rotate-icon {
            animation: rotate-hint 2s ease-in-out infinite;
            margin-bottom: 24px;
          }

          @keyframes rotate-hint {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-90deg); }
          }

          h2 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          p {
            font-size: 14px;
            color: #666;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 size={48} className="loader" />
        <p>Chargement du plan de découpe...</p>
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap');

          .loading-screen {
            position: fixed;
            inset: 0;
            background: #0a0a0f;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            font-family: 'JetBrains Mono', monospace;
            color: #f59e0b;
          }

          .loading-screen :global(.loader) {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          p {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
        `}</style>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="error-screen">
        <AlertTriangle size={64} />
        <h2>Erreur</h2>
        <p>{error || 'Données non disponibles'}</p>
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');

          .error-screen {
            position: fixed;
            inset: 0;
            background: #0a0a0f;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            font-family: 'Space Grotesk', sans-serif;
            color: #ef4444;
          }

          h2 {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
          }

          p {
            font-size: 14px;
            color: #666;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  const currentSheet = data.sheets[currentIndex];
  const totalPieces = currentSheet.placements.length;

  // Calculate scale for SVG
  const maxWidth = window.innerWidth - 160; // margins
  const maxHeight = window.innerHeight - 100; // header + footer
  const scaleX = maxWidth / currentSheet.length;
  const scaleY = maxHeight / currentSheet.width;
  const scale = Math.min(scaleX, scaleY) * 0.95;

  const svgWidth = currentSheet.length * scale;
  const svgHeight = currentSheet.width * scale;

  return (
    <div
      className="atelier-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="atelier-header">
        <div className="header-left">
          <span className="panel-counter">
            {currentIndex + 1}/{data.sheets.length}
          </span>
          <span className="material-name">{currentSheet.materialName}</span>
        </div>
        <div className="header-right">
          <span className="stat">{totalPieces} pièces</span>
          <span className="efficiency">{currentSheet.efficiency}%</span>
        </div>
      </header>

      {/* Main visualization */}
      <main className="atelier-main">
        {/* Navigation arrows */}
        <button
          className={`nav-arrow nav-prev ${currentIndex === 0 ? 'disabled' : ''}`}
          onClick={goToPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={32} />
        </button>

        {/* SVG Container */}
        <div
          className="svg-container"
          style={{
            transform: `translateX(${touchDelta * 0.3}px)`,
            transition: touchStart ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${currentSheet.length} ${currentSheet.width}`}
            className="cutting-svg"
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1a1a2e" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Panel background */}
            <rect
              x={0}
              y={0}
              width={currentSheet.length}
              height={currentSheet.width}
              fill="url(#grid)"
              stroke="#2a2a3e"
              strokeWidth="4"
            />

            {/* Free spaces (chutes) */}
            {currentSheet.freeSpaces?.map((space, i) => (
              <rect
                key={`chute-${i}`}
                x={space.x}
                y={space.y}
                width={space.length}
                height={space.width}
                fill="rgba(239, 68, 68, 0.15)"
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="8 4"
              />
            ))}

            {/* Placed pieces */}
            {currentSheet.placements.map((piece, i) => {
              const color = getPieceColor(i);
              return (
                <g key={piece.pieceId} className="piece-group">
                  <rect
                    x={piece.x}
                    y={piece.y}
                    width={piece.length}
                    height={piece.width}
                    fill={color}
                    fillOpacity={0.85}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  {/* Piece label */}
                  {piece.length > 150 && piece.width > 80 && (
                    <text
                      x={piece.x + piece.length / 2}
                      y={piece.y + piece.width / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={Math.min(piece.length, piece.width) * 0.15}
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {piece.reference || piece.name}
                    </text>
                  )}
                  {/* Dimensions */}
                  {piece.length > 200 && piece.width > 100 && (
                    <text
                      x={piece.x + piece.length / 2}
                      y={piece.y + piece.width / 2 + Math.min(piece.length, piece.width) * 0.12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.7)"
                      fontSize={Math.min(piece.length, piece.width) * 0.08}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {piece.length} × {piece.width}
                    </text>
                  )}
                  {/* Edging indicators */}
                  {piece.edging && (
                    <>
                      {piece.edging.top && (
                        <line x1={piece.x + 10} y1={piece.y + 3} x2={piece.x + piece.length - 10} y2={piece.y + 3} stroke="#fff" strokeWidth="4" />
                      )}
                      {piece.edging.bottom && (
                        <line x1={piece.x + 10} y1={piece.y + piece.width - 3} x2={piece.x + piece.length - 10} y2={piece.y + piece.width - 3} stroke="#fff" strokeWidth="4" />
                      )}
                      {piece.edging.left && (
                        <line x1={piece.x + 3} y1={piece.y + 10} x2={piece.x + 3} y2={piece.y + piece.width - 10} stroke="#fff" strokeWidth="4" />
                      )}
                      {piece.edging.right && (
                        <line x1={piece.x + piece.length - 3} y1={piece.y + 10} x2={piece.x + piece.length - 3} y2={piece.y + piece.width - 10} stroke="#fff" strokeWidth="4" />
                      )}
                    </>
                  )}
                </g>
              );
            })}

            {/* Panel dimensions */}
            <text
              x={currentSheet.length / 2}
              y={-15}
              textAnchor="middle"
              fill="#666"
              fontSize="28"
              fontFamily="JetBrains Mono, monospace"
            >
              {currentSheet.length} mm
            </text>
            <text
              x={-15}
              y={currentSheet.width / 2}
              textAnchor="middle"
              fill="#666"
              fontSize="28"
              fontFamily="JetBrains Mono, monospace"
              transform={`rotate(-90, -15, ${currentSheet.width / 2})`}
            >
              {currentSheet.width} mm
            </text>
          </svg>
        </div>

        <button
          className={`nav-arrow nav-next ${currentIndex === data.sheets.length - 1 ? 'disabled' : ''}`}
          onClick={goToNext}
          disabled={currentIndex === data.sheets.length - 1}
        >
          <ChevronRight size={32} />
        </button>
      </main>

      {/* Footer - dots navigation */}
      <footer className="atelier-footer">
        <div className="dots">
          {data.sheets.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === currentIndex ? 'active' : ''}`}
              onClick={() => {
                if (!isTransitioning) {
                  setIsTransitioning(true);
                  setCurrentIndex(i);
                  setTimeout(() => setIsTransitioning(false), 300);
                }
              }}
            />
          ))}
        </div>
        <div className="swipe-hint">
          <ChevronLeft size={14} />
          <span>Swipe pour naviguer</span>
          <ChevronRight size={14} />
        </div>
      </footer>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap');

        .atelier-container {
          position: fixed;
          inset: 0;
          background: #0a0a0f;
          display: flex;
          flex-direction: column;
          font-family: 'Space Grotesk', sans-serif;
          overflow: hidden;
          touch-action: pan-y;
          user-select: none;
        }

        /* Header */
        .atelier-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: linear-gradient(180deg, #0f0f15 0%, transparent 100%);
          z-index: 10;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .panel-counter {
          font-family: 'JetBrains Mono', monospace;
          font-size: 28px;
          font-weight: 700;
          color: #f59e0b;
          letter-spacing: -1px;
        }

        .material-name {
          font-size: 14px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .stat {
          font-size: 14px;
          color: #666;
        }

        .efficiency {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: #10b981;
          padding: 4px 12px;
          background: rgba(16, 185, 129, 0.15);
          border-radius: 6px;
        }

        /* Main */
        .atelier-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0 60px;
        }

        .svg-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cutting-svg {
          filter: drop-shadow(0 0 40px rgba(245, 158, 11, 0.1));
        }

        /* Navigation arrows */
        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 50px;
          height: 80px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 10;
        }

        .nav-prev { left: 10px; }
        .nav-next { right: 10px; }

        .nav-arrow:hover:not(.disabled) {
          background: rgba(245, 158, 11, 0.2);
          border-color: #f59e0b;
        }

        .nav-arrow.disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }

        /* Footer */
        .atelier-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(0deg, #0f0f15 0%, transparent 100%);
        }

        .dots {
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #333;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dot:hover {
          background: #555;
        }

        .dot.active {
          background: #f59e0b;
          width: 24px;
          border-radius: 5px;
        }

        .swipe-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .cutting-svg {
          animation: fadeIn 0.4s ease-out;
        }

        .piece-group {
          transition: opacity 0.3s;
        }

        .piece-group:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
