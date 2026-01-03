// components/configurateur/caissons/CaissonVuesTechniques.tsx
// Composant principal des vues techniques 2D du caisson

'use client';

import { useMemo } from 'react';
import VueFace from './vues-techniques/VueFace';
import VueCote from './vues-techniques/VueCote';
import VueDessus from './vues-techniques/VueDessus';
import type { ConfigCaisson, ResultatCalculCaisson } from '@/lib/caissons/types';
import styles from './styles/VuesTechniques.module.css';

interface CaissonVuesTechniquesProps {
  config: ConfigCaisson;
  resultat: ResultatCalculCaisson | null;
  showDimensions?: boolean;
  showDrillings?: boolean;
  showHinges?: boolean;
  className?: string;
}

export default function CaissonVuesTechniques({
  config,
  resultat,
  showDimensions = true,
  showDrillings = true,
  showHinges = true,
  className = '',
}: CaissonVuesTechniquesProps) {
  // Calculer les dimensions optimales pour chaque vue
  const viewSizes = useMemo(() => {
    // Ratios des dimensions du caisson
    const hRatio = config.hauteur / Math.max(config.hauteur, config.largeur, config.profondeur);
    const lRatio = config.largeur / Math.max(config.hauteur, config.largeur, config.profondeur);
    const pRatio = config.profondeur / Math.max(config.hauteur, config.largeur, config.profondeur);

    // Tailles de base
    const baseWidth = 280;
    const baseHeight = 280;

    return {
      face: {
        width: Math.max(200, baseWidth * lRatio),
        height: Math.max(200, baseHeight * hRatio),
      },
      cote: {
        width: Math.max(150, baseWidth * pRatio * 0.8),
        height: Math.max(200, baseHeight * hRatio),
      },
      dessus: {
        width: Math.max(250, baseWidth * lRatio),
        height: Math.max(150, baseHeight * pRatio * 0.7),
      },
    };
  }, [config.hauteur, config.largeur, config.profondeur]);

  // Calculer le resume des dimensions
  const resume = useMemo(() => {
    if (!resultat) return null;

    const panneaux = resultat.panneaux;
    return {
      nombrePanneaux: panneaux.length,
      surfaceTotal: resultat.surfaceTotaleM2,
      mlChants: resultat.metresLineairesTotaux,
    };
  }, [resultat]);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header avec infos */}
      <div className={styles.header}>
        <h3 className={styles.title}>Vues Techniques</h3>
        {resume && (
          <div className={styles.resume}>
            <span>{resume.nombrePanneaux} panneaux</span>
            <span className={styles.separator}>|</span>
            <span>{resume.surfaceTotal.toFixed(3)} m²</span>
            <span className={styles.separator}>|</span>
            <span>{resume.mlChants.toFixed(2)} ml chants</span>
          </div>
        )}
      </div>

      {/* Grille des vues */}
      <div className={styles.viewsGrid}>
        {/* Ligne superieure: Vue Face + Vue Cote */}
        <div className={styles.topRow}>
          <div className={styles.viewWrapper}>
            <VueFace
              config={config}
              width={viewSizes.face.width}
              height={viewSizes.face.height}
              showDimensions={showDimensions}
              showRainure={true}
            />
          </div>

          <div className={styles.viewWrapper}>
            <VueCote
              config={config}
              width={viewSizes.cote.width}
              height={viewSizes.cote.height}
              showDimensions={showDimensions}
              showFond={true}
            />
          </div>
        </div>

        {/* Ligne inferieure: Vue Dessus */}
        <div className={styles.bottomRow}>
          <div className={styles.viewWrapper}>
            <VueDessus
              config={config}
              width={viewSizes.dessus.width}
              height={viewSizes.dessus.height}
              showDimensions={showDimensions}
              showDrillings={showDrillings}
              showHinges={showHinges}
            />
          </div>
        </div>
      </div>

      {/* Legende globale */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: '#e2e8f0', border: '1px solid #2d3748' }} />
          <span>Structure</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: '#cbd5e0', border: '1px solid #4a5568' }} />
          <span>Fond</span>
        </div>
        {config.avecFacade && (
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: 'rgba(66, 153, 225, 0.3)', border: '1px dashed #2b6cb0' }} />
            <span>Facade</span>
          </div>
        )}
        {(config.typeFond === 'rainure' || config.typeFond === 'encastre') && (
          <div className={styles.legendItem}>
            <span className={styles.legendLine} style={{ borderBottom: '2px dashed #e53e3e' }} />
            <span>Rainure</span>
          </div>
        )}
        {showDrillings && (
          <div className={styles.legendItem}>
            <span className={styles.legendLine} style={{ borderBottom: '2px dashed #d69e2e' }} />
            <span>System 32</span>
          </div>
        )}
        {showHinges && config.avecFacade && (
          <div className={styles.legendItem}>
            <span className={styles.legendCircle} style={{ backgroundColor: '#9ae6b4', border: '1px solid #38a169' }} />
            <span>Charnieres</span>
          </div>
        )}
      </div>

      {/* Tableau des dimensions */}
      {resultat && (
        <div className={styles.dimensionsTable}>
          <h4 className={styles.tableTitle}>Nomenclature des Panneaux</h4>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rep.</th>
                <th>Designation</th>
                <th>L (mm)</th>
                <th>l (mm)</th>
                <th>Ep</th>
                <th>Qte</th>
                <th>Chants</th>
              </tr>
            </thead>
            <tbody>
              {resultat.panneaux.map((panneau, index) => (
                <tr key={panneau.id}>
                  <td className={styles.cellCenter}>{panneau.nomCourt}</td>
                  <td>{panneau.nom}</td>
                  <td className={styles.cellRight}>{panneau.longueur}</td>
                  <td className={styles.cellRight}>{panneau.largeur}</td>
                  <td className={styles.cellCenter}>{panneau.epaisseur}</td>
                  <td className={styles.cellCenter}>{panneau.quantite}</td>
                  <td className={styles.cellChants}>
                    {panneau.chants.A && <span className={styles.chantBadge}>A</span>}
                    {panneau.chants.B && <span className={styles.chantBadge}>B</span>}
                    {panneau.chants.C && <span className={styles.chantBadge}>C</span>}
                    {panneau.chants.D && <span className={styles.chantBadge}>D</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
