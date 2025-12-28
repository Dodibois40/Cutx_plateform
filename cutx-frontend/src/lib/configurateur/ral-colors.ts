/**
 * Base de données des couleurs RAL Classic avec correspondances RGB/Hex
 * Source: RAL Classic Color Chart
 *
 * Cette base contient les couleurs RAL les plus courantes utilisées dans l'industrie.
 * Chaque couleur RAL est mappée à sa valeur RGB/Hex approximative pour le rendu écran.
 */

export interface RALColor {
  code: string;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export const RAL_COLORS: RALColor[] = [
  // Blancs et Gris
  { code: 'RAL 9010', name: 'Blanc pur', hex: '#f7f9ef', rgb: { r: 247, g: 249, b: 239 } },
  { code: 'RAL 9016', name: 'Blanc signalisation', hex: '#f1f0ea', rgb: { r: 241, g: 240, b: 234 } },
  { code: 'RAL 9001', name: 'Blanc crème', hex: '#e9e0d2', rgb: { r: 233, g: 224, b: 210 } },
  { code: 'RAL 9002', name: 'Blanc gris', hex: '#d7d5cb', rgb: { r: 215, g: 213, b: 203 } },
  { code: 'RAL 9003', name: 'Blanc signalisation', hex: '#ecece7', rgb: { r: 236, g: 236, b: 231 } },
  { code: 'RAL 9018', name: 'Blanc papyrus', hex: '#c9cbca', rgb: { r: 201, g: 203, b: 202 } },
  { code: 'RAL 7047', name: 'Gris télégris 4', hex: '#c8c8c8', rgb: { r: 200, g: 200, b: 200 } },
  { code: 'RAL 7035', name: 'Gris lumière', hex: '#cbd0cc', rgb: { r: 203, g: 208, b: 204 } },
  { code: 'RAL 7040', name: 'Gris fenêtre', hex: '#9da3a6', rgb: { r: 157, g: 163, b: 166 } },
  { code: 'RAL 7001', name: 'Gris argent', hex: '#8a9597', rgb: { r: 138, g: 149, b: 151 } },
  { code: 'RAL 7016', name: 'Gris anthracite', hex: '#373f43', rgb: { r: 55, g: 63, b: 67 } },
  { code: 'RAL 7021', name: 'Gris noir', hex: '#2e3234', rgb: { r: 46, g: 50, b: 52 } },
  { code: 'RAL 9005', name: 'Noir foncé', hex: '#0e0e10', rgb: { r: 14, g: 14, b: 16 } },

  // Beiges et Marrons
  { code: 'RAL 1013', name: 'Blanc perlé', hex: '#e3d9c6', rgb: { r: 227, g: 217, b: 198 } },
  { code: 'RAL 1015', name: 'Ivoire clair', hex: '#e1d2b8', rgb: { r: 225, g: 210, b: 184 } },
  { code: 'RAL 1014', name: 'Ivoire', hex: '#d5c59d', rgb: { r: 213, g: 197, b: 157 } },
  { code: 'RAL 1019', name: 'Beige grisâtre', hex: '#9d9085', rgb: { r: 157, g: 144, b: 133 } },
  { code: 'RAL 8007', name: 'Brun fauve', hex: '#6f4a2f', rgb: { r: 111, g: 74, b: 47 } },
  { code: 'RAL 8014', name: 'Brun sépia', hex: '#4a3526', rgb: { r: 74, g: 53, b: 38 } },
  { code: 'RAL 8019', name: 'Brun grisâtre', hex: '#3d3635', rgb: { r: 61, g: 54, b: 53 } },

  // Rouges
  { code: 'RAL 3000', name: 'Rouge feu', hex: '#a72920', rgb: { r: 167, g: 41, b: 32 } },
  { code: 'RAL 3001', name: 'Rouge signalisation', hex: '#9b2423', rgb: { r: 155, g: 36, b: 35 } },
  { code: 'RAL 3003', name: 'Rouge rubis', hex: '#8d1d2c', rgb: { r: 141, g: 29, b: 44 } },
  { code: 'RAL 3004', name: 'Rouge pourpre', hex: '#6b1c23', rgb: { r: 107, g: 28, b: 35 } },
  { code: 'RAL 3005', name: 'Rouge vin', hex: '#59191f', rgb: { r: 89, g: 25, b: 31 } },
  { code: 'RAL 3009', name: 'Rouge oxyde', hex: '#6d342d', rgb: { r: 109, g: 52, b: 45 } },
  { code: 'RAL 3011', name: 'Rouge brun', hex: '#792423', rgb: { r: 121, g: 36, b: 35 } },
  { code: 'RAL 3020', name: 'Rouge signalisation', hex: '#c1121c', rgb: { r: 193, g: 18, b: 28 } },

  // Roses
  { code: 'RAL 3015', name: 'Rose clair', hex: '#d8a0a6', rgb: { r: 216, g: 160, b: 166 } },
  { code: 'RAL 3014', name: 'Vieux rose', hex: '#cb7375', rgb: { r: 203, g: 115, b: 117 } },

  // Oranges
  { code: 'RAL 2000', name: 'Orangé jaune', hex: '#d05d28', rgb: { r: 208, g: 93, b: 40 } },
  { code: 'RAL 2001', name: 'Orangé rouge', hex: '#be4e2b', rgb: { r: 190, g: 78, b: 43 } },
  { code: 'RAL 2002', name: 'Orangé sang', hex: '#bf3922', rgb: { r: 191, g: 57, b: 34 } },
  { code: 'RAL 2003', name: 'Orangé pastel', hex: '#f67828', rgb: { r: 246, g: 120, b: 40 } },
  { code: 'RAL 2004', name: 'Orangé pur', hex: '#e25303', rgb: { r: 226, g: 83, b: 3 } },
  { code: 'RAL 2008', name: 'Orangé rouge clair', hex: '#e95d28', rgb: { r: 233, g: 93, b: 40 } },
  { code: 'RAL 2009', name: 'Orangé signalisation', hex: '#de5307', rgb: { r: 222, g: 83, b: 7 } },
  { code: 'RAL 2010', name: 'Orangé signalisation', hex: '#d05d28', rgb: { r: 208, g: 93, b: 40 } },

  // Jaunes
  { code: 'RAL 1000', name: 'Vert beige', hex: '#bea66c', rgb: { r: 190, g: 166, b: 108 } },
  { code: 'RAL 1001', name: 'Beige', hex: '#d0b084', rgb: { r: 208, g: 176, b: 132 } },
  { code: 'RAL 1002', name: 'Jaune sable', hex: '#d2aa6d', rgb: { r: 210, g: 170, b: 109 } },
  { code: 'RAL 1003', name: 'Jaune de sécurité', hex: '#f7ba0b', rgb: { r: 247, g: 186, b: 11 } },
  { code: 'RAL 1004', name: 'Jaune or', hex: '#e49e00', rgb: { r: 228, g: 158, b: 0 } },
  { code: 'RAL 1005', name: 'Jaune miel', hex: '#cb8e00', rgb: { r: 203, g: 142, b: 0 } },
  { code: 'RAL 1006', name: 'Jaune maïs', hex: '#d99500', rgb: { r: 217, g: 149, b: 0 } },
  { code: 'RAL 1007', name: 'Jaune narcisse', hex: '#e29000', rgb: { r: 226, g: 144, b: 0 } },
  { code: 'RAL 1011', name: 'Beige brun', hex: '#ab8b5f', rgb: { r: 171, g: 139, b: 95 } },
  { code: 'RAL 1012', name: 'Jaune citron', hex: '#d9c022', rgb: { r: 217, g: 192, b: 34 } },
  { code: 'RAL 1016', name: 'Jaune soufre', hex: '#e9d500', rgb: { r: 233, g: 213, b: 0 } },
  { code: 'RAL 1017', name: 'Jaune safran', hex: '#f0a500', rgb: { r: 240, g: 165, b: 0 } },
  { code: 'RAL 1018', name: 'Jaune zinc', hex: '#faca30', rgb: { r: 250, g: 202, b: 48 } },
  { code: 'RAL 1021', name: 'Jaune colza', hex: '#e9b500', rgb: { r: 233, g: 181, b: 0 } },
  { code: 'RAL 1023', name: 'Jaune signalisation', hex: '#f7b500', rgb: { r: 247, g: 181, b: 0 } },
  { code: 'RAL 1024', name: 'Jaune ocre', hex: '#b89c50', rgb: { r: 184, g: 156, b: 80 } },

  // Verts
  { code: 'RAL 6000', name: 'Vert patiné', hex: '#32746d', rgb: { r: 50, g: 116, b: 109 } },
  { code: 'RAL 6001', name: 'Vert émeraude', hex: '#366735', rgb: { r: 54, g: 103, b: 53 } },
  { code: 'RAL 6002', name: 'Vert feuillage', hex: '#296235', rgb: { r: 41, g: 98, b: 53 } },
  { code: 'RAL 6003', name: 'Vert olive', hex: '#4b573e', rgb: { r: 75, g: 87, b: 62 } },
  { code: 'RAL 6004', name: 'Vert bleu', hex: '#0e4243', rgb: { r: 14, g: 66, b: 67 } },
  { code: 'RAL 6005', name: 'Vert mousse', hex: '#0f4336', rgb: { r: 15, g: 67, b: 54 } },
  { code: 'RAL 6006', name: 'Gris olive', hex: '#3c392e', rgb: { r: 60, g: 57, b: 46 } },
  { code: 'RAL 6007', name: 'Vert bouteille', hex: '#2c3222', rgb: { r: 44, g: 50, b: 34 } },
  { code: 'RAL 6008', name: 'Vert brun', hex: '#35382e', rgb: { r: 53, g: 56, b: 46 } },
  { code: 'RAL 6009', name: 'Vert sapin', hex: '#27352a', rgb: { r: 39, g: 53, b: 42 } },
  { code: 'RAL 6010', name: 'Vert herbe', hex: '#3e7a3c', rgb: { r: 62, g: 122, b: 60 } },
  { code: 'RAL 6011', name: 'Vert réséda', hex: '#6c7c59', rgb: { r: 108, g: 124, b: 89 } },
  { code: 'RAL 6012', name: 'Vert noir', hex: '#30403a', rgb: { r: 48, g: 64, b: 58 } },
  { code: 'RAL 6013', name: 'Vert jonc', hex: '#797c5a', rgb: { r: 121, g: 124, b: 90 } },
  { code: 'RAL 6014', name: 'Jaune olive', hex: '#444337', rgb: { r: 68, g: 67, b: 55 } },
  { code: 'RAL 6015', name: 'Noir olive', hex: '#3d403a', rgb: { r: 61, g: 64, b: 58 } },
  { code: 'RAL 6016', name: 'Vert turquoise', hex: '#026c52', rgb: { r: 2, g: 108, b: 82 } },
  { code: 'RAL 6017', name: 'Vert mai', hex: '#4a7233', rgb: { r: 74, g: 114, b: 51 } },
  { code: 'RAL 6018', name: 'Vert jaunâtre', hex: '#48a43f', rgb: { r: 72, g: 164, b: 63 } },
  { code: 'RAL 6019', name: 'Vert pâle', hex: '#b7d9b1', rgb: { r: 183, g: 217, b: 177 } },
  { code: 'RAL 6020', name: 'Vert oxyde chromique', hex: '#37422f', rgb: { r: 55, g: 66, b: 47 } },
  { code: 'RAL 6021', name: 'Vert pâle', hex: '#8a9977', rgb: { r: 138, g: 153, b: 119 } },
  { code: 'RAL 6024', name: 'Vert signalisation', hex: '#008351', rgb: { r: 0, g: 131, b: 81 } },
  { code: 'RAL 6025', name: 'Vert fougère', hex: '#53753c', rgb: { r: 83, g: 117, b: 60 } },
  { code: 'RAL 6026', name: 'Vert opale', hex: '#005d52', rgb: { r: 0, g: 93, b: 82 } },
  { code: 'RAL 6027', name: 'Vert clair', hex: '#7ebab5', rgb: { r: 126, g: 186, b: 181 } },
  { code: 'RAL 6028', name: 'Vert pin', hex: '#2d5546', rgb: { r: 45, g: 85, b: 70 } },
  { code: 'RAL 6029', name: 'Vert menthe', hex: '#007243', rgb: { r: 0, g: 114, b: 67 } },
  { code: 'RAL 6032', name: 'Vert signalisation', hex: '#237f52', rgb: { r: 35, g: 127, b: 82 } },
  { code: 'RAL 6033', name: 'Turquoise menthe', hex: '#46877f', rgb: { r: 70, g: 135, b: 127 } },
  { code: 'RAL 6034', name: 'Turquoise pâle', hex: '#7fb0b2', rgb: { r: 127, g: 176, b: 178 } },

  // Bleus
  { code: 'RAL 5000', name: 'Bleu violet', hex: '#313c48', rgb: { r: 49, g: 60, b: 72 } },
  { code: 'RAL 5001', name: 'Bleu vert', hex: '#1b4035', rgb: { r: 27, g: 64, b: 53 } },
  { code: 'RAL 5002', name: 'Bleu outremer', hex: '#2a3a62', rgb: { r: 42, g: 58, b: 98 } },
  { code: 'RAL 5003', name: 'Bleu saphir', hex: '#20214f', rgb: { r: 32, g: 33, b: 79 } },
  { code: 'RAL 5004', name: 'Bleu noir', hex: '#191e28', rgb: { r: 25, g: 30, b: 40 } },
  { code: 'RAL 5005', name: 'Bleu signalisation', hex: '#1d4f91', rgb: { r: 29, g: 79, b: 145 } },
  { code: 'RAL 5007', name: 'Bleu brillant', hex: '#376b8c', rgb: { r: 55, g: 107, b: 140 } },
  { code: 'RAL 5008', name: 'Bleu grisâtre', hex: '#2b3a44', rgb: { r: 43, g: 58, b: 68 } },
  { code: 'RAL 5009', name: 'Bleu azur', hex: '#2560a8', rgb: { r: 37, g: 96, b: 168 } },
  { code: 'RAL 5010', name: 'Bleu gentiane', hex: '#104a8e', rgb: { r: 16, g: 74, b: 142 } },
  { code: 'RAL 5011', name: 'Bleu acier', hex: '#1a2b3c', rgb: { r: 26, g: 43, b: 60 } },
  { code: 'RAL 5012', name: 'Bleu clair', hex: '#3481b8', rgb: { r: 52, g: 129, b: 184 } },
  { code: 'RAL 5013', name: 'Bleu cobalt', hex: '#232c3f', rgb: { r: 35, g: 44, b: 63 } },
  { code: 'RAL 5014', name: 'Bleu pigeon', hex: '#6c7c98', rgb: { r: 108, g: 124, b: 152 } },
  { code: 'RAL 5015', name: 'Bleu ciel', hex: '#2874b2', rgb: { r: 40, g: 116, b: 178 } },
  { code: 'RAL 5017', name: 'Bleu signalisation', hex: '#0a5c91', rgb: { r: 10, g: 92, b: 145 } },
  { code: 'RAL 5018', name: 'Bleu turquoise', hex: '#058b8c', rgb: { r: 5, g: 139, b: 140 } },
  { code: 'RAL 5019', name: 'Bleu capri', hex: '#1a5784', rgb: { r: 26, g: 87, b: 132 } },
  { code: 'RAL 5020', name: 'Bleu océan', hex: '#1d4f73', rgb: { r: 29, g: 79, b: 115 } },
  { code: 'RAL 5021', name: 'Bleu eau', hex: '#07737a', rgb: { r: 7, g: 115, b: 122 } },
  { code: 'RAL 5022', name: 'Bleu nuit', hex: '#2f2a5a', rgb: { r: 47, g: 42, b: 90 } },
  { code: 'RAL 5023', name: 'Bleu distant', hex: '#4a5f75', rgb: { r: 74, g: 95, b: 117 } },
  { code: 'RAL 5024', name: 'Bleu pastel', hex: '#6093ac', rgb: { r: 96, g: 147, b: 172 } },

  // Violets
  { code: 'RAL 4001', name: 'Lilas rouge', hex: '#816183', rgb: { r: 129, g: 97, b: 131 } },
  { code: 'RAL 4002', name: 'Violet rouge', hex: '#8f3e4b', rgb: { r: 143, g: 62, b: 75 } },
  { code: 'RAL 4003', name: 'Violet de bruyère', hex: '#d15b8f', rgb: { r: 209, g: 91, b: 143 } },
  { code: 'RAL 4004', name: 'Violet pourpre', hex: '#651e38', rgb: { r: 101, g: 30, b: 56 } },
  { code: 'RAL 4005', name: 'Lilas bleu', hex: '#6e5383', rgb: { r: 110, g: 83, b: 131 } },
  { code: 'RAL 4006', name: 'Pourpre signalisation', hex: '#993668', rgb: { r: 153, g: 54, b: 104 } },
  { code: 'RAL 4007', name: 'Violet pourpre', hex: '#47243c', rgb: { r: 71, g: 36, b: 60 } },
  { code: 'RAL 4008', name: 'Violet signalisation', hex: '#844c82', rgb: { r: 132, g: 76, b: 130 } },
  { code: 'RAL 4009', name: 'Violet pastel', hex: '#9d8692', rgb: { r: 157, g: 134, b: 146 } },
];

/**
 * Trouve la couleur RAL la plus proche d'une couleur hexadécimale donnée
 * Utilise la distance euclidienne dans l'espace RGB pour trouver la meilleure correspondance
 *
 * @param hex - Couleur en format hexadécimal (ex: "#FF5733" ou "FF5733")
 * @returns La couleur RAL la plus proche
 */
export function findClosestRAL(hex: string): RALColor {
  // Normaliser le hex (retirer le # si présent)
  const normalizedHex = hex.replace('#', '');

  // Convertir hex en RGB
  const r = parseInt(normalizedHex.substring(0, 2), 16);
  const g = parseInt(normalizedHex.substring(2, 4), 16);
  const b = parseInt(normalizedHex.substring(4, 6), 16);

  let closestColor = RAL_COLORS[0];
  let minDistance = Infinity;

  // Calculer la distance euclidienne pour chaque couleur RAL
  for (const ralColor of RAL_COLORS) {
    const distance = Math.sqrt(
      Math.pow(r - ralColor.rgb.r, 2) +
      Math.pow(g - ralColor.rgb.g, 2) +
      Math.pow(b - ralColor.rgb.b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = ralColor;
    }
  }

  return closestColor;
}

/**
 * Obtient une couleur RAL par son code exact
 *
 * @param code - Code RAL (ex: "RAL 9010" ou "9010")
 * @returns La couleur RAL correspondante ou undefined
 */
export function getRALByCode(code: string): RALColor | undefined {
  const normalizedCode = code.toUpperCase().replace(/\s+/g, ' ').trim();
  const withPrefix = normalizedCode.startsWith('RAL') ? normalizedCode : `RAL ${normalizedCode}`;

  return RAL_COLORS.find(color => color.code === withPrefix);
}
