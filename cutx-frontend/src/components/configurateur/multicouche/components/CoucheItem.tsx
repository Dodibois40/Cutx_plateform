'use client';

/**
 * Item de couche avec header, contenu deplie et drag & drop
 */

import { useTranslations } from 'next-intl';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { CoucheMulticouche, TypeCouche } from '@/lib/configurateur-multicouche/types';
import { REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';
import type { ProduitCatalogue } from '@/lib/catalogues';
import SelectionPanneauCouche from '@/components/configurateur-multicouche/SelectionPanneauCouche';
import TypeCoucheDropdown from './TypeCoucheDropdown';
import styles from '../styles/PopupMulticouche.module.css';

interface CoucheItemProps {
  couche: CoucheMulticouche;
  isOpen: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  totalCouches: number;
  openTypeDropdown: string | null;
  onHeaderClick: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleTypeDropdown: () => void;
  onChangeType: (type: TypeCouche) => void;
  onSelectPanneau: (produit: ProduitCatalogue) => void;
  onClearPanneau: () => void;
}

export default function CoucheItem({
  couche,
  isOpen,
  isDragging,
  isDragOver,
  totalCouches,
  openTypeDropdown,
  onHeaderClick,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onToggleTypeDropdown,
  onChangeType,
  onSelectPanneau,
  onClearPanneau,
}: CoucheItemProps) {
  const t = useTranslations('dialogs.multilayer');
  const isComplete = couche.panneauId !== null;
  const canDelete = totalCouches > REGLES_MULTICOUCHE.COUCHES_MIN;

  const itemClasses = [
    styles.coucheItem,
    isOpen && styles.coucheItemOpen,
    isComplete && styles.coucheItemComplete,
    isDragging && styles.coucheItemDragging,
    isDragOver && styles.coucheItemDragover,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={itemClasses}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Header de la couche */}
      <div
        onClick={onHeaderClick}
        className={styles.coucheHeader}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onHeaderClick();
        }}
      >
        <img
          src="/icons/20-grip-dots-vertical.svg"
          alt=""
          className={styles.coucheGripIcon}
          draggable={false}
        />
        <div
          className={`${styles.coucheNumber} ${isComplete ? styles.coucheNumberComplete : ''}`}
        >
          {couche.ordre}
        </div>
        <div className={styles.coucheInfo}>
          <span className={styles.coucheType}>{t(`layerTypes.${couche.type}`)}</span>
          {isComplete ? (
            <span className={styles.coucheDetail}>
              {couche.panneauNom} - {couche.epaisseur}mm
            </span>
          ) : (
            <span className={`${styles.coucheDetail} ${styles.coucheDetailEmpty}`}>
              {t('selectPanel')}
            </span>
          )}
        </div>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={styles.coucheDelete}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        )}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Contenu de la couche */}
      {isOpen && (
        <div className={styles.coucheContent}>
          <div className={styles.coucheFormField}>
            <label>{t('layerType')}</label>
            <div className={styles.fieldWithArrow}>
              <span className={styles.fieldArrow}>↳</span>
              <TypeCoucheDropdown
                currentType={couche.type}
                isOpen={openTypeDropdown === couche.id}
                onToggle={onToggleTypeDropdown}
                onSelect={(type) => {
                  onChangeType(type);
                }}
              />
            </div>
          </div>

          <div className={styles.coucheFormField}>
            <label>{t('catalogPanel')}</label>
            <div className={styles.fieldWithArrow}>
              <span className={styles.fieldArrow}>↳</span>
              <SelectionPanneauCouche
                couche={couche}
                onSelect={onSelectPanneau}
                onClear={onClearPanneau}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
