'use client';

/**
 * Etape de configuration des couches
 * Utilise CoucheItem et VueCoupePanneau
 */

import { Plus, Wrench } from 'lucide-react';
import type { CoucheMulticouche, ModeCollage, TypeCouche } from '@/lib/configurateur-multicouche/types';
import { REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';
import type { ProduitCatalogue } from '@/lib/catalogues';
import CoucheItem from './CoucheItem';
import VueCoupePanneau from './VueCoupePanneau';
import styles from '../styles/PopupMulticouche.module.css';

interface EtapeCouchesProps {
  modeCollage: ModeCollage | null;
  couches: CoucheMulticouche[];
  coucheOuverte: string | null;
  draggedCoucheId: string | null;
  dragOverCoucheId: string | null;
  openTypeDropdown: string | null;
  parementWarning: string | null;
  epaisseurTotale: number;
  prixEstimeM2: number;
  onCoucheHeaderClick: (coucheId: string, isOpen: boolean) => void;
  onSupprimerCouche: (id: string) => void;
  onAjouterCouche: () => void;
  onDragStart: (e: React.DragEvent, coucheId: string) => void;
  onDragOver: (e: React.DragEvent, coucheId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetCoucheId: string) => void;
  onDragEnd: () => void;
  onToggleTypeDropdown: (id: string | null) => void;
  onChangeTypeCouche: (id: string, type: TypeCouche) => void;
  onSelectPanneau: (coucheId: string, produit: ProduitCatalogue) => void;
  onClearPanneau: (coucheId: string) => void;
  onCoucheClick: (coucheId: string) => void;
}

export default function EtapeCouches({
  modeCollage,
  couches,
  coucheOuverte,
  draggedCoucheId,
  dragOverCoucheId,
  openTypeDropdown,
  parementWarning,
  epaisseurTotale,
  prixEstimeM2,
  onCoucheHeaderClick,
  onSupprimerCouche,
  onAjouterCouche,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onToggleTypeDropdown,
  onChangeTypeCouche,
  onSelectPanneau,
  onClearPanneau,
  onCoucheClick,
}: EtapeCouchesProps) {
  return (
    <div className={styles.couchesEditionLayout}>
      {/* Colonne gauche : Configuration */}
      <div className={styles.couchesEdition}>
        {/* Mode badge */}
        <div
          className={`${styles.modeBadge} ${
            modeCollage === 'fournisseur'
              ? styles.modeBadgeFournisseur
              : styles.modeBadgeClient
          }`}
        >
          {modeCollage === 'fournisseur' ? (
            <img
              src="/icons/18-layers-3.svg"
              alt=""
              className={styles.modeBadgeIcon}
            />
          ) : (
            <Wrench size={14} />
          )}
          {modeCollage === 'fournisseur'
            ? 'Collage realise par le fournisseur'
            : 'Collage Client (+50mm sur-cote)'}
        </div>

        {/* Message d'avertissement parement */}
        {parementWarning && (
          <div className={styles.parementWarning}>
            <span className={styles.parementWarningIcon}>!</span>
            <span>{parementWarning}</span>
          </div>
        )}

        {/* Indication drag & drop */}
        <div className={styles.dragInstruction}>
          <img
            src="/icons/20-grip-dots-vertical.svg"
            alt=""
            className={styles.dragInstructionIcon}
          />
          <span>Glissez les couches pour modifier l&apos;ordre</span>
        </div>

        {/* Liste des couches avec drag & drop */}
        <div className={styles.couchesList}>
          {couches.map((couche) => {
            const isOpen = coucheOuverte === couche.id;
            const isDragging = draggedCoucheId === couche.id;
            const isDragOver = dragOverCoucheId === couche.id;

            return (
              <CoucheItem
                key={couche.id}
                couche={couche}
                isOpen={isOpen}
                isDragging={isDragging}
                isDragOver={isDragOver}
                totalCouches={couches.length}
                openTypeDropdown={openTypeDropdown}
                onHeaderClick={() => onCoucheHeaderClick(couche.id, isOpen)}
                onDelete={() => onSupprimerCouche(couche.id)}
                onDragStart={(e) => onDragStart(e, couche.id)}
                onDragOver={(e) => onDragOver(e, couche.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, couche.id)}
                onDragEnd={onDragEnd}
                onToggleTypeDropdown={() =>
                  onToggleTypeDropdown(
                    openTypeDropdown === couche.id ? null : couche.id
                  )
                }
                onChangeType={(type) => {
                  onChangeTypeCouche(couche.id, type);
                  onToggleTypeDropdown(null);
                }}
                onSelectPanneau={(produit) => onSelectPanneau(couche.id, produit)}
                onClearPanneau={() => onClearPanneau(couche.id)}
              />
            );
          })}

          {/* Ajouter couche */}
          {couches.length < REGLES_MULTICOUCHE.COUCHES_MAX && (
            <button onClick={onAjouterCouche} className={styles.addCoucheBtn}>
              <Plus size={16} />
              Ajouter une couche ({couches.length}/{REGLES_MULTICOUCHE.COUCHES_MAX})
            </button>
          )}
        </div>

        {/* Resume */}
        <div className={styles.couchesSummary}>
          <div className={styles.summaryRow}>
            <span>Couches</span>
            <span className={styles.summaryValue}>{couches.length}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Epaisseur totale</span>
            <span className={`${styles.summaryValue} ${styles.summaryValueAccent}`}>
              {epaisseurTotale.toFixed(1)} mm
            </span>
          </div>
          {prixEstimeM2 > 0 && (
            <div className={styles.summaryRow}>
              <span>Prix estime</span>
              <span className={styles.summaryValue}>
                {prixEstimeM2.toFixed(2)} EUR/m2
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Colonne droite : Visualisation */}
      <VueCoupePanneau
        couches={couches}
        epaisseurTotale={epaisseurTotale}
        coucheOuverte={coucheOuverte}
        onCoucheClick={onCoucheClick}
      />
    </div>
  );
}
