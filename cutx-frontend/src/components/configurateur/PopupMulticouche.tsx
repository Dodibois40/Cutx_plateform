'use client';

/**
 * Popup de configuration de panneau multicouche
 * Permet de configurer un panneau compose de plusieurs couches
 * Avec sauvegarde/chargement de templates
 *
 * REFACTORED: Ce composant a ete refactorise en plusieurs sous-composants
 * situes dans le dossier ./multicouche/
 */

import { createPortal } from 'react-dom';
import { X, Layers, ArrowLeft, FolderOpen } from 'lucide-react';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche } from '@/lib/configurateur-multicouche/types';

// Import du hook et des composants refactorises
import {
  useMulticoucheState,
  EtapeModeCollage,
  EtapeTemplates,
  EtapeCouches,
  FooterMulticouche,
  styles,
} from './multicouche';

interface PopupMulticoucheProps {
  open: boolean;
  panneauxCatalogue: PanneauCatalogue[];
  panneauMulticouche: PanneauMulticouche | null;
  onSave: (panneau: PanneauMulticouche) => void;
  onClose: () => void;
}

export default function PopupMulticouche({
  open,
  panneauMulticouche,
  onSave,
  onClose,
}: PopupMulticoucheProps) {
  // Utiliser le hook custom pour toute la logique d'etat
  const state = useMulticoucheState({
    open,
    panneauMulticouche,
    onSave,
  });

  // Ne pas rendre si pas ouvert ou pas monte cote client
  if (!open || !state.mounted) return null;

  // Determiner le titre selon l'etape
  const getTitle = () => {
    switch (state.etape) {
      case 'mode':
        return 'Panneau Multicouche';
      case 'templates':
        return 'Mes modeles';
      case 'couches':
        return 'Configurer les couches';
      default:
        return 'Panneau Multicouche';
    }
  };

  // Contenu du popup
  const popupContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.container} ${
          state.etape === 'couches' ? styles.containerCouches : styles.containerMode
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {(state.etape === 'couches' || state.etape === 'templates') && (
              <button
                onClick={() => state.setEtape('mode')}
                className={styles.backBtn}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <Layers size={20} className={styles.textAmber500} />
            <h2 className={styles.title}>{getTitle()}</h2>
          </div>
          <div className={styles.headerRight}>
            {state.etape === 'mode' &&
              state.isSignedIn &&
              state.templates.length > 0 && (
                <button
                  onClick={() => state.setEtape('templates')}
                  className={styles.templatesBtn}
                >
                  <FolderOpen size={16} />
                  Mes modeles ({state.templates.length})
                </button>
              )}
            <button onClick={onClose} className={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {state.etape === 'mode' ? (
            <EtapeModeCollage
              onSelectMode={state.handleSelectMode}
              onLoadTemplate={state.handleLoadTemplate}
              onShowTemplates={() => state.setEtape('templates')}
              templates={state.templates}
              isSignedIn={state.isSignedIn}
            />
          ) : state.etape === 'templates' ? (
            <EtapeTemplates
              templates={state.templates}
              loading={state.templatesLoading}
              onLoadTemplate={state.handleLoadTemplate}
              onDeleteTemplate={state.handleDeleteTemplate}
            />
          ) : (
            <EtapeCouches
              modeCollage={state.modeCollage}
              couches={state.couches}
              coucheOuverte={state.coucheOuverte}
              draggedCoucheId={state.draggedCoucheId}
              dragOverCoucheId={state.dragOverCoucheId}
              openTypeDropdown={state.openTypeDropdown}
              parementWarning={state.parementWarning}
              epaisseurTotale={state.epaisseurTotale}
              prixEstimeM2={state.prixEstimeM2}
              onCoucheHeaderClick={state.handleCoucheHeaderClick}
              onSupprimerCouche={state.supprimerCouche}
              onAjouterCouche={state.ajouterCouche}
              onDragStart={state.handleDragStart}
              onDragOver={state.handleDragOver}
              onDragLeave={state.handleDragLeave}
              onDrop={state.handleDrop}
              onDragEnd={state.handleDragEnd}
              onToggleTypeDropdown={state.setOpenTypeDropdown}
              onChangeTypeCouche={state.handleChangeTypeCouche}
              onSelectPanneau={state.handleSelectPanneau}
              onClearPanneau={state.handleClearPanneau}
              onCoucheClick={state.setCoucheOuverte}
            />
          )}
        </div>

        {/* Footer (seulement sur l'etape couches) */}
        {state.etape === 'couches' && (
          <FooterMulticouche
            showSaveDialog={state.showSaveDialog}
            saveSuccess={state.saveSuccess}
            saving={state.saving}
            templateName={state.templateName}
            toutesLesCouchesCompletes={state.toutesLesCouchesCompletes}
            disclaimerAccepted={state.disclaimerAccepted}
            isSignedIn={state.isSignedIn}
            onShowSaveDialog={() => state.setShowSaveDialog(true)}
            onHideSaveDialog={() => state.setShowSaveDialog(false)}
            onTemplateNameChange={state.setTemplateName}
            onSaveTemplate={state.handleSaveTemplate}
            onDisclaimerChange={state.setDisclaimerAccepted}
            onValidate={state.handleValidate}
          />
        )}
      </div>
    </div>
  );

  return createPortal(popupContent, document.body);
}
