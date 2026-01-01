'use client';

/**
 * Dropdown custom pour selectionner le type de couche
 */

import { useTranslations } from 'next-intl';
import { ChevronDown, Check } from 'lucide-react';
import type { TypeCouche } from '@/lib/configurateur-multicouche/types';
import styles from '../styles/PopupMulticouche.module.css';

// Types de couches disponibles
const LAYER_TYPES: TypeCouche[] = ['parement', 'ame', 'contrebalancement', 'autre'];

interface TypeCoucheDropdownProps {
  currentType: TypeCouche;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (type: TypeCouche) => void;
}

export default function TypeCoucheDropdown({
  currentType,
  isOpen,
  onToggle,
  onSelect,
}: TypeCoucheDropdownProps) {
  const t = useTranslations('dialogs.multilayer');

  return (
    <div className={styles.customDropdown}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={onToggle}
      >
        <span>{t(`layerTypes.${currentType}`)}</span>
        <ChevronDown
          size={16}
          className={`${styles.dropdownChevron} ${isOpen ? styles.dropdownChevronOpen : ''}`}
        />
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {LAYER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`${styles.dropdownOption} ${currentType === type ? styles.dropdownOptionSelected : ''}`}
              onClick={() => {
                onSelect(type);
              }}
            >
              <span className={styles.dropdownOptionDot} />
              <span>{t(`layerTypes.${type}`)}</span>
              {currentType === type && (
                <Check size={14} className={styles.dropdownOptionCheck} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
