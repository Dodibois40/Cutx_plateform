// Index - Lattés replaqués
// Export de toutes les essences disponibles

export * from './types';

export { LATTES_REPLAQUES_CHENE } from './chene';
export { LATTES_REPLAQUES_CHATAIGNIER } from './chataignier';
export { LATTES_REPLAQUES_FRENE } from './frene';
export { LATTES_REPLAQUES_HETRE } from './hetre';
export { LATTES_REPLAQUES_NOYER_US } from './noyer-us';
export { LATTES_REPLAQUES_SAPELLI } from './sapelli';
export { LATTES_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';

import { LATTES_REPLAQUES_CHENE } from './chene';
import { LATTES_REPLAQUES_CHATAIGNIER } from './chataignier';
import { LATTES_REPLAQUES_FRENE } from './frene';
import { LATTES_REPLAQUES_HETRE } from './hetre';
import { LATTES_REPLAQUES_NOYER_US } from './noyer-us';
import { LATTES_REPLAQUES_SAPELLI } from './sapelli';
import { LATTES_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';
import type { LattesReplaquesData } from './types';

export const LATTES_REPLAQUES: LattesReplaquesData = {
  categorie: 'Lattés replaqués',
  essences: [
    LATTES_REPLAQUES_CHENE,
    LATTES_REPLAQUES_CHATAIGNIER,
    LATTES_REPLAQUES_FRENE,
    LATTES_REPLAQUES_HETRE,
    LATTES_REPLAQUES_NOYER_US,
    LATTES_REPLAQUES_SAPELLI,
    LATTES_REPLAQUES_AUTRES_ESSENCES,
  ],
};
