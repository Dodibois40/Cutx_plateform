'use client';

// components/configurateur/caissons/CaissonPreview3D.tsx
// Previsualisation 3D d'un caisson avec Three.js + System 32 drillings

import { useRef, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { ConfigCaisson, PanneauCalcule } from '@/lib/caissons/types';
import type { TypeEmbaseBlum } from '@/lib/caissons/blum-hardware';
import PercagesCharnieres3D from './HingeModel3D';

// Facteur d'echelle (1mm = 0.001 unite 3D)
const SCALE = 0.001;

// Configuration System 32 (standard industriel)
const SYSTEM32 = {
  holeSpacing: 32,         // Espacement entre trous (mm)
  frontEdgeDistance: 37,   // Distance du bord avant (mm)
  backEdgeDistance: 37,    // Distance du bord arriere (mm)
  holeDiameter: 5,         // Diametre des trous (mm)
  holeDepth: 13,           // Profondeur des trous (mm)
  firstHoleOffset: 32,     // Premier trou depuis le bas (mm)
};

// Couleurs des panneaux
const COULEURS = {
  structure: '#d4a574',    // Bois clair
  fond: '#c9b896',         // Beige
  facade: '#8b7355',       // Bois fonce
  chants: '#5c4033',       // Marron fonce
  wireframe: '#333333',
  drilling: '#1a1a1a',     // Trous de percage (noir)
  drillingHover: '#333333',
};

interface PanneauMeshProps {
  position: [number, number, number];
  dimensions: [number, number, number];  // [largeur, hauteur, profondeur]
  color: string;
  opacity?: number;
  showEdges?: boolean;
  name?: string;
}

// Composant pour un panneau individuel
function PanneauMesh({
  position,
  dimensions,
  color,
  opacity = 1,
  showEdges = true,
  name,
}: PanneauMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={dimensions} />
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1}
          opacity={opacity}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      {showEdges && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...dimensions)]} />
          <lineBasicMaterial color={COULEURS.wireframe} linewidth={1} />
        </lineSegments>
      )}
    </group>
  );
}

// Interface pour un trou de percage
interface DrillingHoleProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  diameter: number;  // en mm
  depth: number;     // en mm
}

// Composant pour un trou de percage (cylindre)
function DrillingHole({ position, rotation = [0, 0, 0], diameter, depth }: DrillingHoleProps) {
  const radius = (diameter * SCALE) / 2;
  const height = depth * SCALE;

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, height, 16]} />
      <meshStandardMaterial
        color={COULEURS.drilling}
        roughness={0.2}
        metalness={0.3}
      />
    </mesh>
  );
}

// Calcule les positions des trous System 32 pour un cote
function calculateSystem32Holes(
  panelHeight: number,  // Hauteur du panneau (mm)
  panelDepth: number,   // Profondeur du panneau (mm)
): Array<{ y: number; z: number }> {
  const holes: Array<{ y: number; z: number }> = [];

  // Ligne de trous cote avant (37mm du bord avant)
  const frontZ = panelDepth / 2 - SYSTEM32.frontEdgeDistance;
  // Ligne de trous cote arriere (37mm du bord arriere)
  const backZ = -panelDepth / 2 + SYSTEM32.backEdgeDistance;

  // Calculer les positions Y (hauteur) des trous
  let currentY = -panelHeight / 2 + SYSTEM32.firstHoleOffset;
  const maxY = panelHeight / 2 - SYSTEM32.firstHoleOffset;

  while (currentY <= maxY) {
    // Trou ligne avant
    holes.push({ y: currentY, z: frontZ });
    // Trou ligne arriere
    holes.push({ y: currentY, z: backZ });

    currentY += SYSTEM32.holeSpacing;
  }

  return holes;
}

interface CaissonMeshProps {
  config: ConfigCaisson;
  panneaux: PanneauCalcule[];
  showDimensions?: boolean;
  showFacade?: boolean;
  showDrillings?: boolean;
  showHingeDrillings?: boolean;
  typeEmbase?: TypeEmbaseBlum;
}

// Composant principal du caisson
function CaissonMesh({
  config,
  panneaux,
  showDimensions = true,
  showFacade = true,
  showDrillings = false,
  showHingeDrillings = false,
  typeEmbase = 'EXPANDO_0mm',
}: CaissonMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Convertir les dimensions en unites 3D
  const H = config.hauteur * SCALE;
  const L = config.largeur * SCALE;
  const P = config.profondeur * SCALE;
  const ep = config.epaisseurStructure * SCALE;
  const epFond = config.epaisseurFond * SCALE;
  const epFacade = config.epaisseurFacade * SCALE;

  // Calculer les positions des panneaux
  const panneauxPositions = useMemo(() => {
    const positions: Array<{
      type: string;
      position: [number, number, number];
      dimensions: [number, number, number];
      color: string;
    }> = [];

    // Cote gauche
    positions.push({
      type: 'cote_gauche',
      position: [-L / 2 + ep / 2, 0, 0],
      dimensions: [ep, H, P],
      color: COULEURS.structure,
    });

    // Cote droit
    positions.push({
      type: 'cote_droit',
      position: [L / 2 - ep / 2, 0, 0],
      dimensions: [ep, H, P],
      color: COULEURS.structure,
    });

    // Panneau haut
    positions.push({
      type: 'haut',
      position: [0, H / 2 - ep / 2, 0],
      dimensions: [L - 2 * ep, ep, P],
      color: COULEURS.structure,
    });

    // Panneau bas
    positions.push({
      type: 'bas',
      position: [0, -H / 2 + ep / 2, 0],
      dimensions: [L - 2 * ep, ep, P],
      color: COULEURS.structure,
    });

    // Fond (recule de l'epaisseur)
    positions.push({
      type: 'fond',
      position: [0, 0, -P / 2 + epFond / 2],
      dimensions: [L - 2 * ep, H, epFond],
      color: COULEURS.fond,
    });

    // Facade (si presente)
    if (config.avecFacade && showFacade) {
      const jeu = config.jeuFacade * SCALE;
      const facadeH = H - jeu;
      const facadeL = L - jeu;

      positions.push({
        type: 'facade',
        position: [0, 0, P / 2 + epFacade / 2 + 0.005], // Legere separation
        dimensions: [facadeL, facadeH, epFacade],
        color: COULEURS.facade,
      });
    }

    return positions;
  }, [H, L, P, ep, epFond, epFacade, config.avecFacade, config.jeuFacade, showFacade]);

  // Calculer les positions des trous System 32 pour les cotes
  const drillingPositions = useMemo(() => {
    if (!showDrillings) return { leftSide: [], rightSide: [] };

    const holes = calculateSystem32Holes(config.hauteur, config.profondeur);

    // Trous sur le cote gauche (face interne = vers la droite, +X)
    const leftSideX = -L / 2 + ep; // Position X du bord interne du cote gauche
    const leftSide = holes.map((hole) => ({
      position: [
        leftSideX + (SYSTEM32.holeDepth * SCALE) / 2, // Centre du cylindre dans l'epaisseur
        hole.y * SCALE,
        hole.z * SCALE,
      ] as [number, number, number],
      rotation: [0, 0, Math.PI / 2] as [number, number, number], // Rotation pour orienter le cylindre en X
    }));

    // Trous sur le cote droit (face interne = vers la gauche, -X)
    const rightSideX = L / 2 - ep; // Position X du bord interne du cote droit
    const rightSide = holes.map((hole) => ({
      position: [
        rightSideX - (SYSTEM32.holeDepth * SCALE) / 2, // Centre du cylindre dans l'epaisseur
        hole.y * SCALE,
        hole.z * SCALE,
      ] as [number, number, number],
      rotation: [0, 0, -Math.PI / 2] as [number, number, number], // Rotation opposee
    }));

    return { leftSide, rightSide };
  }, [showDrillings, config.hauteur, config.profondeur, L, ep]);


  return (
    <group ref={groupRef}>
      {panneauxPositions.map((panneau, index) => (
        <PanneauMesh
          key={`${panneau.type}-${index}`}
          position={panneau.position}
          dimensions={panneau.dimensions}
          color={panneau.color}
          showEdges={true}
          name={panneau.type}
        />
      ))}

      {/* Trous de percage System 32 */}
      {showDrillings && (
        <>
          {/* Trous cote gauche */}
          {drillingPositions.leftSide.map((hole, index) => (
            <DrillingHole
              key={`drill-left-${index}`}
              position={hole.position}
              rotation={hole.rotation}
              diameter={SYSTEM32.holeDiameter}
              depth={SYSTEM32.holeDepth}
            />
          ))}
          {/* Trous cote droit */}
          {drillingPositions.rightSide.map((hole, index) => (
            <DrillingHole
              key={`drill-right-${index}`}
              position={hole.position}
              rotation={hole.rotation}
              diameter={SYSTEM32.holeDiameter}
              depth={SYSTEM32.holeDepth}
            />
          ))}
        </>
      )}

      {/* Percages charnieres (cups, INSERTA, embases) */}
      {showHingeDrillings && config.avecFacade && (
        <PercagesCharnieres3D
          config={config}
          typeEmbase={typeEmbase}
          showFacadeDrillings={true}
          showCoteDrillings={true}
        />
      )}

      {/* Affichage des dimensions */}
      {showDimensions && (
        <>
          {/* Hauteur */}
          <Text
            position={[-L / 2 - 0.1, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.05}
            color="#333"
            anchorX="center"
            anchorY="middle"
          >
            {config.hauteur}mm
          </Text>

          {/* Largeur */}
          <Text
            position={[0, -H / 2 - 0.08, P / 2]}
            fontSize={0.05}
            color="#333"
            anchorX="center"
            anchorY="middle"
          >
            {config.largeur}mm
          </Text>

          {/* Profondeur */}
          <Text
            position={[L / 2 + 0.08, -H / 2 - 0.05, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            fontSize={0.05}
            color="#333"
            anchorX="center"
            anchorY="middle"
          >
            {config.profondeur}mm
          </Text>
        </>
      )}
    </group>
  );
}

interface CaissonPreview3DProps {
  config: ConfigCaisson;
  panneaux: PanneauCalcule[];
  showDimensions?: boolean;
  showFacade?: boolean;
  showDrillings?: boolean;
  showHingeDrillings?: boolean;
  typeEmbase?: TypeEmbaseBlum;
  className?: string;
}

export default function CaissonPreview3D({
  config,
  panneaux,
  showDimensions = true,
  showFacade = true,
  showDrillings = false,
  showHingeDrillings = false,
  typeEmbase = 'EXPANDO_0mm',
  className = '',
}: CaissonPreview3DProps) {
  // Calculer la distance de camera en fonction de la taille du caisson
  const maxDim = Math.max(config.hauteur, config.largeur, config.profondeur) * SCALE;
  const cameraDistance = maxDim * 2.5;

  return (
    <div className={`w-full h-full min-h-[400px] bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg ${className}`}>
      <Canvas shadows>
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[cameraDistance, cameraDistance * 0.7, cameraDistance]}
          fov={45}
        />

        {/* Controles orbitaux - sans inertie */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          enableDamping={false}
          dampingFactor={0}
          rotateSpeed={0.5}
          minDistance={0.5}
          maxDistance={5}
          target={[0, 0, 0]}
        />

        {/* Eclairage */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-5, 3, -5]} intensity={0.3} />

        {/* Environnement */}
        <Environment preset="studio" />

        {/* Grille au sol */}
        <gridHelper args={[2, 20, '#cccccc', '#eeeeee']} position={[0, -config.hauteur * SCALE / 2 - 0.01, 0]} />

        {/* Caisson */}
        <CaissonMesh
          config={config}
          panneaux={panneaux}
          showDimensions={showDimensions}
          showFacade={showFacade}
          showDrillings={showDrillings}
          showHingeDrillings={showHingeDrillings}
          typeEmbase={typeEmbase}
        />
      </Canvas>

      {/* Legende */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COULEURS.structure }} />
          <span>Structure</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COULEURS.fond }} />
          <span>Fond</span>
        </div>
        {config.avecFacade && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COULEURS.facade }} />
            <span>Facade</span>
          </div>
        )}
        {showDrillings && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COULEURS.drilling }} />
            <span>Percages System 32</span>
          </div>
        )}
        {showHingeDrillings && config.avecFacade && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#e53e3e' }} />
              <span>Cup 35mm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3182ce' }} />
              <span>INSERTA 8mm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#38a169' }} />
              <span>Embase {typeEmbase.replace('_', ' ')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
