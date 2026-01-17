/**
 * Multicouche Builder - Construction de panneaux multicouches artisanaux
 *
 * Permet aux menuisiers de créer leur propre panneau en sélectionnant
 * les couches individuellement depuis la bibliothèque CutX.
 */

// Main component
export { default as MulticoucheBuilder } from './MulticoucheBuilder';

// Context
export {
  MulticoucheBuilderProvider,
  useMulticoucheBuilder,
  readMulticoucheBuilderFromSession,
  clearMulticoucheBuilderSession,
} from './MulticoucheBuilderContext';

// Components
export { ModeSelector } from './components';

// Types
export type {
  HomePanelMode,
  BuilderCouche,
  ChutePreview,
  ChutePosition,
  ChantsConfig,
  MulticoucheBuilderState,
  MulticoucheBuilderActions,
  MulticoucheBuilderContextType,
  MulticoucheBuilderStorageData,
} from './types';

export { MULTICOUCHE_BUILDER_STORAGE_KEY } from './types';
