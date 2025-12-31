'use client';

/**
 * Footer du popup multicouche
 * Contient le disclaimer, le dialogue de sauvegarde et les boutons d'action
 */

import { Save, Check, Loader2 } from 'lucide-react';
import styles from '../styles/PopupMulticouche.module.css';

interface FooterMulticoucheProps {
  showSaveDialog: boolean;
  saveSuccess: boolean;
  saving: boolean;
  templateName: string;
  toutesLesCouchesCompletes: boolean;
  disclaimerAccepted: boolean;
  isSignedIn: boolean | undefined;
  onShowSaveDialog: () => void;
  onHideSaveDialog: () => void;
  onTemplateNameChange: (name: string) => void;
  onSaveTemplate: () => void;
  onDisclaimerChange: (accepted: boolean) => void;
  onValidate: () => void;
}

export default function FooterMulticouche({
  showSaveDialog,
  saveSuccess,
  saving,
  templateName,
  toutesLesCouchesCompletes,
  disclaimerAccepted,
  isSignedIn,
  onShowSaveDialog,
  onHideSaveDialog,
  onTemplateNameChange,
  onSaveTemplate,
  onDisclaimerChange,
  onValidate,
}: FooterMulticoucheProps) {
  if (showSaveDialog) {
    return (
      <div className={styles.footer}>
        <div className={styles.saveDialog}>
          {saveSuccess ? (
            <div className={styles.saveSuccess}>
              <div className={styles.saveSuccessIcon}>
                <Check size={24} />
              </div>
              <span className={styles.saveSuccessText}>Modele enregistre !</span>
              <span className={styles.saveSuccessSubtext}>
                Redirection vers vos modeles...
              </span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={templateName}
                onChange={(e) => onTemplateNameChange(e.target.value)}
                placeholder="Nom du modele..."
                className={styles.saveDialogInput}
                autoFocus
              />
              <div className={styles.saveDialogActions}>
                <button onClick={onHideSaveDialog} className={styles.saveDialogCancel}>
                  Annuler
                </button>
                <button
                  onClick={onSaveTemplate}
                  disabled={!templateName.trim() || saving}
                  className={styles.saveDialogConfirm}
                >
                  {saving ? (
                    <Loader2 size={14} className={styles.animateSpin} />
                  ) : (
                    <Save size={14} />
                  )}
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.footer}>
      {!toutesLesCouchesCompletes && (
        <p className={styles.warning}>
          Selectionnez un panneau pour chaque couche
        </p>
      )}

      {/* Disclaimer responsabilite */}
      {toutesLesCouchesCompletes && (
        <div className={styles.disclaimerSection}>
          <label className={styles.disclaimerCheckbox}>
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => onDisclaimerChange(e.target.checked)}
            />
            <span className={styles.disclaimerCheckmark}></span>
            <span className={styles.disclaimerText}>
              Je reconnais etre entierement responsable de la conception de ce
              panneau multicouche. En cas d&apos;erreur de configuration ou de
              mauvaise demande de fabrication, ni CutX ni le fournisseur ne
              pourront etre tenus responsables.
            </span>
          </label>
        </div>
      )}

      <div className={styles.footerActions}>
        {isSignedIn && toutesLesCouchesCompletes && (
          <button onClick={onShowSaveDialog} className={styles.saveBtn}>
            <Save size={16} />
            Enregistrer comme modele
          </button>
        )}
        <button
          onClick={onValidate}
          disabled={!toutesLesCouchesCompletes || !disclaimerAccepted}
          className={styles.validateBtn}
        >
          <Check size={16} />
          Valider le panneau multicouche
        </button>
      </div>
    </div>
  );
}
