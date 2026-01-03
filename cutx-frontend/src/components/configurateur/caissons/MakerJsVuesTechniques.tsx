// components/configurateur/caissons/MakerJsVuesTechniques.tsx
// Vues techniques 2D generees avec Maker.js (meme moteur que l'export DXF)

'use client';

import { useMemo } from 'react';
import makerjs from 'makerjs';
import type { ConfigCaisson, ResultatCalculCaisson } from '@/lib/caissons/types';
import {
  SYSTEM32,
  CHARNIERES,
  MINIFIX,
  RAINURES,
  calculerNombreCharnieres,
  calculerDistanceRainure,
} from './vues-techniques/constants';
import styles from './styles/VuesTechniques.module.css';

interface MakerJsVuesTechniquesProps {
  config: ConfigCaisson;
  resultat: ResultatCalculCaisson | null;
  showDimensions?: boolean;
  showDrillings?: boolean;
  showHinges?: boolean;
  className?: string;
}

// ============================================================================
// COULEURS SVG
// ============================================================================
const COLORS = {
  structure: '#2d3748',
  structureFill: '#e2e8f0',
  fond: '#94a3b8',
  fondFill: '#cbd5e1',
  facade: '#3b82f6',
  facadeFill: 'rgba(59, 130, 246, 0.15)',
  drilling: '#f59e0b',
  drillingFill: '#fef3c7',
  hinge: '#22c55e',
  hingeFill: '#bbf7d0',
  cotation: '#64748b',
  rainure: '#ef4444',
};

// ============================================================================
// FONCTIONS DE GENERATION MAKER.JS
// ============================================================================

/**
 * Cree un cercle de percage
 */
function createHole(x: number, y: number, diameter: number): makerjs.IModel {
  const circle = new makerjs.models.Ellipse(diameter / 2, diameter / 2);
  makerjs.model.move(circle, [x, y]);
  return circle;
}

/**
 * Genere la vue de face (Hauteur x Largeur)
 */
function generateVueFace(
  config: ConfigCaisson,
  showDrillings: boolean
): makerjs.IModel {
  const H = config.hauteur;
  const L = config.largeur;
  const ep = config.epaisseurStructure;

  const model: makerjs.IModel = { models: {}, paths: {} };

  // Contour exterieur
  model.models!['contour'] = new makerjs.models.Rectangle(L, H);

  // Cote gauche
  model.models!['coteGauche'] = new makerjs.models.Rectangle(ep, H);

  // Cote droit
  const coteDroit = new makerjs.models.Rectangle(ep, H);
  makerjs.model.move(coteDroit, [L - ep, 0]);
  model.models!['coteDroit'] = coteDroit;

  // Panneau haut
  const panneauHaut = new makerjs.models.Rectangle(L - 2 * ep, ep);
  makerjs.model.move(panneauHaut, [ep, H - ep]);
  model.models!['panneauHaut'] = panneauHaut;

  // Panneau bas
  const panneauBas = new makerjs.models.Rectangle(L - 2 * ep, ep);
  makerjs.model.move(panneauBas, [ep, 0]);
  model.models!['panneauBas'] = panneauBas;

  // Rainure (si applicable)
  if (config.typeFond === 'rainure' || config.typeFond === 'encastre') {
    const distRainure = calculerDistanceRainure(config.epaisseurFond);
    // Ligne verticale gauche
    model.paths!['rainureG'] = new makerjs.paths.Line(
      [ep + distRainure, ep],
      [ep + distRainure, H - ep]
    );
    // Ligne verticale droite
    model.paths!['rainureD'] = new makerjs.paths.Line(
      [L - ep - distRainure, ep],
      [L - ep - distRainure, H - ep]
    );
  }

  // Facade en pointilles (si active)
  if (config.avecFacade) {
    const jeu = config.jeuFacade || 2;
    const facadeRect = new makerjs.models.Rectangle(L - 2 * jeu, H - 2 * jeu);
    makerjs.model.move(facadeRect, [jeu, jeu]);
    model.models!['facade'] = facadeRect;
  }

  return model;
}

/**
 * Genere la vue de cote (Hauteur x Profondeur)
 */
function generateVueCote(
  config: ConfigCaisson,
  showDrillings: boolean
): makerjs.IModel {
  const H = config.hauteur;
  const P = config.profondeur;
  const ep = config.epaisseurStructure;
  const epFond = config.epaisseurFond;

  const model: makerjs.IModel = { models: {}, paths: {} };

  // Contour du cote
  model.models!['contour'] = new makerjs.models.Rectangle(P, H);

  // Panneau haut (en coupe)
  const panneauHaut = new makerjs.models.Rectangle(P, ep);
  makerjs.model.move(panneauHaut, [0, H - ep]);
  model.models!['panneauHaut'] = panneauHaut;

  // Fond
  const distRainure = calculerDistanceRainure(epFond);
  if (config.typeFond === 'applique') {
    // Fond applique a l'arriere
    const fond = new makerjs.models.Rectangle(epFond, H);
    model.models!['fond'] = fond;
  } else {
    // Fond dans rainure
    const fond = new makerjs.models.Rectangle(epFond, H - 2 * ep);
    makerjs.model.move(fond, [distRainure - epFond / 2, ep]);
    model.models!['fond'] = fond;

    // Rainure visible
    model.paths!['rainureHaut'] = new makerjs.paths.Line(
      [distRainure - 2, H - ep],
      [distRainure + 2, H - ep]
    );
    model.paths!['rainureBas'] = new makerjs.paths.Line(
      [distRainure - 2, ep],
      [distRainure + 2, ep]
    );
  }

  // System 32 (trous sur le cote)
  if (showDrillings) {
    const premierTrou = SYSTEM32.premierTrouOffset;
    const nombreTrous = Math.floor((H - premierTrou - 32) / SYSTEM32.espacementTrous) + 1;

    for (let i = 0; i < nombreTrous; i++) {
      const y = premierTrou + i * SYSTEM32.espacementTrous;
      // Rangee avant
      model.models![`s32_avant_${i}`] = createHole(
        P - SYSTEM32.distanceBordAvant,
        y,
        SYSTEM32.diametreTrouSysteme
      );
      // Rangee arriere
      model.models![`s32_arriere_${i}`] = createHole(
        SYSTEM32.distanceBordArriere,
        y,
        SYSTEM32.diametreTrouSysteme
      );
    }
  }

  // Facade en pointilles
  if (config.avecFacade) {
    model.paths!['facadeLigne'] = new makerjs.paths.Line(
      [P, 0],
      [P, H]
    );
  }

  return model;
}

/**
 * Genere la vue de dessus (Largeur x Profondeur)
 */
function generateVueDessus(
  config: ConfigCaisson,
  showDrillings: boolean,
  showHinges: boolean
): makerjs.IModel {
  const L = config.largeur;
  const P = config.profondeur;
  const ep = config.epaisseurStructure;
  const H = config.hauteur;

  const model: makerjs.IModel = { models: {}, paths: {} };

  // Contour exterieur
  model.models!['contour'] = new makerjs.models.Rectangle(L, P);

  // Cote gauche
  model.models!['coteGauche'] = new makerjs.models.Rectangle(ep, P);

  // Cote droit
  const coteDroit = new makerjs.models.Rectangle(ep, P);
  makerjs.model.move(coteDroit, [L - ep, 0]);
  model.models!['coteDroit'] = coteDroit;

  // Panneau arriere (haut)
  const panneauArriere = new makerjs.models.Rectangle(L - 2 * ep, ep);
  makerjs.model.move(panneauArriere, [ep, 0]);
  model.models!['panneauArriere'] = panneauArriere;

  // Lignes System 32
  if (showDrillings) {
    const ligne37 = SYSTEM32.distanceBordAvant;
    // Ligne avant
    model.paths!['ligne32Avant'] = new makerjs.paths.Line(
      [0, P - ligne37],
      [L, P - ligne37]
    );
    // Ligne arriere
    model.paths!['ligne32Arriere'] = new makerjs.paths.Line(
      [0, ligne37],
      [L, ligne37]
    );
  }

  // Charnieres
  if (showHinges && config.avecFacade) {
    const nombreCharnieres = calculerNombreCharnieres(H);
    const distBord = CHARNIERES.distanceBord;
    const xHinge = config.positionCharniere === 'gauche' ? distBord : L - distBord;

    // Espacement des charnieres
    const espacement = nombreCharnieres > 1
      ? (P - 2 * 50) / (nombreCharnieres - 1)
      : 0;

    for (let i = 0; i < nombreCharnieres; i++) {
      const yHinge = 50 + i * espacement;
      // Cup 35mm
      model.models![`hinge_${i}`] = createHole(xHinge, yHinge, CHARNIERES.diametreCup / 5);
    }

    // Ligne axe charnieres
    model.paths!['axeCharnieres'] = new makerjs.paths.Line(
      [xHinge, 0],
      [xHinge, P]
    );
  }

  return model;
}

/**
 * Ajoute des cotations a un modele
 */
function addDimensions(
  model: makerjs.IModel,
  width: number,
  height: number,
  labelH: string,
  labelV: string,
  offset: number = 20
): void {
  // Cotation horizontale (bas)
  model.paths!['cotH1'] = new makerjs.paths.Line([0, -offset], [width, -offset]);
  model.paths!['cotH1ext1'] = new makerjs.paths.Line([0, 0], [0, -offset - 5]);
  model.paths!['cotH1ext2'] = new makerjs.paths.Line([width, 0], [width, -offset - 5]);

  // Cotation verticale (gauche)
  model.paths!['cotV1'] = new makerjs.paths.Line([-offset, 0], [-offset, height]);
  model.paths!['cotV1ext1'] = new makerjs.paths.Line([0, 0], [-offset - 5, 0]);
  model.paths!['cotV1ext2'] = new makerjs.paths.Line([0, height], [-offset - 5, height]);
}

/**
 * Convertit un modele Maker.js en SVG avec styles
 */
function modelToSvg(
  model: makerjs.IModel,
  width: number,
  height: number,
  scale: number,
  title: string
): string {
  // Ajouter padding pour les cotations
  const padding = 40;
  const svgWidth = width * scale + padding * 2;
  const svgHeight = height * scale + padding * 2;

  const svgOptions: makerjs.exporter.ISVGRenderOptions = {
    stroke: COLORS.structure,
    strokeWidth: '1.5px',
    fill: 'none',
    scalingStroke: true,
    useSvgPathOnly: false,
    viewBox: true,
    svgAttrs: {
      width: `${svgWidth}`,
      height: `${svgHeight}`,
    },
  };

  // Mettre a l'echelle
  const scaledModel = makerjs.model.scale(makerjs.cloneObject(model), scale);
  makerjs.model.move(scaledModel, [padding, padding]);

  let svg = makerjs.exporter.toSVG(scaledModel, svgOptions);

  // Ajouter le titre
  const titleY = 16;
  const titleSvg = `<text x="${svgWidth / 2}" y="${titleY}" text-anchor="middle" font-size="12" font-weight="600" fill="${COLORS.cotation}">${title}</text>`;
  svg = svg.replace('</svg>', `${titleSvg}</svg>`);

  return svg;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function MakerJsVuesTechniques({
  config,
  resultat,
  showDimensions = true,
  showDrillings = true,
  showHinges = true,
  className = '',
}: MakerJsVuesTechniquesProps) {
  // Generer les vues avec Maker.js
  const vueFaceSvg = useMemo(() => {
    const model = generateVueFace(config, showDrillings);
    if (showDimensions) {
      addDimensions(model, config.largeur, config.hauteur, `${config.largeur}`, `${config.hauteur}`);
    }
    // Echelle pour tenir dans ~300px
    const scale = Math.min(280 / config.largeur, 280 / config.hauteur, 0.4);
    return modelToSvg(model, config.largeur, config.hauteur, scale, 'VUE DE FACE');
  }, [config, showDimensions, showDrillings]);

  const vueCoteSvg = useMemo(() => {
    const model = generateVueCote(config, showDrillings);
    if (showDimensions) {
      addDimensions(model, config.profondeur, config.hauteur, `${config.profondeur}`, `${config.hauteur}`);
    }
    const scale = Math.min(200 / config.profondeur, 280 / config.hauteur, 0.35);
    return modelToSvg(model, config.profondeur, config.hauteur, scale, 'VUE DE COTE');
  }, [config, showDimensions, showDrillings]);

  const vueDessusSvg = useMemo(() => {
    const model = generateVueDessus(config, showDrillings, showHinges);
    if (showDimensions) {
      addDimensions(model, config.largeur, config.profondeur, `${config.largeur}`, `${config.profondeur}`);
    }
    const scale = Math.min(300 / config.largeur, 180 / config.profondeur, 0.35);
    return modelToSvg(model, config.largeur, config.profondeur, scale, 'VUE DE DESSUS');
  }, [config, showDimensions, showDrillings, showHinges]);

  // Resume
  const resume = useMemo(() => {
    if (!resultat) return null;
    return {
      nombrePanneaux: resultat.panneaux.length,
      surfaceTotal: resultat.surfaceTotaleM2,
      mlChants: resultat.metresLineairesTotaux,
    };
  }, [resultat]);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Vues Techniques (Maker.js)</h3>
        {resume && (
          <div className={styles.resume}>
            <span>{resume.nombrePanneaux} panneaux</span>
            <span className={styles.separator}>|</span>
            <span>{resume.surfaceTotal.toFixed(3)} m2</span>
            <span className={styles.separator}>|</span>
            <span>{resume.mlChants.toFixed(2)} ml chants</span>
          </div>
        )}
      </div>

      {/* Grille des vues */}
      <div className={styles.viewsGrid}>
        <div className={styles.topRow}>
          {/* Vue de Face */}
          <div className={styles.viewWrapper}>
            <div dangerouslySetInnerHTML={{ __html: vueFaceSvg }} />
            <div style={{ textAlign: 'center', fontSize: '11px', color: COLORS.cotation, marginTop: '4px' }}>
              {config.largeur} x {config.hauteur} mm
            </div>
          </div>

          {/* Vue de Cote */}
          <div className={styles.viewWrapper}>
            <div dangerouslySetInnerHTML={{ __html: vueCoteSvg }} />
            <div style={{ textAlign: 'center', fontSize: '11px', color: COLORS.cotation, marginTop: '4px' }}>
              {config.profondeur} x {config.hauteur} mm
            </div>
          </div>
        </div>

        {/* Vue de Dessus */}
        <div className={styles.bottomRow}>
          <div className={styles.viewWrapper}>
            <div dangerouslySetInnerHTML={{ __html: vueDessusSvg }} />
            <div style={{ textAlign: 'center', fontSize: '11px', color: COLORS.cotation, marginTop: '4px' }}>
              {config.largeur} x {config.profondeur} mm
              {showHinges && config.avecFacade && (
                <span style={{ marginLeft: '10px', color: COLORS.hinge }}>
                  {calculerNombreCharnieres(config.hauteur)} charnieres
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legende */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: COLORS.structureFill, border: `1px solid ${COLORS.structure}` }} />
          <span>Structure</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: COLORS.fondFill, border: `1px solid ${COLORS.fond}` }} />
          <span>Fond</span>
        </div>
        {config.avecFacade && (
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ backgroundColor: COLORS.facadeFill, border: `1px dashed ${COLORS.facade}` }} />
            <span>Facade</span>
          </div>
        )}
        {showDrillings && (
          <div className={styles.legendItem}>
            <span className={styles.legendLine} style={{ borderBottom: `2px dashed ${COLORS.drilling}` }} />
            <span>System 32</span>
          </div>
        )}
        {showHinges && config.avecFacade && (
          <div className={styles.legendItem}>
            <span className={styles.legendCircle} style={{ backgroundColor: COLORS.hingeFill, border: `1px solid ${COLORS.hinge}` }} />
            <span>Charnieres</span>
          </div>
        )}
      </div>

      {/* Tableau des dimensions */}
      {resultat && (
        <div className={styles.dimensionsTable}>
          <h4 className={styles.tableTitle}>Nomenclature des Panneaux</h4>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rep.</th>
                <th>Designation</th>
                <th>L (mm)</th>
                <th>l (mm)</th>
                <th>Ep</th>
                <th>Qte</th>
                <th>Chants</th>
              </tr>
            </thead>
            <tbody>
              {resultat.panneaux.map((panneau) => (
                <tr key={panneau.id}>
                  <td className={styles.cellCenter}>{panneau.nomCourt}</td>
                  <td>{panneau.nom}</td>
                  <td className={styles.cellRight}>{panneau.longueur}</td>
                  <td className={styles.cellRight}>{panneau.largeur}</td>
                  <td className={styles.cellCenter}>{panneau.epaisseur}</td>
                  <td className={styles.cellCenter}>{panneau.quantite}</td>
                  <td className={styles.cellChants}>
                    {panneau.chants.A && <span className={styles.chantBadge}>A</span>}
                    {panneau.chants.B && <span className={styles.chantBadge}>B</span>}
                    {panneau.chants.C && <span className={styles.chantBadge}>C</span>}
                    {panneau.chants.D && <span className={styles.chantBadge}>D</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
