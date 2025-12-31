'use client';

/**
 * Liste des templates sauvegardes
 */

import { Loader2, FolderOpen, Trash2 } from 'lucide-react';
import type { MulticoucheTemplate } from '@/lib/services/multicouche-templates-api';
import styles from '../styles/PopupMulticouche.module.css';

interface EtapeTemplatesProps {
  templates: MulticoucheTemplate[];
  loading: boolean;
  onLoadTemplate: (template: MulticoucheTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function EtapeTemplates({
  templates,
  loading,
  onLoadTemplate,
  onDeleteTemplate,
}: EtapeTemplatesProps) {
  if (loading) {
    return (
      <div className={styles.templatesLoading}>
        <Loader2 size={24} className={styles.animateSpin} />
        <span>Chargement...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={styles.templatesEmpty}>
        <FolderOpen size={48} />
        <p>Aucun modele sauvegarde</p>
        <span>Creez un panneau multicouche et enregistrez-le comme modele</span>
      </div>
    );
  }

  return (
    <div className={styles.templatesList}>
      {templates.map((template) => (
        <div key={template.id} className={styles.templateItem}>
          <div className={styles.templateInfo}>
            <div className={styles.templateHeader}>
              <span className={styles.templateName}>{template.nom}</span>
              <span
                className={`${styles.templateMode} ${
                  template.modeCollage === 'fournisseur'
                    ? styles.templateModeFournisseur
                    : styles.templateModeClient
                }`}
              >
                {template.modeCollage === 'fournisseur' ? 'Fournisseur' : 'Client'}
              </span>
            </div>
            <div className={styles.templateDetails}>
              {template.couches.length} couches - {template.epaisseurTotale.toFixed(1)}mm
              {template.prixEstimeM2 > 0 && ` - ${template.prixEstimeM2.toFixed(2)}EUR/m2`}
            </div>
          </div>
          <div className={styles.templateActions}>
            <button
              onClick={() => onLoadTemplate(template)}
              className={styles.templateLoadBtn}
            >
              Utiliser
            </button>
            <button
              onClick={() => onDeleteTemplate(template.id)}
              className={styles.templateDeleteBtn}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
