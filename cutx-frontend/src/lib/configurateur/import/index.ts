// Export des fonctions d'import Excel
// Note: Les parsers individuels (parseBouneyExcel, parseIdeaBoisExcel, parseDebitExcel)
// sont internes et appelés uniquement par parseExcelAuto
export { parseExcelAuto } from './detect-format';
export type { DonneesImportees } from './types';
