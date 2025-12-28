// Index - Stratifiés et flex
// Export de toutes les essences disponibles

export * from './types';

export { STRATIFIES_FLEX_CHENE } from './chene';
export { STRATIFIES_FLEX_CHATAIGNIER } from './chataignier';
export { STRATIFIES_FLEX_FRENE } from './frene';
export { STRATIFIES_FLEX_HETRE } from './hetre';
export { STRATIFIES_FLEX_NOYER_US } from './noyer-us';
export { STRATIFIES_FLEX_SAPELLI } from './sapelli';
export { STRATIFIES_FLEX_AUTRES_ESSENCES } from './autres-essences';

import { STRATIFIES_FLEX_CHENE } from './chene';
import { STRATIFIES_FLEX_CHATAIGNIER } from './chataignier';
import { STRATIFIES_FLEX_FRENE } from './frene';
import { STRATIFIES_FLEX_HETRE } from './hetre';
import { STRATIFIES_FLEX_NOYER_US } from './noyer-us';
import { STRATIFIES_FLEX_SAPELLI } from './sapelli';
import { STRATIFIES_FLEX_AUTRES_ESSENCES } from './autres-essences';
import type { StratifiesFlexData } from './types';

export const STRATIFIES_FLEX: StratifiesFlexData = {
  categorie: 'Stratifiés et flex',
  essences: [
    STRATIFIES_FLEX_CHENE,
    STRATIFIES_FLEX_CHATAIGNIER,
    STRATIFIES_FLEX_FRENE,
    STRATIFIES_FLEX_HETRE,
    STRATIFIES_FLEX_NOYER_US,
    STRATIFIES_FLEX_SAPELLI,
    STRATIFIES_FLEX_AUTRES_ESSENCES,
  ],
};
