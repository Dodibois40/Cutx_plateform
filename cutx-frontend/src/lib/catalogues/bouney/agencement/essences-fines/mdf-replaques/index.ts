// Index - MDF replaqués
// Export de toutes les essences disponibles

export * from './types';

export { MDF_REPLAQUES_CHENE } from './chene';
export { MDF_REPLAQUES_CHATAIGNIER } from './chataignier';
export { MDF_REPLAQUES_FRENE } from './frene';
export { MDF_REPLAQUES_HETRE } from './hetre';
export { MDF_REPLAQUES_NOYER_US } from './noyer-us';
export { MDF_REPLAQUES_SAPELLI } from './sapelli';
export { MDF_REPLAQUES_QUERKUS } from './querkus';
export { MDF_REPLAQUES_SHINNOKI } from './shinnoki';
export { MDF_REPLAQUES_NUXE } from './nuxe';
export { MDF_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';

import { MDF_REPLAQUES_CHENE } from './chene';
import { MDF_REPLAQUES_CHATAIGNIER } from './chataignier';
import { MDF_REPLAQUES_FRENE } from './frene';
import { MDF_REPLAQUES_HETRE } from './hetre';
import { MDF_REPLAQUES_NOYER_US } from './noyer-us';
import { MDF_REPLAQUES_SAPELLI } from './sapelli';
import { MDF_REPLAQUES_QUERKUS } from './querkus';
import { MDF_REPLAQUES_SHINNOKI } from './shinnoki';
import { MDF_REPLAQUES_NUXE } from './nuxe';
import { MDF_REPLAQUES_AUTRES_ESSENCES } from './autres-essences';
import type { MDFReplaquesData } from './types';

export const MDF_REPLAQUES: MDFReplaquesData = {
  categorie: 'MDF replaqués',
  essences: [
    MDF_REPLAQUES_CHENE,
    MDF_REPLAQUES_CHATAIGNIER,
    MDF_REPLAQUES_FRENE,
    MDF_REPLAQUES_HETRE,
    MDF_REPLAQUES_NOYER_US,
    MDF_REPLAQUES_SAPELLI,
    MDF_REPLAQUES_QUERKUS,
    MDF_REPLAQUES_SHINNOKI,
    MDF_REPLAQUES_NUXE,
    MDF_REPLAQUES_AUTRES_ESSENCES,
  ],
};
