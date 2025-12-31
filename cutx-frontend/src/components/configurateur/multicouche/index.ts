/**
 * Barrel export pour le module multicouche
 */

// Hook
export { useMulticoucheState } from './hooks/useMulticoucheState';
export type { UseMulticoucheStateReturn, EtapeMulticouche } from './hooks/useMulticoucheState';

// Components
export { default as TypeCoucheDropdown } from './components/TypeCoucheDropdown';
export { default as VueCoupePanneau } from './components/VueCoupePanneau';
export { default as CoucheItem } from './components/CoucheItem';
export { default as EtapeModeCollage } from './components/EtapeModeCollage';
export { default as EtapeTemplates } from './components/EtapeTemplates';
export { default as EtapeCouches } from './components/EtapeCouches';
export { default as FooterMulticouche } from './components/FooterMulticouche';

// Styles
export { default as styles } from './styles/PopupMulticouche.module.css';
