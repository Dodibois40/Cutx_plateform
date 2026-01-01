'use client';

/**
 * Etape de selection du mode de collage (fournisseur/client)
 */

import { useTranslations } from 'next-intl';
import { Factory, Wrench, Check, X, Layers } from 'lucide-react';
import type { ModeCollage } from '@/lib/configurateur-multicouche/types';
import type { MulticoucheTemplate } from '@/lib/services/multicouche-templates-api';
import styles from '../styles/PopupMulticouche.module.css';

interface EtapeModeCollageProps {
  onSelectMode: (mode: ModeCollage) => void;
  onLoadTemplate: (template: MulticoucheTemplate) => void;
  onShowTemplates: () => void;
  templates: MulticoucheTemplate[];
  isSignedIn: boolean | undefined;
}

export default function EtapeModeCollage({
  onSelectMode,
  onLoadTemplate,
  onShowTemplates,
  templates,
  isSignedIn,
}: EtapeModeCollageProps) {
  const t = useTranslations('dialogs.multilayer');

  return (
    <div className={styles.modeSelection}>
      <p className={styles.modeDescription}>
        {t('gluingQuestion')}
      </p>

      <div className={styles.modeOptions}>
        {/* Collage Fournisseur */}
        <button
          onClick={() => onSelectMode('fournisseur')}
          className={styles.modeCard}
        >
          <div className={styles.modeCardIcon}>
            <Factory size={24} />
          </div>
          <h3 className={styles.modeCardTitle}>{t('supplierGluing')}</h3>
          <p className={styles.modeCardDesc}>
            {t('supplierGluingDesc')}
          </p>
          <ul className={styles.modeCardFeatures}>
            <li>
              <Check size={14} /> {t('featureEdgesAvailable')}
            </li>
            <li>
              <Check size={14} /> {t('featureMachiningAvailable')}
            </li>
            <li>
              <Check size={14} /> {t('featureDrillingAvailable')}
            </li>
          </ul>
        </button>

        {/* Collage Client */}
        <button
          onClick={() => onSelectMode('client')}
          className={styles.modeCard}
        >
          <div className={styles.modeCardIcon}>
            <Wrench size={24} />
          </div>
          <h3 className={styles.modeCardTitle}>{t('clientGluing')}</h3>
          <p className={styles.modeCardDesc}>
            {t('clientGluingDesc')}
          </p>
          <ul className={`${styles.modeCardFeatures} ${styles.modeCardFeaturesDisabled}`}>
            <li>
              <X size={14} /> {t('featureNoEdges')}
            </li>
            <li>
              <X size={14} /> {t('featureNoMachining')}
            </li>
            <li>
              <span className={styles.surcoteBadge}>+50mm</span> {t('featureAutoOversize')}
            </li>
          </ul>
        </button>
      </div>

      {/* Templates rapides si connecte */}
      {isSignedIn && templates.length > 0 && (
        <div className={styles.quickTemplates}>
          <p className={styles.quickTemplatesLabel}>{t('loadTemplate')}</p>
          <div className={styles.quickTemplatesList}>
            {templates.slice(0, 3).map((template) => (
              <button
                key={template.id}
                onClick={() => onLoadTemplate(template)}
                className={styles.quickTemplateBtn}
              >
                <Layers size={14} />
                {template.nom}
              </button>
            ))}
            {templates.length > 3 && (
              <button
                onClick={onShowTemplates}
                className={`${styles.quickTemplateBtn} ${styles.quickTemplateBtnMore}`}
              >
                {t('moreTemplates', { count: templates.length - 3 })}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
