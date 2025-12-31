'use client';

/**
 * Visualisation de la coupe du panneau multicouche
 * Affiche les couches empilees avec leurs epaisseurs
 */

import type { CoucheMulticouche, TypeCouche } from '@/lib/configurateur-multicouche/types';
import styles from '../styles/PopupMulticouche.module.css';

interface VueCoupePanneauProps {
  couches: CoucheMulticouche[];
  epaisseurTotale: number;
  coucheOuverte: string | null;
  onCoucheClick: (coucheId: string) => void;
}

// Couleurs par type de couche
const COULEURS_COUCHE: Record<TypeCouche, string> = {
  parement: '#D4A84B',
  ame: '#8B6914',
  contrebalancement: '#4A4A4A',
  autre: '#666666',
};

export default function VueCoupePanneau({
  couches,
  epaisseurTotale,
  coucheOuverte,
  onCoucheClick,
}: VueCoupePanneauProps) {
  return (
    <div className={styles.coupePanel}>
      <div className={styles.coupeTitle}>Coupe du panneau</div>

      <div className={styles.coupeView}>
        {/* Epaisseur totale */}
        <div className={styles.coupeTotal}>
          <span className={styles.coupeTotalVal}>{epaisseurTotale.toFixed(1)}</span>
          <span className={styles.coupeTotalUnit}>mm</span>
        </div>

        {/* Couches empilees */}
        <div className={styles.coupeStack}>
          {couches.map((couche) => {
            const isActive = coucheOuverte === couche.id;

            return (
              <div
                key={couche.id}
                className={`${styles.coupeLayer} ${isActive ? styles.coupeLayerActive : ''}`}
                style={{ backgroundColor: COULEURS_COUCHE[couche.type] }}
                onClick={() => onCoucheClick(couche.id)}
              >
                <span className={styles.coupeLayerNum}>{couche.ordre}</span>
                <span className={styles.coupeLayerEp}>
                  {couche.epaisseur > 0 ? `${couche.epaisseur}` : '\u2014'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legende simple */}
      <div className={styles.coupeLegend}>
        <div>
          <span style={{ background: '#D4A84B' }} /> Parement
        </div>
        <div>
          <span style={{ background: '#8B6914' }} /> Ame
        </div>
        <div>
          <span style={{ background: '#4A4A4A' }} /> Contre.
        </div>
      </div>
    </div>
  );
}
