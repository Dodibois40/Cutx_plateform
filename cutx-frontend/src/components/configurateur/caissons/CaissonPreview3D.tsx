'use client';

// components/configurateur/caissons/CaissonPreview3D.tsx
// Previsualisation 3D d'un caisson avec Three.js

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { ConfigCaisson, PanneauCalcule } from '@/lib/caissons/types';

// Facteur d'echelle (1mm = 0.001 unite 3D)
const SCALE = 0.001;

// Couleurs des panneaux
const COULEURS = {
  structure: '#d4a574',    // Bois clair
  fond: '#c9b896',         // Beige
  facade: '#8b7355',       // Bois fonce
  chants: '#5c4033',       // Marron fonce
  wireframe: '#333333',
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

interface CaissonMeshProps {
  config: ConfigCaisson;
  panneaux: PanneauCalcule[];
  showDimensions?: boolean;
  showFacade?: boolean;
}

// Composant principal du caisson
function CaissonMesh({ config, panneaux, showDimensions = true, showFacade = true }: CaissonMeshProps) {
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

  // Animation douce de rotation
  useFrame((state) => {
    if (groupRef.current) {
      // Rotation automatique lente
      // groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

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
  className?: string;
}

export default function CaissonPreview3D({
  config,
  panneaux,
  showDimensions = true,
  showFacade = true,
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

        {/* Controles orbitaux */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COULEURS.facade }} />
            <span>Facade</span>
          </div>
        )}
      </div>
    </div>
  );
}
