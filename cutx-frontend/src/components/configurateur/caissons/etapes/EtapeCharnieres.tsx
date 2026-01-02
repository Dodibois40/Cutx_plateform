'use client';

// components/configurateur/caissons/etapes/EtapeCharnieres.tsx
// Etape 4: Configuration des charnieres - Design CutX

import { AlertTriangle, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ConfigCaisson } from '@/lib/caissons/types';
import type { UseCaissonCalculsReturn } from '@/hooks/useCaissonCalculs';
import {
  OPTIONS_MARQUE_CHARNIERE,
  OPTIONS_TYPE_CHARNIERE,
  OPTIONS_ANGLE_CHARNIERE,
  calculerNombreCharnieres,
  CHARNIERES_BLUM,
} from '@/lib/caissons/constants';
import styles from '../styles/PopupCaisson.module.css';

interface EtapeCharnièresProps {
  config: ConfigCaisson;
  caisson: UseCaissonCalculsReturn;
  validation: { isValid: boolean; erreurs: string[] };
}

export default function EtapeCharnieres({
  config,
  caisson,
  validation,
}: EtapeCharnièresProps) {
  const {
    setPositionCharniere,
    setMarqueCharniere,
    setTypeCharniere,
    setAngleCharniere,
  } = caisson;

  // Calculer le nombre de charnieres automatiquement
  const hauteurFacade = config.hauteur - config.jeuFacade;
  const nombreCharnieres = calculerNombreCharnieres(hauteurFacade);

  // Prix des charnieres (Blum uniquement pour l'instant)
  const charniere = config.angleCharniere === 155
    ? CHARNIERES_BLUM.CLIP_TOP_BLUMOTION_155
    : CHARNIERES_BLUM.CLIP_TOP_BLUMOTION_110;

  const prixUnitaireTotal = charniere.prixUnitaire + charniere.embase.prixUnitaire + charniere.cache.prixUnitaire;
  const prixTotalCharnieres = prixUnitaireTotal * nombreCharnieres;

  if (!config.avecFacade) {
    return (
      <div>
        <div className={styles.warningBox} style={{ marginTop: 20, textAlign: 'center', padding: 24 }}>
          <p style={{ fontWeight: 500, marginBottom: 8 }}>Pas de charnieres necessaires</p>
          <p style={{ opacity: 0.7 }}>
            Le caisson est configure sans facade. Vous pouvez passer a la validation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Position ouverture */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Position de l'ouverture</h4>
        <div className={styles.cardGrid}>
          <button
            onClick={() => setPositionCharniere('gauche')}
            className={`${styles.optionCard} ${config.positionCharniere === 'gauche' ? styles.optionCardActive : ''}`}
            style={{ textAlign: 'center', padding: 20 }}
          >
            <ArrowLeft size={32} style={{ marginBottom: 8, opacity: 0.8 }} />
            <span className={styles.optionCardTitle}>Ouverture a gauche</span>
            <span className={styles.optionCardDesc}>Charnieres a droite</span>
          </button>

          <button
            onClick={() => setPositionCharniere('droite')}
            className={`${styles.optionCard} ${config.positionCharniere === 'droite' ? styles.optionCardActive : ''}`}
            style={{ textAlign: 'center', padding: 20 }}
          >
            <ArrowRight size={32} style={{ marginBottom: 8, opacity: 0.8 }} />
            <span className={styles.optionCardTitle}>Ouverture a droite</span>
            <span className={styles.optionCardDesc}>Charnieres a gauche</span>
          </button>
        </div>
      </div>

      {/* Marque */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Marque de charnieres</h4>
        <div className={styles.buttonGroup}>
          {OPTIONS_MARQUE_CHARNIERE.map((option) => (
            <button
              key={option.value}
              className={`${styles.optionBtn} ${config.marqueCharniere === option.value ? styles.optionBtnActive : ''}`}
              onClick={() => setMarqueCharniere(option.value)}
              disabled={option.value !== 'blum'}
              style={option.value !== 'blum' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {option.label}
              {option.value !== 'blum' && (
                <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>(bientot)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Type de charniere */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Type de charniere</h4>
        <div className={styles.cardGrid}>
          {OPTIONS_TYPE_CHARNIERE.map((option) => (
            <button
              key={option.value}
              onClick={() => setTypeCharniere(option.value)}
              className={`${styles.optionCard} ${config.typeCharniere === option.value ? styles.optionCardActive : ''}`}
            >
              <span className={styles.optionCardTitle}>{option.label}</span>
              <span className={styles.optionCardDesc}>{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Angle d'ouverture */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Angle d'ouverture</h4>
        <div className={styles.buttonGroup}>
          {OPTIONS_ANGLE_CHARNIERE.filter(o => o.value === 110 || o.value === 155).map((option) => (
            <button
              key={option.value}
              className={`${styles.optionBtn} ${config.angleCharniere === option.value ? styles.optionBtnActive : ''}`}
              onClick={() => setAngleCharniere(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className={styles.inputHint}>
          110 degres pour usage standard, 155 degres pour acces maximal
        </span>
      </div>

      {/* Info nombre charnieres */}
      <div className={styles.infoBox}>
        <Info size={18} className={styles.infoBoxIcon} />
        <div className={styles.infoBoxText}>
          <p>
            <strong>{nombreCharnieres} charnieres</strong> seront necessaires pour une facade
            de {hauteurFacade}mm de hauteur (regle Blum).
          </p>
        </div>
      </div>

      {/* Recap charnieres */}
      <div className={styles.calculatedBox}>
        <h4 className={styles.calculatedTitle}>Recapitulatif charnieres</h4>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>{charniere.nom}</span>
          <span className={styles.calculatedValue}>
            x{nombreCharnieres} = {(charniere.prixUnitaire * nombreCharnieres).toFixed(2)} EUR
          </span>
        </div>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>{charniere.embase.nom}</span>
          <span className={styles.calculatedValue}>
            x{nombreCharnieres} = {(charniere.embase.prixUnitaire * nombreCharnieres).toFixed(2)} EUR
          </span>
        </div>
        <div className={styles.calculatedRow}>
          <span className={styles.calculatedLabel}>{charniere.cache.nom}</span>
          <span className={styles.calculatedValue}>
            x{nombreCharnieres} = {(charniere.cache.prixUnitaire * nombreCharnieres).toFixed(2)} EUR
          </span>
        </div>
        <div className={styles.calculatedRow} style={{
          marginTop: 8,
          paddingTop: 12,
          borderTop: '1px solid rgba(196, 168, 124, 0.2)',
          fontWeight: 600
        }}>
          <span className={styles.calculatedLabel}>Total charnieres</span>
          <span className={styles.calculatedValue} style={{ color: 'var(--cx-accent, #c4a87c)' }}>
            {prixTotalCharnieres.toFixed(2)} EUR HT
          </span>
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
    </div>
  );
}
