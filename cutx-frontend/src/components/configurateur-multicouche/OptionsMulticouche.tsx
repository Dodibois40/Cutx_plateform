'use client';

/**
 * Options disponibles pour un panneau multicouche (mode fournisseur uniquement)
 * - Placage de chants (A, B, C, D)
 * - Perçage
 */

import { Drill } from 'lucide-react';

interface Chants {
  A: boolean;
  B: boolean;
  C: boolean;
  D: boolean;
}

interface OptionsMulticoucheProps {
  chants: Chants;
  percage: boolean;
  epaisseurTotale: number;
  onChantsChange: (chants: Chants) => void;
  onPercageChange: (percage: boolean) => void;
  disabled?: boolean;
}

export default function OptionsMulticouche({
  chants,
  percage,
  epaisseurTotale,
  onChantsChange,
  onPercageChange,
  disabled = false,
}: OptionsMulticoucheProps) {
  const toggleChant = (cote: keyof Chants) => {
    if (disabled) return;
    onChantsChange({ ...chants, [cote]: !chants[cote] });
  };

  const toggleAllChants = () => {
    if (disabled) return;
    const allSelected = chants.A && chants.B && chants.C && chants.D;
    onChantsChange({
      A: !allSelected,
      B: !allSelected,
      C: !allSelected,
      D: !allSelected,
    });
  };

  const chantsCount = Object.values(chants).filter(Boolean).length;

  return (
    <div className={`space-y-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Placage de chants */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white">Placage de chants</h4>
          <button
            onClick={toggleAllChants}
            className="text-xs text-amber-500 hover:text-amber-400"
          >
            {chantsCount === 4 ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        </div>

        {/* Visualisation du panneau */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-24">
            {/* Panneau central */}
            <div className="absolute inset-4 bg-white/10 rounded border border-white/20 flex items-center justify-center">
              <span className="text-xs text-white/40">{epaisseurTotale.toFixed(1)}mm</span>
            </div>

            {/* Chant A (haut) */}
            <button
              onClick={() => toggleChant('A')}
              className={`absolute top-0 left-4 right-4 h-4 rounded-t flex items-center justify-center text-xs font-bold transition-colors ${
                chants.A
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/10 text-white/40 hover:bg-white/20'
              }`}
            >
              A
            </button>

            {/* Chant B (gauche) */}
            <button
              onClick={() => toggleChant('B')}
              className={`absolute top-4 bottom-4 left-0 w-4 rounded-l flex items-center justify-center text-xs font-bold transition-colors ${
                chants.B
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/10 text-white/40 hover:bg-white/20'
              }`}
            >
              B
            </button>

            {/* Chant C (bas) */}
            <button
              onClick={() => toggleChant('C')}
              className={`absolute bottom-0 left-4 right-4 h-4 rounded-b flex items-center justify-center text-xs font-bold transition-colors ${
                chants.C
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/10 text-white/40 hover:bg-white/20'
              }`}
            >
              C
            </button>

            {/* Chant D (droite) */}
            <button
              onClick={() => toggleChant('D')}
              className={`absolute top-4 bottom-4 right-0 w-4 rounded-r flex items-center justify-center text-xs font-bold transition-colors ${
                chants.D
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/10 text-white/40 hover:bg-white/20'
              }`}
            >
              D
            </button>
          </div>
        </div>

        <p className="text-xs text-white/60 text-center">
          {chantsCount === 0
            ? 'Cliquez sur un côté pour ajouter un chant'
            : `${chantsCount} chant${chantsCount > 1 ? 's' : ''} sélectionné${chantsCount > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Perçage */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
        <button
          onClick={() => !disabled && onPercageChange(!percage)}
          className={`w-full flex items-center gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            percage ? 'bg-amber-500' : 'bg-white/10'
          }`}>
            <Drill className={`w-5 h-5 ${percage ? 'text-black' : 'text-white/60'}`} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white">Perçage</p>
            <p className="text-xs text-white/60">
              Prévoir les perçages pour montage
            </p>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
            percage ? 'bg-amber-500' : 'bg-white/20'
          }`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              percage ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </div>
        </button>
      </div>

      {disabled && (
        <p className="text-xs text-white/40 text-center">
          Options non disponibles avec le mode &quot;Collage par mes soins&quot;
        </p>
      )}
    </div>
  );
}
