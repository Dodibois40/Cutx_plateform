'use client';

// components/configurateur/caissons/etapes/EtapeFacade.tsx
// Etape 3: Configuration de la facade - Design CutX

import { AlertTriangle, Info, Check } from 'lucide-react';
import type { ConfigCaisson } from '@/lib/caissons/types';
import type { UseCaissonCalculsReturn } from '@/hooks/useCaissonCalculs';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import { OPTIONS_TYPE_FACADE, EPAISSEURS_FACADE, JEUX_FACADE } from '@/lib/caissons/constants';
import styles from '../styles/PopupCaisson.module.css';

interface EtapeFacadeProps {
  config: ConfigCaisson;
  caisson: UseCaissonCalculsReturn;
  panneauxCatalogue: PanneauCatalogue[];
  validation: { isValid: boolean; erreurs: string[] };
}

export default function EtapeFacade({
  config,
  caisson,
  panneauxCatalogue,
  validation,
}: EtapeFacadeProps) {
  const {
    setAvecFacade,
    setTypeFacade,
    setEpaisseurFacade,
    setJeuFacade,
    setPanneauFacade,
  } = caisson;

  // Calculer les dimensions de la facade
  const calculerDimensionsFacade = () => {
    const jeu = config.jeuFacade;
    const ep = config.epaisseurStructure;

    if (config.typeFacade === 'encastre') {
      return {
        longueur: config.hauteur - 2 * jeu,
        largeur: config.largeur - 2 * ep - 2 * jeu,
      };
    }
    // Applique par defaut
    return {
      longueur: config.hauteur - jeu,
      largeur: config.largeur - jeu,
    };
  };

  const dimFacade = calculerDimensionsFacade();

  return (
    <div>
      {/* Toggle facade */}
      <div className={styles.formSection}>
        <button
          onClick={() => setAvecFacade(!config.avecFacade)}
          className={styles.checkboxRow}
        >
          <div className={`${styles.checkbox} ${config.avecFacade ? styles.checkboxChecked : ''}`}>
            {config.avecFacade && <Check size={14} />}
          </div>
          <div className={styles.checkboxContent}>
            <span className={styles.checkboxLabel}>Ajouter une facade (porte)</span>
            <span className={styles.checkboxHint}>Decochez pour un caisson ouvert ou avec tiroirs</span>
          </div>
        </button>
      </div>

      {config.avecFacade && (
        <>
          {/* Type de facade */}
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>Type de montage de la facade</h4>
            <div className={styles.cardGrid}>
              {OPTIONS_TYPE_FACADE.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTypeFacade(option.value)}
                  className={`${styles.optionCard} ${config.typeFacade === option.value ? styles.optionCardActive : ''}`}
                >
                  <span className={styles.optionCardTitle}>{option.label}</span>
                  <span className={styles.optionCardDesc}>{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Jeu facade */}
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>Jeu autour de la facade</h4>
            <div className={styles.buttonGroup}>
              {JEUX_FACADE.map((jeu) => (
                <button
                  key={jeu}
                  className={`${styles.optionBtn} ${config.jeuFacade === jeu ? styles.optionBtnActive : ''}`}
                  onClick={() => setJeuFacade(jeu)}
                >
                  {jeu}mm
                </button>
              ))}
            </div>
            <span className={styles.inputHint}>
              Espace entre la facade et le corps du caisson
            </span>
          </div>

          {/* Epaisseur facade */}
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>Epaisseur de la facade</h4>
            <div className={styles.buttonGroup}>
              {EPAISSEURS_FACADE.map((ep) => (
                <button
                  key={ep}
                  className={`${styles.optionBtn} ${config.epaisseurFacade === ep ? styles.optionBtnActive : ''}`}
                  onClick={() => setEpaisseurFacade(ep)}
                >
                  {ep}mm
                </button>
              ))}
            </div>
          </div>

          {/* Selection panneau facade */}
          <div className={styles.formSection}>
            <h4 className={styles.formSectionTitle}>Panneau facade</h4>
            <span className={styles.inputHint} style={{ marginBottom: 12, display: 'block' }}>
              La facade peut etre d'un panneau different de la structure.
            </span>

            {config.panneauFacade ? (
              <div className={`${styles.panelSelector} ${styles.panelSelectorFilled}`}>
                {config.panneauFacade.imageUrl && (
                  <img
                    src={config.panneauFacade.imageUrl}
                    alt={config.panneauFacade.nom}
                    className={styles.panelSelectorImage}
                  />
                )}
                <div className={styles.panelSelectorInfo}>
                  <span className={styles.panelSelectorName}>{config.panneauFacade.nom}</span>
                  <span className={styles.panelSelectorMeta}>
                    {config.panneauFacade.id.slice(0, 8)} - {Object.values(config.panneauFacade.prixM2 || {})[0]?.toFixed(2) || '0.00'} EUR/m2
                  </span>
                </div>
                <button
                  className={styles.panelSelectorChange}
                  onClick={() => setPanneauFacade(null)}
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

          {/* Info type facade */}
          <div className={styles.infoBox}>
            <Info size={18} className={styles.infoBoxIcon} />
            <div className={styles.infoBoxText}>
              {config.typeFacade === 'applique' ? (
                <p>
                  La facade recouvre les cotes du caisson. C'est le montage le plus courant
                  en cuisine. Les charnieres seront des charnieres standard 110 degres.
                </p>
              ) : (
                <p>
                  La facade s'insere entre les cotes. Montage plus technique mais finition
                  soignee. Necessite un reglage precis des charnieres.
                </p>
              )}
            </div>
          </div>

          {/* Recap calcule */}
          <div className={styles.calculatedBox}>
            <h4 className={styles.calculatedTitle}>Panneau facade calcule</h4>
            <div className={styles.calculatedRow}>
              <span className={styles.calculatedLabel}>Dimensions</span>
              <span className={styles.calculatedValue}>
                {dimFacade.longueur} x {dimFacade.largeur}mm
              </span>
            </div>
            <div className={styles.calculatedRow}>
              <span className={styles.calculatedLabel}>Epaisseur</span>
              <span className={styles.calculatedValue}>{config.epaisseurFacade}mm</span>
            </div>
            <div className={styles.calculatedRow}>
              <span className={styles.calculatedLabel}>Surface</span>
              <span className={styles.calculatedValue}>
                {((dimFacade.longueur * dimFacade.largeur) / 1000000).toFixed(3)} m2
              </span>
            </div>
            <div className={styles.calculatedRow}>
              <span className={styles.calculatedLabel}>Chants</span>
              <span className={styles.calculatedValue}>
                {(2 * (dimFacade.longueur + dimFacade.largeur) / 1000).toFixed(2)} ml (4 cotes)
              </span>
            </div>
          </div>
        </>
      )}

      {!config.avecFacade && (
        <div className={styles.warningBox}>
          <p>Caisson sans facade - ideal pour un meuble ouvert ou avec tiroirs</p>
        </div>
      )}

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
    </div>
  );
}
