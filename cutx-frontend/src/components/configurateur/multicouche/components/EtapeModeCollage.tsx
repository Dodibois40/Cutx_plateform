'use client';

/**
 * Etape de selection du mode de collage (fournisseur/client)
 */

import { Factory, Wrench, Check, X, Layers } from 'lucide-react';
import type { ModeCollage } from '@/lib/configurateur-multicouche/types';
import type { MulticoucheTemplate } from '@/lib/services/multicouche-templates-api';
import styles from '../styles/PopupMulticouche.module.css';

interface EtapeModeCollageProps {
  onSelectMode: (mode: ModeCollage) => void;
  onLoadTemplate: (template: MulticoucheTemplate) => void;
  onShowTemplates: () => void;
  templates: MulticoucheTemplate[];
  isSignedIn: boolean | undefined;
}

export default function EtapeModeCollage({
  onSelectMode,
  onLoadTemplate,
  onShowTemplates,
  templates,
  isSignedIn,
}: EtapeModeCollageProps) {
  return (
    <div className={styles.modeSelection}>
      <p className={styles.modeDescription}>
        Comment sera colle ce panneau multicouche ?
      </p>

      <div className={styles.modeOptions}>
        {/* Collage Fournisseur */}
        <button
          onClick={() => onSelectMode('fournisseur')}
          className={styles.modeCard}
        >
          <div className={styles.modeCardIcon}>
            <Factory size={24} />
          </div>
          <h3 className={styles.modeCardTitle}>Collage Fournisseur</h3>
          <p className={styles.modeCardDesc}>
            Le fournisseur colle les couches et livre un panneau fini aux
            dimensions exactes.
          </p>
          <ul className={styles.modeCardFeatures}>
            <li>
              <Check size={14} /> Chants disponibles
            </li>
            <li>
              <Check size={14} /> Usinages disponibles
            </li>
            <li>
              <Check size={14} /> Percage disponible
            </li>
          </ul>
        </button>

        {/* Collage Client */}
        <button
          onClick={() => onSelectMode('client')}
          className={styles.modeCard}
        >
          <div className={styles.modeCardIcon}>
            <Wrench size={24} />
          </div>
          <h3 className={styles.modeCardTitle}>Collage par mes soins</h3>
          <p className={styles.modeCardDesc}>
            Je collerai moi-meme. Sur-cote de 50mm appliquee pour la recoupe.
          </p>
          <ul className={`${styles.modeCardFeatures} ${styles.modeCardFeaturesDisabled}`}>
            <li>
              <X size={14} /> Pas de chants
            </li>
            <li>
              <X size={14} /> Pas d&apos;usinages
            </li>
            <li>
              <span className={styles.surcoteBadge}>+50mm</span> Sur-cote auto
            </li>
          </ul>
        </button>
      </div>

      {/* Templates rapides si connecte */}
      {isSignedIn && templates.length > 0 && (
        <div className={styles.quickTemplates}>
          <p className={styles.quickTemplatesLabel}>Ou charger un modele :</p>
          <div className={styles.quickTemplatesList}>
            {templates.slice(0, 3).map((t) => (
              <button
                key={t.id}
                onClick={() => onLoadTemplate(t)}
                className={styles.quickTemplateBtn}
              >
                <Layers size={14} />
                {t.nom}
              </button>
            ))}
            {templates.length > 3 && (
              <button
                onClick={onShowTemplates}
                className={`${styles.quickTemplateBtn} ${styles.quickTemplateBtnMore}`}
              >
                +{templates.length - 3} autres
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
