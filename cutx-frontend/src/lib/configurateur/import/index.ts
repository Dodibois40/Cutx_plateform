// Export des fonctions d'import Excel
// Note: Les parsers individuels (parseBouneyExcel, parseIdeaBoisExcel, parseDebitExcel)
// sont internes et appelés uniquement par parseExcelAuto
export { parseExcelAuto } from './detect-format';
export type { DonneesImportees } from './types';

// Export des fonctions d'import DXF
// Le router détecte automatiquement le format (TopSolid, Blum DYNAPLAN, générique)
export { parseDxfFile, parseDxfContentWithDetection } from './dxf-router';
export type { DxfFormat } from './dxf-router';

// Export des parsers spécifiques (pour usage direct si besoin)
export { parseTopSolidDxf, parseTopSolidDxfContent, isTopSolidDxf, generateTopSolidPanelSvg } from './topsolid-dxf-parser';
export { parseDxfContent as parseBlumDxfContent, generatePanelSvg as generateBlumPanelSvg } from './dxf-parser';

// Export des types DXF
export type {
  DxfResultatImport,
  DxfDonneesImportees,
  DxfPanelExtracted,
  DxfCircleInfo,
  DxfPolylineInfo,
} from './types';
