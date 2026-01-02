'use client';

// components/configurateur/caissons/etapes/EtapeFond.tsx
// Etape 2: Configuration du fond - Design CutX

import { AlertTriangle, Info } from 'lucide-react';
import type { ConfigCaisson } from '@/lib/caissons/types';
import type { UseCaissonCalculsReturn } from '@/hooks/useCaissonCalculs';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import { OPTIONS_TYPE_FOND, EPAISSEURS_FOND, PROFONDEURS_RAINURE } from '@/lib/caissons/constants';
import styles from '../styles/PopupCaisson.module.css';

interface EtapeFondProps {
  config: ConfigCaisson;
  caisson: UseCaissonCalculsReturn;
  panneauxCatalogue: PanneauCatalogue[];
  validation: { isValid: boolean; erreurs: string[] };
}

export default function EtapeFond({
  config,
  caisson,
  panneauxCatalogue,
  validation,
}: EtapeFondProps) {
  const {
    setTypeFond,
    setEpaisseurFond,
    setProfondeurRainure,
    setPanneauFond,
  } = caisson;

  // Afficher le champ rainure seulement si necessaire
  const showRainure = config.typeFond === 'rainure' || config.typeFond === 'encastre';

  // Calculer les dimensions du fond
  const calculerDimensionsFond = () => {
    const ep = config.epaisseurStructure;
    const rainure = config.profondeurRainure;

    switch (config.typeFond) {
      case 'applique':
        return {
          longueur: config.hauteur,
          largeur: config.largeur - 2 * ep,
        };
      case 'encastre':
      case 'rainure':
        return {
          longueur: config.hauteur - 2 * rainure,
          largeur: config.largeur - 2 * ep + 2 * rainure,
        };
      case 'feuillure':
        return {
          longueur: config.hauteur - 2 * ep,
          largeur: config.largeur - 2 * ep,
        };
      default:
        return {
          longueur: config.hauteur,
          largeur: config.largeur - 2 * ep,
        };
    }
  };

  const dimFond = calculerDimensionsFond();

  return (
    <div>
      {/* Type de fond */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Type de montage du fond</h4>
        <div className={styles.cardGrid}>
          {OPTIONS_TYPE_FOND.map((option) => (
            <button
              key={option.value}
              onClick={() => setTypeFond(option.value)}
              className={`${styles.optionCard} ${config.typeFond === option.value ? styles.optionCardActive : ''}`}
            >
              <span className={styles.optionCardTitle}>{option.label}</span>
              <span className={styles.optionCardDesc}>{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profondeur rainure (si applicable) */}
      {showRainure && (
        <div className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Profondeur de rainure</h4>
          <div className={styles.buttonGroup}>
            {PROFONDEURS_RAINURE.map((prof) => (
              <button
                key={prof}
                className={`${styles.optionBtn} ${config.profondeurRainure === prof ? styles.optionBtnActive : ''}`}
                onClick={() => setProfondeurRainure(prof)}
              >
                {prof}mm
              </button>
            ))}
          </div>
          <span className={styles.inputHint}>
            Profondeur de la rainure dans les panneaux structure
          </span>
        </div>
      )}

      {/* Epaisseur fond */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Epaisseur du fond</h4>
        <div className={styles.buttonGroup}>
          {EPAISSEURS_FOND.map((ep) => (
            <button
              key={ep}
              className={`${styles.optionBtn} ${config.epaisseurFond === ep ? styles.optionBtnActive : ''}`}
              onClick={() => setEpaisseurFond(ep)}
            >
              {ep}mm
            </button>
          ))}
        </div>
      </div>

      {/* Selection panneau fond */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Panneau fond</h4>
        <span className={styles.inputHint} style={{ marginBottom: 12, display: 'block' }}>
          Generalement un panneau plus fin que la structure (contreplaque, HDF...).
        </span>

        {config.panneauFond ? (
          <div className={`${styles.panelSelector} ${styles.panelSelectorFilled}`}>
            {config.panneauFond.imageUrl && (
              <img
                src={config.panneauFond.imageUrl}
                alt={config.panneauFond.nom}
                className={styles.panelSelectorImage}
              />
            )}
            <div className={styles.panelSelectorInfo}>
              <span className={styles.panelSelectorName}>{config.panneauFond.nom}</span>
              <span className={styles.panelSelectorMeta}>
                {config.panneauFond.id.slice(0, 8)} - {Object.values(config.panneauFond.prixM2 || {})[0]?.toFixed(2) || '0.00'} EUR/m2
              </span>
            </div>
            <button
              className={styles.panelSelectorChange}
              onClick={() => setPanneauFond(null)}
            >
              Changer
            </button>
          </div>
        ) : (
          <div className={`${styles.panelSelector} ${styles.panelSelectorEmpty}`}>
            <p style={{ marginBottom: 8 }}>Aucun panneau selectionne</p>
            <button className={styles.optionBtn}>
              Selectionner un panneau
            </button>
          </div>
        )}
      </div>

      {/* Info sur le type choisi */}
      <div className={styles.infoBox}>
        <Info size={18} className={styles.infoBoxIcon} />
        <div className={styles.infoBoxText}>
          {config.typeFond === 'applique' && (
            <p>Le fond sera visse a l'arriere du caisson. Simple et rapide a monter.</p>
          )}
          {config.typeFond === 'encastre' && (
            <p>Le fond sera insere dans des rainures. Plus solide et esthetique.</p>
          )}
          {config.typeFond === 'feuillure' && (
            <p>Le fond sera pose dans une feuillure. Bonne finition, montage facile.</p>
          )}
          {config.typeFond === 'rainure' && (
            <p>Le fond glissera dans des rainures. Permet le demontage si necessaire.</p>
          )}
        </div>
      </div>

      {/* Erreurs de validation */}
      {!validation.isValid && validation.erreurs.length > 0 && (
        <div className={styles.errorBox}>
          <AlertTriangle size={18} className={styles.errorIcon} />
          <div className={styles.errorContent}>
            <h4>Erreurs de validation</h4>
            <ul className={styles.errorList}>
              {validation.erreurs.map((erreur, index) => (
                <li key={index}>{erreur}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recap calcule */}
      <div className={styles.calculatedBox}>
        <h4 className={styles.calculatedTitle}>Panneau fond calcule</h4>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>Dimensions</span>
          <span className={styles.calculatedValue}>
            {dimFond.longueur} x {dimFond.largeur}mm
          </span>
        </div>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>Epaisseur</span>
          <span className={styles.calculatedValue}>{config.epaisseurFond}mm</span>
        </div>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>Surface</span>
          <span className={styles.calculatedValue}>
            {((dimFond.longueur * dimFond.largeur) / 1000000).toFixed(3)} m2
          </span>
        </div>
      </div>
    </div>
  );
}
