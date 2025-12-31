'use client';

/**
 * Dropdown custom pour selectionner le type de couche
 */

import { ChevronDown, Check } from 'lucide-react';
import type { TypeCouche } from '@/lib/configurateur-multicouche/types';
import { LABELS_COUCHE } from '@/lib/configurateur-multicouche/types';
import styles from '../styles/PopupMulticouche.module.css';

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
  return (
    <div className={styles.customDropdown}>
      <button
        type="button"
        className={styles.dropdownTrigger}
        onClick={onToggle}
      >
        <span>{LABELS_COUCHE[currentType]}</span>
        <ChevronDown
          size={16}
          className={`${styles.dropdownChevron} ${isOpen ? styles.dropdownChevronOpen : ''}`}
        />
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {Object.entries(LABELS_COUCHE).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${styles.dropdownOption} ${currentType === value ? styles.dropdownOptionSelected : ''}`}
              onClick={() => {
                onSelect(value as TypeCouche);
              }}
            >
              <span className={styles.dropdownOptionDot} />
              <span>{label}</span>
              {currentType === value && (
                <Check size={14} className={styles.dropdownOptionCheck} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
