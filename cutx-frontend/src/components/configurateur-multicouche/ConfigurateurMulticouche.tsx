'use client';

/**
 * Configurateur Multicouche - Composant principal
 * Permet de créer des panneaux avec plusieurs couches
 */

import { useState } from 'react';
import type { ModeCollage } from '@/lib/configurateur-multicouche/types';
import ChoixModeCollage from './ChoixModeCollage';
import EditionCouches from './EditionCouches';

interface ConfigurateurMulticoucheProps {
  onBack: () => void;
}

type Etape = 'choix-mode' | 'edition';

export default function ConfigurateurMulticouche({ onBack }: ConfigurateurMulticoucheProps) {
  const [etape, setEtape] = useState<Etape>('choix-mode');
  const [modeCollage, setModeCollage] = useState<ModeCollage | null>(null);

  const handleModeSelect = (mode: ModeCollage) => {
    setModeCollage(mode);
    setEtape('edition');
  };

  const handleRetourChoix = () => {
    setEtape('choix-mode');
    setModeCollage(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {etape === 'choix-mode' && (
        <ChoixModeCollage onSelect={handleModeSelect} />
      )}

      {etape === 'edition' && modeCollage && (
        <EditionCouches
          modeCollage={modeCollage}
          onBack={handleRetourChoix}
        />
      )}
    </div>
  );
}
