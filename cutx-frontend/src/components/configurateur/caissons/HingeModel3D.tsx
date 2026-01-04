'use client';

// components/configurateur/caissons/HingeModel3D.tsx
// Composant 3D pour visualiser les percages charnieres et embases

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ConfigCaisson } from '@/lib/caissons/types';
import type { TypeEmbaseBlum } from '@/lib/caissons/blum-hardware';
import {
  calculerTousPercagesCharnieres,
  type PercageAbsolu,
  type ResultatPercagesCharnieres,
} from '@/lib/caissons/calcul-percages';

// Facteur d'echelle (1mm = 0.001 unite 3D)
const SCALE = 0.001;

// Couleurs des percages
const COULEURS = {
  cup: '#e53e3e',          // Rouge pour cups 35mm
  inserta: '#3182ce',      // Bleu pour INSERTA 8mm
  pilote: '#38a169',       // Vert pour trous pilotes 10mm
  vis: '#d69e2e',          // Or pour trous vis 5mm
};

interface DrillHole3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  diameter: number;     // en mm
  depth: number;        // en mm
  color: string;
}

/**
 * Composant pour un trou de percage cylindrique
 */
function DrillHole3D({
  position,
  rotation = [0, 0, 0],
  diameter,
  depth,
  color,
}: DrillHole3DProps) {
  const radius = (diameter * SCALE) / 2;
  const height = depth * SCALE;

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, height, 24]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.2}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

interface HingePercagesGroupProps {
  percages: PercageAbsolu[];
  panneauPosition: [number, number, number];
  panneauDimensions: {
    largeur: number;  // mm
    hauteur: number;  // mm
    epaisseur: number; // mm
  };
  face: 'X+' | 'X-' | 'Z+' | 'Z-';  // Direction de percage
}

/**
 * Groupe de percages pour un panneau
 * Convertit les coordonnees 2D (origine bas-gauche) en 3D
 */
function HingePercagesGroup({
  percages,
  panneauPosition,
  panneauDimensions,
  face,
}: HingePercagesGroupProps) {
  const drillHoles = useMemo(() => {
    return percages.map((percage) => {
      // Origine 2D: bas-gauche du panneau (vue interne)
      // Conversion en 3D selon la face

      let position: [number, number, number];
      let rotation: [number, number, number];
      const halfEp = (panneauDimensions.epaisseur * SCALE) / 2;

      // Position Y 3D = Y 2D (depuis le bas)
      const y3D = (percage.y - panneauDimensions.hauteur / 2) * SCALE;

      switch (face) {
        case 'Z+': // Facade, face vers l'avant (+Z)
          // X 2D -> X 3D
          const x3D_front = (percage.x - panneauDimensions.largeur / 2) * SCALE;
          position = [
            panneauPosition[0] + x3D_front,
            panneauPosition[1] + y3D,
            panneauPosition[2] - halfEp + (percage.profondeur * SCALE) / 2,
          ];
          rotation = [Math.PI / 2, 0, 0];
          break;

        case 'X+': // Cote droit, face interne vers la gauche (-X)
          // X 2D (profondeur) -> Z 3D
          const z3D_right = (percage.x - panneauDimensions.largeur / 2) * SCALE;
          position = [
            panneauPosition[0] - halfEp + (percage.profondeur * SCALE) / 2,
            panneauPosition[1] + y3D,
            panneauPosition[2] + z3D_right,
          ];
          rotation = [0, 0, Math.PI / 2];
          break;

        case 'X-': // Cote gauche, face interne vers la droite (+X)
          const z3D_left = (percage.x - panneauDimensions.largeur / 2) * SCALE;
          position = [
            panneauPosition[0] + halfEp - (percage.profondeur * SCALE) / 2,
            panneauPosition[1] + y3D,
            panneauPosition[2] + z3D_left,
          ];
          rotation = [0, 0, -Math.PI / 2];
          break;

        default:
          position = [0, 0, 0];
          rotation = [0, 0, 0];
      }

      // Couleur selon le type de percage
      let color = COULEURS.cup;
      if (percage.type === 'inserta_8mm') color = COULEURS.inserta;
      else if (percage.type === 'pilote_10mm') color = COULEURS.pilote;
      else if (percage.type === 'vis_5mm') color = COULEURS.vis;

      return {
        id: percage.id,
        position,
        rotation,
        diameter: percage.diametre,
        depth: percage.profondeur,
        color,
      };
    });
  }, [percages, panneauPosition, panneauDimensions, face]);

  return (
    <group>
      {drillHoles.map((hole) => (
        <DrillHole3D
          key={hole.id}
          position={hole.position}
          rotation={hole.rotation}
          diameter={hole.diameter}
          depth={hole.depth}
          color={hole.color}
        />
      ))}
    </group>
  );
}

interface PercagesCharnieres3DProps {
  config: ConfigCaisson;
  typeEmbase?: TypeEmbaseBlum;
  showFacadeDrillings?: boolean;
  showCoteDrillings?: boolean;
}

/**
 * Composant principal pour afficher tous les percages charnieres en 3D
 */
export default function PercagesCharnieres3D({
  config,
  typeEmbase = 'EXPANDO_0mm',
  showFacadeDrillings = true,
  showCoteDrillings = true,
}: PercagesCharnieres3DProps) {
  // Calculer tous les percages
  const percages = useMemo(() => {
    if (!config.avecFacade) return null;
    return calculerTousPercagesCharnieres(config, typeEmbase);
  }, [config, typeEmbase]);

  if (!percages || !config.avecFacade) return null;

  // Dimensions 3D du caisson
  const H = config.hauteur * SCALE;
  const L = config.largeur * SCALE;
  const P = config.profondeur * SCALE;
  const ep = config.epaisseurStructure * SCALE;
  const epFacade = config.epaisseurFacade * SCALE;

  // Dimensions facade
  const facadeH = percages.config.hauteurFacade;
  const facadeL = percages.config.largeurFacade;

  // Position facade en 3D (centre du caisson + devant)
  const facadePosition: [number, number, number] = [
    0,
    0,
    P / 2 + epFacade / 2 + 0.005, // Legere separation
  ];

  // Position cote gauche
  const coteGauchePosition: [number, number, number] = [
    -L / 2 + ep / 2,
    0,
    0,
  ];

  // Position cote droit
  const coteDroitPosition: [number, number, number] = [
    L / 2 - ep / 2,
    0,
    0,
  ];

  return (
    <group>
      {/* Percages facade */}
      {showFacadeDrillings && percages.percages.facade.length > 0 && (
        <HingePercagesGroup
          percages={percages.percages.facade}
          panneauPosition={facadePosition}
          panneauDimensions={{
            largeur: facadeL,
            hauteur: facadeH,
            epaisseur: config.epaisseurFacade,
          }}
          face="Z+"
        />
      )}

      {/* Percages cote gauche */}
      {showCoteDrillings && percages.percages.coteGauche.length > 0 && (
        <HingePercagesGroup
          percages={percages.percages.coteGauche}
          panneauPosition={coteGauchePosition}
          panneauDimensions={{
            largeur: config.profondeur,
            hauteur: config.hauteur,
            epaisseur: config.epaisseurStructure,
          }}
          face="X-"
        />
      )}

      {/* Percages cote droit */}
      {showCoteDrillings && percages.percages.coteDroit.length > 0 && (
        <HingePercagesGroup
          percages={percages.percages.coteDroit}
          panneauPosition={coteDroitPosition}
          panneauDimensions={{
            largeur: config.profondeur,
            hauteur: config.hauteur,
            epaisseur: config.epaisseurStructure,
          }}
          face="X+"
        />
      )}
    </group>
  );
}

// Export des sous-composants pour usage direct
export { DrillHole3D, HingePercagesGroup };
