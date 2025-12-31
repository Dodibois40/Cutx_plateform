'use client';

/**
 * Étape 1 : Choix du mode de collage
 * - Fournisseur : panneau livré collé, toutes options disponibles
 * - Client : couches livrées séparément, sur-cote recommandée
 */

import { Factory, Wrench, Check, X } from 'lucide-react';
import type { ModeCollage } from '@/lib/configurateur-multicouche/types';

interface ChoixModeCollageProps {
  onSelect: (mode: ModeCollage) => void;
}

export default function ChoixModeCollage({ onSelect }: ChoixModeCollageProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">
          Comment sera collé ce panneau ?
        </h2>
        <p className="text-white/60 text-lg">
          Ce choix détermine les options disponibles pour votre panneau multicouche
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Collage Fournisseur */}
        <button
          onClick={() => onSelect('fournisseur')}
          className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 rounded-2xl p-8 text-left transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <Factory className="w-7 h-7 text-green-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white">
              Collage Fournisseur
            </h3>
          </div>

          <p className="text-white/70 mb-6 leading-relaxed">
            Le fournisseur colle les couches et livre un panneau fini
            aux dimensions exactes demandées.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-green-400">
              <Check className="w-5 h-5" />
              <span>Placage de chants</span>
            </div>
            <div className="flex items-center gap-3 text-green-400">
              <Check className="w-5 h-5" />
              <span>Usinages</span>
            </div>
            <div className="flex items-center gap-3 text-green-400">
              <Check className="w-5 h-5" />
              <span>Perçage</span>
            </div>
            <div className="flex items-center gap-3 text-green-400">
              <Check className="w-5 h-5" />
              <span>Finition (Vernis/Laque)</span>
            </div>
          </div>

          <div className="mt-8 flex items-center text-green-500 font-medium">
            Choisir ce mode →
          </div>
        </button>

        {/* Collage Client */}
        <button
          onClick={() => onSelect('client')}
          className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/50 rounded-2xl p-8 text-left transition-all duration-300"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
              <Wrench className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white">
              Collage par mes soins
            </h3>
          </div>

          <p className="text-white/70 mb-6 leading-relaxed">
            Je collerai moi-même les couches après réception.
            Une sur-cote de 50mm sera appliquée pour la recoupe.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-amber-400">
              <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded">+50mm</span>
              <span>Sur-cote automatique</span>
            </div>
            <div className="flex items-center gap-3 text-white/40">
              <X className="w-5 h-5" />
              <span>Placage de chants</span>
            </div>
            <div className="flex items-center gap-3 text-white/40">
              <X className="w-5 h-5" />
              <span>Usinages</span>
            </div>
            <div className="flex items-center gap-3 text-white/40">
              <X className="w-5 h-5" />
              <span>Perçage / Finition</span>
            </div>
          </div>

          <div className="mt-8 flex items-center text-amber-500 font-medium">
            Choisir ce mode →
          </div>
        </button>
      </div>
    </div>
  );
}
