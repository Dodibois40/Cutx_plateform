// Index - Agglomérés replaqués
// Export de toutes les essences disponibles

export * from './types';

export { AGGLOMERES_REPLAQUES_CHENE } from './chene';
export { AGGLOMERES_REPLAQUES_CHATAIGNIER } from './chataignier';
export { AGGLOMERES_REPLAQUES_FRENE } from './frene';
export { AGGLOMERES_REPLAQUES_HETRE } from './hetre';
export { AGGLOMERES_REPLAQUES_NOYER_US } from './noyer-us';
export { AGGLOMERES_REPLAQUES_SAPELLI } from './sapelli';
export { AGGLOMERES_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';

import { AGGLOMERES_REPLAQUES_CHENE } from './chene';
import { AGGLOMERES_REPLAQUES_CHATAIGNIER } from './chataignier';
import { AGGLOMERES_REPLAQUES_FRENE } from './frene';
import { AGGLOMERES_REPLAQUES_HETRE } from './hetre';
import { AGGLOMERES_REPLAQUES_NOYER_US } from './noyer-us';
import { AGGLOMERES_REPLAQUES_SAPELLI } from './sapelli';
import { AGGLOMERES_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';
import type { AgglomeresReplaquesData } from './types';

export const AGGLOMERES_REPLAQUES: AgglomeresReplaquesData = {
  categorie: 'Agglomérés replaqués',
  essences: [
    AGGLOMERES_REPLAQUES_CHENE,
    AGGLOMERES_REPLAQUES_CHATAIGNIER,
    AGGLOMERES_REPLAQUES_FRENE,
    AGGLOMERES_REPLAQUES_HETRE,
    AGGLOMERES_REPLAQUES_NOYER_US,
    AGGLOMERES_REPLAQUES_SAPELLI,
    AGGLOMERES_REPLAQUES_AUTRES_ESSENCES,
  ],
};
