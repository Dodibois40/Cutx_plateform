'use client';

// components/configurateur/caissons/etapes/EtapeCharnieres.tsx
// Etape 4: Configuration des charnieres avec embases et percages Blum

import { useState } from 'react';
import { AlertTriangle, Info, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Target } from 'lucide-react';
import type { ConfigCaisson } from '@/lib/caissons/types';
import type { UseCaissonCalculsReturn } from '@/hooks/useCaissonCalculs';
import {
  OPTIONS_MARQUE_CHARNIERE,
  OPTIONS_TYPE_CHARNIERE,
  OPTIONS_ANGLE_CHARNIERE,
} from '@/lib/caissons/constants';
import {
  CHARNIERES_BLUM_CATALOGUE,
  LABELS_TYPE_EMBASE,
  calculerNombreCharnieres,
  calculerPositionsYCharnieres,
  calculerPrixQuincaillerie,
  getEmbaseByType,
  type TypeEmbaseBlum,
} from '@/lib/caissons/blum-hardware';
import {
  calculerTousPercagesCharnieres,
  type PercageAbsolu,
} from '@/lib/caissons/calcul-percages';
import styles from '../styles/PopupCaisson.module.css';

interface EtapeCharnièresProps {
  config: ConfigCaisson;
  caisson: UseCaissonCalculsReturn;
  validation: { isValid: boolean; erreurs: string[] };
}

// Types d'embases disponibles
const TYPES_EMBASE: TypeEmbaseBlum[] = [
  'EXPANDO_0mm',
  'EXPANDO_3mm',
  'WING_0mm',
  'INSERTA_0mm',
];

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
    setReferenceCharniere,
    setTypeEmbase,
  } = caisson;

  // State pour afficher/masquer les details de percage
  const [showPercageDetails, setShowPercageDetails] = useState(false);

  // Calculer le nombre de charnieres automatiquement
  const hauteurFacade = config.hauteur - config.jeuFacade;
  const nombreCharnieres = calculerNombreCharnieres(hauteurFacade);
  const positionsY = calculerPositionsYCharnieres(hauteurFacade);

  // Obtenir la charniere selectionnee
  const charniereRef = config.referenceCharniere || '71B3590';
  const charniere = CHARNIERES_BLUM_CATALOGUE[charniereRef];

  // Obtenir l'embase selectionnee
  const typeEmbase = config.typeEmbase || 'EXPANDO_0mm';
  const embase = getEmbaseByType(typeEmbase);

  // Calculer les prix
  const prixQuincaillerie = calculerPrixQuincaillerie(
    charniereRef,
    typeEmbase,
    nombreCharnieres,
    true // avec caches
  );

  // Calculer les percages
  const percages = calculerTousPercagesCharnieres(config, typeEmbase);

  // Charnieres disponibles selon l'angle
  const charnièresParAngle = Object.values(CHARNIERES_BLUM_CATALOGUE).filter(
    c => c.angle === config.angleCharniere
  );

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

      {/* Type de charniere (reference) */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Modele de charniere</h4>
        <div className={styles.cardGrid}>
          {charnièresParAngle.map((c) => (
            <button
              key={c.reference}
              onClick={() => setReferenceCharniere(c.reference)}
              className={`${styles.optionCard} ${config.referenceCharniere === c.reference ? styles.optionCardActive : ''}`}
            >
              <span className={styles.optionCardTitle}>{c.nom}</span>
              <span className={styles.optionCardDesc}>
                Ref: {c.reference} - {c.prixUnitaireHT.toFixed(2)} EUR/u
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Type d'embase */}
      <div className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Type d'embase</h4>
        <div className={styles.cardGrid}>
          {TYPES_EMBASE.map((type) => {
            const label = LABELS_TYPE_EMBASE[type];
            const embaseSpec = getEmbaseByType(type);
            return (
              <button
                key={type}
                onClick={() => setTypeEmbase(type)}
                className={`${styles.optionCard} ${config.typeEmbase === type ? styles.optionCardActive : ''}`}
              >
                <span className={styles.optionCardTitle}>{label.label}</span>
                <span className={styles.optionCardDesc}>
                  {label.description}
                </span>
                <span style={{ fontSize: 11, opacity: 0.7, marginTop: 4, display: 'block' }}>
                  Ref: {embaseSpec.reference} - {embaseSpec.prixUnitaireHT.toFixed(2)} EUR/u
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info nombre charnieres */}
      <div className={styles.infoBox}>
        <Info size={18} className={styles.infoBoxIcon} />
        <div className={styles.infoBoxText}>
          <p>
            <strong>{nombreCharnieres} charnieres</strong> seront necessaires pour une facade
            de {hauteurFacade.toFixed(0)}mm de hauteur.
          </p>
          <p style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
            Positions Y: {positionsY.map(y => `${y.toFixed(0)}mm`).join(', ')}
          </p>
        </div>
      </div>

      {/* Details percages (accordeon) */}
      <div className={styles.formSection}>
        <button
          onClick={() => setShowPercageDetails(!showPercageDetails)}
          className={styles.accordionHeader}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(196, 168, 124, 0.1)',
            border: '1px solid rgba(196, 168, 124, 0.3)',
            borderRadius: 8,
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} />
            <strong>Details des percages ({percages.stats.nombreTotalPercages} trous)</strong>
          </span>
          {showPercageDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showPercageDetails && (
          <div style={{
            marginTop: 12,
            padding: 16,
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
          }}>
            {/* Percages facade */}
            <h5 style={{ marginBottom: 8, color: 'var(--cx-accent, #c4a87c)' }}>
              FACADE ({percages.config.largeurFacade.toFixed(0)} x {percages.config.hauteurFacade.toFixed(0)} mm)
            </h5>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>X (mm)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Y (mm)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>O (mm)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Prof.</th>
                </tr>
              </thead>
              <tbody>
                {percages.percages.facade.map((p: PercageAbsolu) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '4px 8px' }}>
                      {p.type === 'cup_35mm' ? 'Cup' : 'INSERTA'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.x.toFixed(1)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.y.toFixed(1)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.diametre}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.profondeur}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Percages cote */}
            <h5 style={{ marginBottom: 8, color: 'var(--cx-accent, #c4a87c)' }}>
              COTE {config.positionCharniere.toUpperCase()} ({percages.config.profondeurCote} x {percages.config.hauteurCote} mm)
            </h5>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>X (mm)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Y (mm)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>O (mm)</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px' }}>Prof.</th>
                </tr>
              </thead>
              <tbody>
                {(config.positionCharniere === 'gauche'
                  ? percages.percages.coteGauche
                  : percages.percages.coteDroit
                ).map((p: PercageAbsolu) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '4px 8px' }}>
                      {p.type === 'pilote_10mm' ? 'Pilote' : 'Vis'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.x.toFixed(1)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.y.toFixed(1)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.diametre}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>{p.profondeur}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ marginTop: 12, opacity: 0.7, fontSize: 11 }}>
              Origine: coin bas-gauche de chaque panneau (vue interne)
            </p>
          </div>
        )}
      </div>

      {/* Recap charnieres */}
      <div className={styles.calculatedBox}>
        <h4 className={styles.calculatedTitle}>Recapitulatif quincaillerie</h4>
        {prixQuincaillerie.detail.map((ligne, index) => (
          <div key={index} className={styles.calculatedRow}>
            <span className={styles.calculatedLabel}>{ligne.article}</span>
            <span className={styles.calculatedValue}>
              x{ligne.quantite} = {ligne.total.toFixed(2)} EUR
            </span>
          </div>
        ))}
        <div className={styles.calculatedRow} style={{
          marginTop: 8,
          paddingTop: 12,
          borderTop: '1px solid rgba(196, 168, 124, 0.2)',
          fontWeight: 600
        }}>
          <span className={styles.calculatedLabel}>Total quincaillerie</span>
          <span className={styles.calculatedValue} style={{ color: 'var(--cx-accent, #c4a87c)' }}>
            {prixQuincaillerie.prixTotal.toFixed(2)} EUR HT
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
