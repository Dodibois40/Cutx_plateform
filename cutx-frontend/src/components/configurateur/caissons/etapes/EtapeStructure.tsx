'use client';

// components/configurateur/caissons/etapes/EtapeStructure.tsx
// Etape 1: Configuration de la structure - Design CutX

import { AlertTriangle, Info } from 'lucide-react';
import type { ConfigCaisson } from '@/lib/caissons/types';
import type { UseCaissonCalculsReturn } from '@/hooks/useCaissonCalculs';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import { DIMENSIONS, EPAISSEURS_STRUCTURE } from '@/lib/caissons/constants';
import styles from '../styles/PopupCaisson.module.css';

interface EtapeStructureProps {
  config: ConfigCaisson;
  caisson: UseCaissonCalculsReturn;
  panneauxCatalogue: PanneauCatalogue[];
  validation: { isValid: boolean; erreurs: string[] };
  onOpenPanelSelector?: () => void;
}

export default function EtapeStructure({
  config,
  caisson,
  panneauxCatalogue,
  validation,
  onOpenPanelSelector,
}: EtapeStructureProps) {
  const {
    setHauteur,
    setLargeur,
    setProfondeur,
    setEpaisseurStructure,
    setPanneauStructure,
    templateActif,
  } = caisson;

  return (
    <div>
      {/* Info template */}
      {templateActif && (
        <div className={styles.infoBox} style={{ marginBottom: 20 }}>
          <Info size={18} className={styles.infoBoxIcon} />
          <div className={styles.infoBoxText}>
            <strong>Template: {templateActif.nom}</strong>
            <br />
            Dimensions recommandees: H {templateActif.hauteurMin}-{templateActif.hauteurMax}mm,
            L {templateActif.largeurMin}-{templateActif.largeurMax}mm
          </div>
        </div>
      )}

      {/* Dimensions */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Dimensions exterieures</h4>
        <div className={styles.inputGroup}>
          <div className={styles.inputField}>
            <label className={styles.inputLabel}>Hauteur (mm)</label>
            <input
              type="number"
              className={styles.input}
              value={config.hauteur || ''}
              onChange={(e) => setHauteur(Number(e.target.value))}
              placeholder="Ex: 720"
              min={DIMENSIONS.HAUTEUR_MIN}
              max={DIMENSIONS.HAUTEUR_MAX}
            />
            <span className={styles.inputHint}>
              {DIMENSIONS.HAUTEUR_MIN} - {DIMENSIONS.HAUTEUR_MAX}
            </span>
          </div>
          <div className={styles.inputField}>
            <label className={styles.inputLabel}>Largeur (mm)</label>
            <input
              type="number"
              className={styles.input}
              value={config.largeur || ''}
              onChange={(e) => setLargeur(Number(e.target.value))}
              placeholder="Ex: 600"
              min={DIMENSIONS.LARGEUR_MIN}
              max={DIMENSIONS.LARGEUR_MAX}
            />
            <span className={styles.inputHint}>
              {DIMENSIONS.LARGEUR_MIN} - {DIMENSIONS.LARGEUR_MAX}
            </span>
          </div>
          <div className={styles.inputField}>
            <label className={styles.inputLabel}>Profondeur (mm)</label>
            <input
              type="number"
              className={styles.input}
              value={config.profondeur || ''}
              onChange={(e) => setProfondeur(Number(e.target.value))}
              placeholder="Ex: 560"
              min={DIMENSIONS.PROFONDEUR_MIN}
              max={DIMENSIONS.PROFONDEUR_MAX}
            />
            <span className={styles.inputHint}>
              {DIMENSIONS.PROFONDEUR_MIN} - {DIMENSIONS.PROFONDEUR_MAX}
            </span>
          </div>
        </div>
      </div>

      {/* Epaisseur */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Epaisseur structure</h4>
        <div className={styles.buttonGroup}>
          {EPAISSEURS_STRUCTURE.map((ep) => (
            <button
              key={ep}
              className={`${styles.optionBtn} ${config.epaisseurStructure === ep ? styles.optionBtnActive : ''}`}
              onClick={() => setEpaisseurStructure(ep)}
            >
              {ep}mm
            </button>
          ))}
        </div>
      </div>

      {/* Selection panneau */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Panneau structure</h4>

        {config.panneauStructure ? (
          <div className={`${styles.panelSelector} ${styles.panelSelectorFilled}`}>
            {config.panneauStructure.imageUrl && (
              <img
                src={config.panneauStructure.imageUrl}
                alt={config.panneauStructure.nom}
                className={styles.panelSelectorImage}
              />
            )}
            <div className={styles.panelSelectorInfo}>
              <span className={styles.panelSelectorName}>{config.panneauStructure.nom}</span>
              <span className={styles.panelSelectorMeta}>
                {config.panneauStructure.id.slice(0, 8)} - {Object.values(config.panneauStructure.prixM2 || {})[0]?.toFixed(2) || '0.00'} EUR/m2
              </span>
            </div>
            <button
              className={styles.panelSelectorChange}
              onClick={onOpenPanelSelector}
            >
              Changer
            </button>
          </div>
        ) : (
          <div className={`${styles.panelSelector} ${styles.panelSelectorEmpty}`}>
            <p style={{ marginBottom: 8 }}>Aucun panneau selectionne</p>
            <button className={styles.optionBtn} onClick={onOpenPanelSelector}>
              Selectionner un panneau
            </button>
          </div>
        )}
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
        <h4 className={styles.calculatedTitle}>Dimensions calculees</h4>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>Interieur utile</span>
          <span className={styles.calculatedValue}>
            {config.hauteur - 2 * config.epaisseurStructure} x {config.largeur - 2 * config.epaisseurStructure} x {config.profondeur}mm
          </span>
        </div>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>Cote gauche/droite</span>
          <span className={styles.calculatedValue}>
            {config.hauteur} x {config.profondeur}mm (x2)
          </span>
        </div>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>Dessus/dessous</span>
          <span className={styles.calculatedValue}>
            {config.largeur - 2 * config.epaisseurStructure} x {config.profondeur}mm (x2)
          </span>
        </div>
      </div>
    </div>
  );
}
