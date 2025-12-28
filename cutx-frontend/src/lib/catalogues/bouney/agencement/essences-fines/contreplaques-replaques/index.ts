// Index - Contreplaqués replaqués
// Export de toutes les essences disponibles

export * from './types';

export { CONTREPLAQUES_REPLAQUES_CHENE } from './chene';
export { CONTREPLAQUES_REPLAQUES_CHATAIGNIER } from './chataignier';
export { CONTREPLAQUES_REPLAQUES_FRENE } from './frene';
export { CONTREPLAQUES_REPLAQUES_HETRE } from './hetre';
export { CONTREPLAQUES_REPLAQUES_NOYER_US } from './noyer-us';
export { CONTREPLAQUES_REPLAQUES_SAPELLI } from './sapelli';
export { CONTREPLAQUES_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';

import { CONTREPLAQUES_REPLAQUES_CHENE } from './chene';
import { CONTREPLAQUES_REPLAQUES_CHATAIGNIER } from './chataignier';
import { CONTREPLAQUES_REPLAQUES_FRENE } from './frene';
import { CONTREPLAQUES_REPLAQUES_HETRE } from './hetre';
import { CONTREPLAQUES_REPLAQUES_NOYER_US } from './noyer-us';
import { CONTREPLAQUES_REPLAQUES_SAPELLI } from './sapelli';
import { CONTREPLAQUES_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';
import type { ContreplaqueReplaquesData } from './types';

export const CONTREPLAQUES_REPLAQUES: ContreplaqueReplaquesData = {
  categorie: 'Contreplaqués replaqués',
  essences: [
    CONTREPLAQUES_REPLAQUES_CHENE,
    CONTREPLAQUES_REPLAQUES_CHATAIGNIER,
    CONTREPLAQUES_REPLAQUES_FRENE,
    CONTREPLAQUES_REPLAQUES_HETRE,
    CONTREPLAQUES_REPLAQUES_NOYER_US,
    CONTREPLAQUES_REPLAQUES_SAPELLI,
    CONTREPLAQUES_REPLAQUES_AUTRES_ESSENCES,
  ],
};
