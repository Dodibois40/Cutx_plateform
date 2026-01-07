'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pipette } from 'lucide-react';
import { getRALByCode } from '@/lib/configurateur/ral-colors';
import type { LignePrestationV3, Brillance } from '@/lib/configurateur/types';
import { BRILLANCES_TRANSLATION_KEYS } from '@/lib/configurateur/constants';
import { formaterPrix } from '@/lib/configurateur/calculs';
import PopupLaque from '../dialogs/PopupLaque';

interface BrillanceOption {
  value: Brillance;
  prixLaque: number | null;
  prixVernis: number | null;
}

interface LigneFinitionRowProps {
  ligneFinition: LignePrestationV3;
  onUpdateFinition: (updates: Partial<LignePrestationV3>) => void;
  hidePanelColumn: boolean;
  brillancesDisponibles: BrillanceOption[];
  finitionRowRef: React.RefObject<HTMLTableRowElement | null>;
}

export default function LigneFinitionRow({
  ligneFinition,
  onUpdateFinition,
  hidePanelColumn,
  brillancesDisponibles,
  finitionRowRef,
}: LigneFinitionRowProps) {
  const t = useTranslations();
  const [showLaque, setShowLaque] = useState(false);

  // Champ Teinte/RAL partagé entre les deux modes
  const renderTeinteField = () => (
    <div className="finition-field">
      <label>
        {ligneFinition.finition === 'laque' ? t('configurateur.finish.ralCode') : t('configurateur.finish.tint')}
      </label>
      {ligneFinition.finition === 'laque' ? (
        <div className="color-picker-wrapper">
          <input
            type="text"
            value={ligneFinition.codeCouleurLaque?.replace(/\s*\(#[0-9a-fA-F]+\)/, '') || ''}
            readOnly
            onClick={() => setShowLaque(true)}
            placeholder={t('configurateur.placeholders.chooseRAL')}
            className={`input-compact input-with-picker ${!ligneFinition.codeCouleurLaque ? 'field-missing' : ''}`}
            style={{ cursor: 'pointer' }}
          />
          <button
            className="btn-color-picker"
            onClick={() => setShowLaque(true)}
            style={ligneFinition.codeCouleurLaque ? {
              backgroundColor: ligneFinition.codeCouleurLaque.match(/#[0-9a-fA-F]{6}/)?.[0] || getRALByCode(ligneFinition.codeCouleurLaque)?.hex || '#888',
            } : undefined}
          >
            {!ligneFinition.codeCouleurLaque && <Pipette size={14} />}
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={ligneFinition.teinte || ''}
          onChange={(e) => onUpdateFinition({ teinte: e.target.value || null })}
          placeholder={ligneFinition.typeFinition === 'teinte_vernis' ? t('configurateur.placeholders.tint') : t('common.misc.optional')}
          className={`input-compact ${ligneFinition.typeFinition === 'teinte_vernis' && !ligneFinition.teinte ? 'field-missing' : ''}`}
        />
      )}
      <PopupLaque
        open={showLaque}
        codeCouleurActuel={ligneFinition.codeCouleurLaque}
        onUpdate={(codeCouleur) => onUpdateFinition?.({ codeCouleurLaque: codeCouleur })}
        onClose={() => setShowLaque(false)}
      />
    </div>
  );

  // Champ Brillance partagé
  const renderBrillanceField = () => (
    <div className="finition-field">
      <label>{t('configurateur.finish.gloss')}</label>
      <select
        value={ligneFinition.brillance || ''}
        onChange={(e) => onUpdateFinition({ brillance: e.target.value as Brillance || null })}
        className={`select-compact ${!ligneFinition.brillance ? 'field-missing' : ''}`}
      >
        <option value="">{t('configurateur.placeholders.choose')}</option>
        {brillancesDisponibles.map(b => {
          const prix = ligneFinition.finition === 'laque' ? b.prixLaque : b.prixVernis;
          return (
            <option key={b.value} value={b.value}>
              {t(BRILLANCES_TRANSLATION_KEYS[b.value])} ({prix}{t('configurateur.units.euroPerM2')})
            </option>
          );
        })}
      </select>
    </div>
  );

  // Champ Faces partagé
  const renderFacesField = () => (
    <div className="finition-field">
      <label>{t('configurateur.finish.faces')}</label>
      <div className="faces-toggle">
        <button
          className={`btn-face ${ligneFinition.nombreFaces === 1 ? 'active' : ''}`}
          onClick={() => onUpdateFinition({ nombreFaces: 1 })}
        >
          1
        </button>
        <button
          className={`btn-face ${ligneFinition.nombreFaces === 2 ? 'active' : ''}`}
          onClick={() => onUpdateFinition({ nombreFaces: 2 })}
        >
          2
        </button>
      </div>
    </div>
  );

  return (
    <>
      <tr ref={finitionRowRef} className="ligne-finition">
        {hidePanelColumn ? (
          <>
            {/* Mode Groupes: 10 colonnes */}
            <td className="cell-empty"></td>
            <td className="cell-empty">
              <span className="finition-indent">{'\u21B3'} {t('configurateur.columns.finish')}</span>
            </td>
            <td className="cell-finition-detail" colSpan={2}>
              {renderTeinteField()}
            </td>
            <td className="cell-finition-detail" colSpan={2}>
              {renderBrillanceField()}
            </td>
            <td className="cell-finition-detail">
              {renderFacesField()}
            </td>
            <td className="cell-empty"></td>
            <td className="cell-prix">
              <span className="prix-finition">{formaterPrix(ligneFinition.prixHT)}</span>
            </td>
            <td className="cell-actions"></td>
          </>
        ) : (
          <>
            {/* Mode Classique: 14 colonnes */}
            <td className="cell-empty cell-group-id"></td>
            <td className="cell-empty cell-group-id"></td>
            <td className="cell-empty cell-group-id cell-group-end-sticky">
              <span className="finition-indent">{'\u21B3'} {t('configurateur.columns.finish')}</span>
            </td>
            <td className="cell-empty cell-group-panneau"></td>
            <td className="cell-finition-detail" colSpan={2}>
              {renderTeinteField()}
            </td>
            <td className="cell-finition-detail cell-group-end" colSpan={2}>
              {renderBrillanceField()}
            </td>
            <td className="cell-finition-detail cell-group-end">
              {renderFacesField()}
            </td>
            <td className="cell-group-prix cell-prix">
              <span className="prix-finition">{formaterPrix(ligneFinition.prixHT)}</span>
            </td>
            <td className="cell-group-prix cell-actions"></td>
          </>
        )}
      </tr>
    </>
  );
}
