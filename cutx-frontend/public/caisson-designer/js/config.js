/* ================================================
   CONFIG - Configuration de l'application
   ================================================ */

// Configuration du caisson
export const config = {
  width: 600,
  height: 900,
  depth: 350,
  thickness: 18,
  doorThickness: 18,
  colorCaisson: 0xFFFFFF,
  colorDoor: 0xFFFFFF,
  gapTop: 3,
  gapBottom: 0,
  gapLeft: 0,
  gapRight: 0,
  doorOffset: 3,
  showDoor: true,
  isExploded: false
};

// Références aux panneaux 3D pour l'animation d'explosion
export const panelRefs = {
  bottom: null,
  top: null,
  left: null,
  right: null,
  back: null,
  door: null
};

// Distance d'explosion (en mm)
export const explodeDistance = 250;

// Référence à la porte (pour pouvoir la masquer/afficher)
export let doorMesh = null;

export function setDoorMesh(mesh) {
  doorMesh = mesh;
}
