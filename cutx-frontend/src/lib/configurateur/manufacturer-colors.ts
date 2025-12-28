// =====================================================
// NUANCIERS FABRICANTS - Base de données unifiée
// =====================================================

export interface ManufacturerColor {
  code: string;
  name?: string;
  hex: string;
  category?: string;
}

export interface Manufacturer {
  id: string;
  name: string;
  logo?: string;
  colors: ManufacturerColor[];
}

// =====================================================
// RESSOURCE
// =====================================================
const RESSOURCE_COLORS_DATA: Record<string, Record<string, string>> = {
  "Blancs": {
    "RW001": "#FFFFFF",
    "RW002": "#F9F9F7",
    "RW003": "#F5F5F0",
    "RW004": "#F2F2ED",
    "RW005": "#EEEEE9",
    "RW006": "#E9E9E4",
    "RW007": "#E5E5E0",
    "RW008": "#E2E2DD",
    "RW009": "#DEDEDA",
    "RW010": "#DBDBD6"
  },
  "Neutres": {
    "RN001": "#D7D7D2",
    "RN002": "#CECEC9",
    "RN003": "#C5C5C0",
    "RN004": "#BCBCB7",
    "RN005": "#B3B3AE",
    "RN006": "#AAAA9F",
    "RN007": "#A1A196",
    "RN008": "#98988D",
    "RN009": "#8F8F84",
    "RN010": "#86867B"
  },
  "Terres": {
    "RT001": "#D6C6A5",
    "RT002": "#CCBB99",
    "RT003": "#C2B08E",
    "RT004": "#B8A582",
    "RT005": "#AE9A77",
    "RT006": "#A48F6B",
    "RT007": "#9A8460",
    "RT008": "#907954",
    "RT009": "#866E49",
    "RT010": "#7C633D"
  },
  "Couleurs": {
    "RC001": "#E63244",
    "RC002": "#D84B20",
    "RC003": "#F4A900",
    "RC004": "#57A639",
    "RC005": "#2271B3",
    "RC006": "#6C4675",
    "RC007": "#A03472",
    "RC008": "#8E402A",
    "RC009": "#6F4F28",
    "RC010": "#4E3B31"
  }
};

// =====================================================
// FARROW & BALL
// =====================================================
const FARROW_BALL_COLORS_DATA: Record<string, { name: string; hex: string; number: string; category: string }> = {
  'All White': { name: 'All White', hex: '#F2F2F0', number: '2005', category: 'Blancs' },
  'Strong White': { name: 'Strong White', hex: '#E8E8E3', number: '2001', category: 'Blancs' },
  'Pointing': { name: 'Pointing', hex: '#F0E9DC', number: '2003', category: 'Blancs' },
  'Wimborne White': { name: 'Wimborne White', hex: '#F4F3E7', number: '239', category: 'Blancs' },
  'Shaded White': { name: 'Shaded White', hex: '#D6D1C3', number: '201', category: 'Blancs' },
  'Shadow White': { name: 'Shadow White', hex: '#E5E2D7', number: '282', category: 'Blancs' },
  'School House White': { name: 'School House White', hex: '#E9E4D6', number: '291', category: 'Blancs' },
  'James White': { name: 'James White', hex: '#E8E4D9', number: '2010', category: 'Blancs' },
  'Wevet': { name: 'Wevet', hex: '#E9E7E2', number: '273', category: 'Blancs' },
  'Ammonite': { name: 'Ammonite', hex: '#D7D5CC', number: '274', category: 'Gris' },
  'Purbeck Stone': { name: 'Purbeck Stone', hex: '#9B978E', number: '275', category: 'Gris' },
  "Mole's Breath": { name: "Mole's Breath", hex: '#58534E', number: '276', category: 'Gris' },
  'Down Pipe': { name: 'Down Pipe', hex: '#2E3234', number: '26', category: 'Gris' },
  'Railings': { name: 'Railings', hex: '#2D3033', number: '31', category: 'Gris' },
  'Plummett': { name: 'Plummett', hex: '#626468', number: '272', category: 'Gris' },
  'Manor House Gray': { name: 'Manor House Gray', hex: '#7B7E7E', number: '265', category: 'Gris' },
  'Cornforth White': { name: 'Cornforth White', hex: '#D0CCC5', number: '228', category: 'Gris' },
  'Borrowed Light': { name: 'Borrowed Light', hex: '#DCE4E6', number: '235', category: 'Bleus' },
  'Light Blue': { name: 'Light Blue', hex: '#C2C7C7', number: '22', category: 'Bleus' },
  'Lulworth Blue': { name: 'Lulworth Blue', hex: '#A0B7CE', number: '89', category: 'Bleus' },
  'Stiffkey Blue': { name: 'Stiffkey Blue', hex: '#2C3F4D', number: '281', category: 'Bleus' },
  'Hague Blue': { name: 'Hague Blue', hex: '#2D3D4C', number: '30', category: 'Bleus' },
  'Drawing Room Blue': { name: 'Drawing Room Blue', hex: '#1B4B6E', number: '253', category: 'Bleus' },
  'Pitch Blue': { name: 'Pitch Blue', hex: '#2D4866', number: '220', category: 'Bleus' },
  'Parma Gray': { name: 'Parma Gray', hex: '#9BA3B0', number: '27', category: 'Bleus' },
  'Cooking Apple Green': { name: 'Cooking Apple Green', hex: '#B8B99B', number: '32', category: 'Verts' },
  'Calke Green': { name: 'Calke Green', hex: '#6B7353', number: '34', category: 'Verts' },
  'Green Smoke': { name: 'Green Smoke', hex: '#595F52', number: '47', category: 'Verts' },
  'Studio Green': { name: 'Studio Green', hex: '#2B3229', number: '93', category: 'Verts' },
  'Card Room Green': { name: 'Card Room Green', hex: '#7A8574', number: '79', category: 'Verts' },
  'Calvert Green': { name: 'Calvert Green', hex: '#487E76', number: '278', category: 'Verts' },
  'Vert De Terre': { name: 'Vert De Terre', hex: '#97987C', number: '234', category: 'Verts' },
  'Lichen': { name: 'Lichen', hex: '#9B9B86', number: '19', category: 'Verts' },
  'Pink Ground': { name: 'Pink Ground', hex: '#E8D2C9', number: '202', category: 'Roses' },
  'Setting Plaster': { name: 'Setting Plaster', hex: '#E2C9BE', number: '231', category: 'Roses' },
  'Red Earth': { name: 'Red Earth', hex: '#A65D57', number: '64', category: 'Rouges' },
  'Incarnadine': { name: 'Incarnadine', hex: '#A94F54', number: '248', category: 'Rouges' },
  'Preference Red': { name: 'Preference Red', hex: '#744145', number: '297', category: 'Rouges' },
  'Eating Room Red': { name: 'Eating Room Red', hex: '#8C3D3D', number: '43', category: 'Rouges' },
  'Picture Gallery Red': { name: 'Picture Gallery Red', hex: '#8E4E45', number: '42', category: 'Rouges' },
  'Sulking Room Pink': { name: 'Sulking Room Pink', hex: '#A18984', number: '295', category: 'Roses' },
  'Hay': { name: 'Hay', hex: '#D5C7A4', number: '37', category: 'Jaunes' },
  'New White': { name: 'New White', hex: '#F2E9D7', number: '59', category: 'Jaunes' },
  'String': { name: 'String', hex: '#D7CCAF', number: '8', category: 'Jaunes' },
  'Cord': { name: 'Cord', hex: '#C2B7A4', number: '16', category: 'Jaunes' },
  'India Yellow': { name: 'India Yellow', hex: '#D4A962', number: '66', category: 'Jaunes' },
  'Babouche': { name: 'Babouche', hex: '#F4D388', number: '223', category: 'Jaunes' },
  'Dutch Orange': { name: 'Dutch Orange', hex: '#E55137', number: '2012', category: 'Oranges' },
  "Charlotte's Locks": { name: "Charlotte's Locks", hex: '#CF4E31', number: '268', category: 'Oranges' }
};

// =====================================================
// SIKKENS (Simplified)
// =====================================================
const SIKKENS_COLORS_DATA: Record<string, Record<string, string>> = {
  "Blancs": {
    "A0.03.88": "#E8E6E1",
    "A0.05.85": "#E0DCD5",
    "B0.05.85": "#E1DBD4",
    "C0.03.88": "#E9E6E2",
    "D0.03.88": "#E9E7E3",
    "E0.03.88": "#EAE8E4",
    "F0.04.87": "#E9E5DB",
    "G0.03.88": "#EAE9E3",
    "H0.03.87": "#E7E7E1"
  },
  "Gris": {
    "A0.05.75": "#C9C4BE",
    "B0.05.65": "#B0AAA3",
    "C0.05.55": "#948D87",
    "D0.05.45": "#7A7571",
    "E0.05.35": "#5F5B58",
    "ON.00.90": "#E9E9E9",
    "ON.00.81": "#D0D0D0",
    "ON.00.69": "#B2B2B2",
    "ON.00.55": "#8F8F8F",
    "ON.00.45": "#747474",
    "ON.00.35": "#595959",
    "ON.00.25": "#414141",
    "ON.00.15": "#282828"
  },
  "Bleus": {
    "S0.10.70": "#A9C2CF",
    "S2.20.60": "#7DABC5",
    "S4.30.50": "#4E93B8",
    "S6.40.40": "#2C7AA6",
    "S8.50.30": "#1A5F8A",
    "T0.10.70": "#A8BFD0",
    "T2.20.60": "#7BA5C5",
    "T4.30.50": "#4D8BB5",
    "U0.10.70": "#ADB9CB",
    "U2.20.60": "#8BA3C0"
  },
  "Verts": {
    "K0.10.70": "#AFC7B5",
    "K2.20.60": "#85B596",
    "K4.30.50": "#5AA176",
    "K6.40.40": "#3D8B5E",
    "L0.10.70": "#B2C9B2",
    "L2.20.60": "#8AB98A",
    "M0.10.70": "#BAC7AC",
    "M2.20.60": "#99B587",
    "N0.10.70": "#BDC5A8"
  },
  "Jaunes": {
    "F2.20.80": "#E5D9A9",
    "F4.30.70": "#D9C882",
    "F6.40.60": "#CCB55A",
    "F8.50.50": "#BFA238",
    "G2.20.80": "#E0DCA8",
    "G4.30.70": "#D2CD7D",
    "H2.20.80": "#DBE0A8",
    "H4.30.70": "#C9D17A"
  },
  "Oranges": {
    "D2.20.70": "#E5C49F",
    "D4.30.60": "#DAA875",
    "D6.40.50": "#CE8D4E",
    "E2.20.70": "#E5C89F",
    "E4.30.60": "#DAAD74",
    "E6.40.50": "#CF924D"
  },
  "Rouges": {
    "B2.20.50": "#B58580",
    "B4.30.40": "#A5635E",
    "B6.40.30": "#8E4440",
    "C2.20.50": "#B68A7F",
    "C4.30.40": "#A66A5D",
    "C6.40.30": "#8E4B3E"
  }
};

// =====================================================
// TOLLENS
// =====================================================
const TOLLENS_COLORS_DATA: Record<string, Record<string, string>> = {
  "Authentique": {
    "BN.02.82": "#E5DBD7",
    "DN.01.82": "#DED9D5",
    "E8.03.85": "#EFE7DC",
    "F9.04.83": "#E7E1D4",
    "F5.04.85": "#EFE8D9",
    "B7.03.77": "#DFCFCC",
    "DN.02.77": "#D5CBC6",
    "E7.05.82": "#EBDCCC",
    "F4.07.76": "#DBCFBB",
    "F7.06.84": "#EAE0CD"
  },
  "Subtile": {
    "DN.01.71": "#C5BEBA",
    "E7.08.74": "#D7C6B4",
    "F6.08.75": "#D4C9B5",
    "F1.11.77": "#DDC9B0",
    "C0.05.65": "#C1ACA9",
    "D0.03.56": "#A09591",
    "E4.10.60": "#B5A08F",
    "F0.09.65": "#BCAD9A",
    "F1.11.72": "#D4BFA5"
  },
  "Intemporel": {
    "B2.10.30": "#6B5253",
    "A6.25.05": "#442529",
    "E1.14.50": "#9E8472",
    "F0.10.54": "#A09180",
    "F2.14.66": "#C5AF92",
    "D2.10.40": "#806C65",
    "Z1.08.16": "#46383E",
    "D2.12.24": "#5B4941",
    "E1.15.37": "#7C6655"
  },
  "Naturel": {
    "G3.03.84": "#ECE9DC",
    "LN.01.82": "#D5DAD5",
    "ON.00.81": "#D9DAD8",
    "VN.01.82": "#DDDBDC",
    "ON.00.90": "#EBEAE8",
    "F9.06.81": "#E1DACA",
    "LN.02.77": "#CDD4CE",
    "VN.02.77": "#D1D1D6",
    "ON.00.76": "#CBCCCB"
  },
  "Contraste": {
    "B6.30.40": "#A85958",
    "C7.68.38": "#C33F28",
    "F9.20.70": "#D1BE8E",
    "H1.16.58": "#A29F7F",
    "E8.30.60": "#C59967",
    "C0.49.27": "#91302C",
    "C2.63.35": "#BD2F2C",
    "F1.34.58": "#C19659",
    "G0.25.65": "#C4AE73"
  },
  "Dynamique": {
    "H8.22.39": "#687152",
    "C0.48.20": "#7C2829",
    "B8.56.27": "#99282C",
    "F1.64.54": "#C88A28",
    "G0.30.50": "#968550",
    "K5.22.27": "#495A47"
  },
  "Frais": {
    "P0.04.83": "#D4E4E1",
    "S1.05.82": "#D1DDE3",
    "T5.15.74": "#B4CEEB",
    "U3.07.78": "#CBD3E2",
    "Y7.09.57": "#B195A4",
    "P0.07.82": "#C8E2DF",
    "S0.09.71": "#AFC5D0",
    "T4.16.66": "#9BB6D1",
    "U3.15.69": "#ABBCDC"
  },
  "Audacieux": {
    "Z0.20.50": "#AE7995",
    "N6.08.70": "#A9C4BF",
    "R4.14.79": "#B4DCEA",
    "T4.23.56": "#769DC2",
    "U6.14.43": "#707992",
    "Z7.41.30": "#983660"
  }
};

// =====================================================
// ZOLPAN
// =====================================================
const ZOLPAN_COLORS_DATA: Record<string, Record<string, string>> = {
  "Classiques": {
    "Z1001": "#E8E6D9",
    "Z1002": "#D6C6A5",
    "Z1013": "#E3D9C6",
    "Z1014": "#DCC49F",
    "Z1015": "#E6DCC0",
    "Z7035": "#D5D5D1",
    "Z7038": "#B5B8B1",
    "Z7044": "#CAC4B0",
    "Z7047": "#D0D0D0",
    "Z9001": "#FDF4E3",
    "Z9002": "#E7EBDA",
    "Z9003": "#F4F4F4",
    "Z9010": "#FFFFFF",
    "Z9016": "#F6F6F6"
  },
  "Contemporains": {
    "Z2000": "#DD7B3B",
    "Z2001": "#BE4E24",
    "Z2002": "#C63927",
    "Z2003": "#FA842B",
    "Z2008": "#F75E25",
    "Z2009": "#F54021",
    "Z2010": "#D84B20",
    "Z2012": "#E55137",
    "Z3000": "#AF2B1E",
    "Z3001": "#A52019",
    "Z3002": "#A2231D",
    "Z3003": "#9B111E",
    "Z3004": "#75151E",
    "Z3005": "#5E2129",
    "Z3007": "#412227",
    "Z3009": "#642424",
    "Z3011": "#781F19",
    "Z3013": "#A12312",
    "Z3016": "#B32821",
    "Z3020": "#CC0605"
  },
  "Naturels": {
    "Z6000": "#316650",
    "Z6001": "#287233",
    "Z6002": "#2D572C",
    "Z6003": "#424632",
    "Z6004": "#1F3A3D",
    "Z6005": "#2F4538",
    "Z6006": "#3E3B32",
    "Z6007": "#343B29",
    "Z6008": "#39352A",
    "Z6009": "#31372B",
    "Z6010": "#35682D",
    "Z6011": "#587246",
    "Z6012": "#343E40",
    "Z6013": "#6C7156",
    "Z6014": "#47402E",
    "Z6015": "#3B3C36"
  }
};

// =====================================================
// CONVERSION EN FORMAT UNIFIÉ
// =====================================================

function convertSimpleFormat(data: Record<string, Record<string, string>>, manufacturerId: string): ManufacturerColor[] {
  const colors: ManufacturerColor[] = [];
  for (const [category, codes] of Object.entries(data)) {
    for (const [code, hex] of Object.entries(codes)) {
      colors.push({ code, hex, category });
    }
  }
  return colors;
}

function convertFarrowBallFormat(): ManufacturerColor[] {
  return Object.entries(FARROW_BALL_COLORS_DATA).map(([key, data]) => ({
    code: `No.${data.number}`,
    name: data.name,
    hex: data.hex,
    category: data.category
  }));
}

// =====================================================
// EXPORT DES FABRICANTS
// =====================================================

export const MANUFACTURERS: Manufacturer[] = [
  {
    id: 'ressource',
    name: 'Ressource',
    colors: convertSimpleFormat(RESSOURCE_COLORS_DATA, 'ressource')
  },
  {
    id: 'farrow-ball',
    name: 'Farrow & Ball',
    colors: convertFarrowBallFormat()
  },
  {
    id: 'sikkens',
    name: 'Sikkens',
    colors: convertSimpleFormat(SIKKENS_COLORS_DATA, 'sikkens')
  },
  {
    id: 'tollens',
    name: 'Tollens',
    colors: convertSimpleFormat(TOLLENS_COLORS_DATA, 'tollens')
  },
  {
    id: 'zolpan',
    name: 'Zolpan',
    colors: convertSimpleFormat(ZOLPAN_COLORS_DATA, 'zolpan')
  }
];

// =====================================================
// FONCTIONS DE RECHERCHE
// =====================================================

/**
 * Recherche une couleur par code dans tous les fabricants
 */
export function searchManufacturerColor(query: string): { manufacturer: Manufacturer; color: ManufacturerColor }[] {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const results: { manufacturer: Manufacturer; color: ManufacturerColor }[] = [];

  for (const manufacturer of MANUFACTURERS) {
    for (const color of manufacturer.colors) {
      const codeMatch = color.code.toLowerCase().includes(normalizedQuery);
      const nameMatch = color.name?.toLowerCase().includes(normalizedQuery);

      if (codeMatch || nameMatch) {
        results.push({ manufacturer, color });
      }
    }
  }

  return results.slice(0, 12); // Limiter à 12 résultats
}

/**
 * Recherche une couleur exacte par code
 */
export function findExactManufacturerColor(code: string): { manufacturer: Manufacturer; color: ManufacturerColor } | null {
  const normalizedCode = code.trim().toLowerCase();

  for (const manufacturer of MANUFACTURERS) {
    const color = manufacturer.colors.find(c =>
      c.code.toLowerCase() === normalizedCode ||
      c.name?.toLowerCase() === normalizedCode
    );

    if (color) {
      return { manufacturer, color };
    }
  }

  return null;
}

/**
 * Obtenir toutes les couleurs d'un fabricant
 */
export function getManufacturerColors(manufacturerId: string): ManufacturerColor[] {
  const manufacturer = MANUFACTURERS.find(m => m.id === manufacturerId);
  return manufacturer?.colors || [];
}

/**
 * Obtenir les catégories d'un fabricant
 */
export function getManufacturerCategories(manufacturerId: string): string[] {
  const colors = getManufacturerColors(manufacturerId);
  const categories = new Set(colors.map(c => c.category).filter(Boolean) as string[]);
  return Array.from(categories);
}
