'use client';

/**
 * Context pour le Multicouche Builder
 *
 * Gère l'état de la construction d'un panneau multicouche artisanal:
 * - Liste des couches (2-6)
 * - Mode de collage (fournisseur / artisan)
 * - Calculs automatiques (dimensions, prix, chutes)
 * - Navigation vers le configurateur
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from '@/i18n/routing';
import type { SearchProduct } from '../types';
import type {
  BuilderCouche,
  MulticoucheBuilderContextType,
  ChantsConfig,
  ChutePreview,
  MulticoucheBuilderStorageData,
} from './types';
import { MULTICOUCHE_BUILDER_STORAGE_KEY } from './types';
import type { ModeCollage, TypeCouche } from '@/lib/configurateur-multicouche/types';
import { REGLES_MULTICOUCHE } from '@/lib/configurateur-multicouche/constants';
import {
  calculerChutes,
  calculerDimensionsFinales,
  calculerEpaisseurTotale,
  calculerPrixCouches,
  calculerPrixCollage,
} from '@/lib/configurateur-multicouche/chutes';

// ============================================================================
// HELPERS
// ============================================================================

function createEmptyCouche(ordre: number, type: TypeCouche): BuilderCouche {
  return {
    id: crypto.randomUUID(),
    ordre,
    type,
    materiau: '',
    epaisseur: 0,
    sensDuFil: type === 'parement' ? 'longueur' : undefined,
    panneauId: null,
    panneauNom: null,
    panneauReference: null,
    panneauImageUrl: null,
    panneauLongueur: null,
    panneauLargeur: null,
    prixPanneauM2: 0,
    surfaceM2: 0,
    prixCouche: 0,
    produit: null,
    isActive: false,
  };
}

function createDefaultCouches(): BuilderCouche[] {
  return [
    createEmptyCouche(1, 'parement'),
    createEmptyCouche(2, 'ame'),
    createEmptyCouche(3, 'contrebalancement'),
  ];
}

function createDefaultChants(): ChantsConfig {
  return {
    chant: null,
    actifs: { A: false, B: false, C: false, D: false },
  };
}

// ============================================================================
// CONTEXT
// ============================================================================

const MulticoucheBuilderContext =
  createContext<MulticoucheBuilderContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface MulticoucheBuilderProviderProps {
  children: ReactNode;
}

export function MulticoucheBuilderProvider({
  children,
}: MulticoucheBuilderProviderProps) {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [modeCollage, setModeCollageState] = useState<ModeCollage>('fournisseur');
  const [couches, setCouches] = useState<BuilderCouche[]>(createDefaultCouches);
  const [activeCoucheId, setActiveCoucheId] = useState<string | null>(null);
  const [avecSurcote, setAvecSurcote] = useState(false);
  const [surcoteMm, setSurcoteMmState] = useState(REGLES_MULTICOUCHE.SURCOTE_DEFAUT);
  const [chants, setChants] = useState<ChantsConfig>(createDefaultChants);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const dimensionsFinales = useMemo(
    () => calculerDimensionsFinales(couches),
    [couches]
  );

  const chutes = useMemo<ChutePreview[]>(
    () => calculerChutes(couches, dimensionsFinales),
    [couches, dimensionsFinales]
  );

  const epaisseurTotale = useMemo(
    () => calculerEpaisseurTotale(couches),
    [couches]
  );

  const prixTotalCouches = useMemo(
    () => calculerPrixCouches(couches, dimensionsFinales),
    [couches, dimensionsFinales]
  );

  const prixCollage = useMemo(
    () => calculerPrixCollage(modeCollage, couches.length, dimensionsFinales),
    [modeCollage, couches.length, dimensionsFinales]
  );

  const prixTotal = prixTotalCouches + prixCollage;

  // Validation
  const validation = useMemo(() => {
    const erreurs: string[] = [];

    if (couches.length < REGLES_MULTICOUCHE.COUCHES_MIN) {
      erreurs.push(`Minimum ${REGLES_MULTICOUCHE.COUCHES_MIN} couches requises`);
    }
    if (couches.length > REGLES_MULTICOUCHE.COUCHES_MAX) {
      erreurs.push(`Maximum ${REGLES_MULTICOUCHE.COUCHES_MAX} couches autorisées`);
    }

    const couchesSansProduit = couches.filter((c) => !c.produit);
    if (couchesSansProduit.length > 0) {
      erreurs.push(`${couchesSansProduit.length} couche(s) sans panneau`);
    }

    if (dimensionsFinales.longueur === 0 || dimensionsFinales.largeur === 0) {
      erreurs.push('Dimensions non définies');
    }

    return {
      isValid: erreurs.length === 0,
      erreurs,
    };
  }, [couches, dimensionsFinales]);

  // ---------------------------------------------------------------------------
  // ACTIONS: MODE
  // ---------------------------------------------------------------------------

  const setModeCollage = useCallback((mode: ModeCollage) => {
    setModeCollageState(mode);
    // Reset surcote si on passe en mode fournisseur
    if (mode === 'fournisseur') {
      setAvecSurcote(false);
    }
    // Reset chants si on passe en mode client (pas de chants possibles)
    if (mode === 'client') {
      setChants(createDefaultChants());
    }
  }, []);

  // ---------------------------------------------------------------------------
  // ACTIONS: COUCHES
  // ---------------------------------------------------------------------------

  const ajouterCouche = useCallback(() => {
    if (couches.length >= REGLES_MULTICOUCHE.COUCHES_MAX) return;

    const nouvelleCouche = createEmptyCouche(couches.length + 1, 'autre');
    setCouches((prev) => [...prev, nouvelleCouche]);
  }, [couches.length]);

  const supprimerCouche = useCallback((coucheId: string) => {
    setCouches((prev) => {
      if (prev.length <= REGLES_MULTICOUCHE.COUCHES_MIN) return prev;

      return prev
        .filter((c) => c.id !== coucheId)
        .map((c, index) => ({ ...c, ordre: index + 1 }));
    });

    // Désactiver si c'était la couche active
    setActiveCoucheId((prev) => (prev === coucheId ? null : prev));
  }, []);

  const setActiveCouche = useCallback((coucheId: string | null) => {
    console.log('[MulticoucheContext] setActiveCouche:', coucheId);
    setActiveCoucheId(coucheId);
    setCouches((prev) =>
      prev.map((c) => ({
        ...c,
        isActive: c.id === coucheId,
      }))
    );
  }, []);

  const updateCoucheType = useCallback((coucheId: string, type: TypeCouche) => {
    console.log('[MulticoucheContext] updateCoucheType:', coucheId, '->', type);
    setCouches((prev) =>
      prev.map((c) => {
        if (c.id !== coucheId) return c;
        return {
          ...c,
          type,
          sensDuFil: type === 'parement' ? 'longueur' : undefined,
        };
      })
    );
  }, []);

  const assignerProduit = useCallback(
    (coucheId: string, produit: SearchProduct) => {
      console.log('[MulticoucheContext] assignerProduit:', coucheId, produit.nom);
      setCouches((prev) =>
        prev.map((c) => {
          if (c.id !== coucheId) return c;

          // Extraire les dimensions du produit
          const longueur =
            typeof produit.longueur === 'number'
              ? produit.longueur
              : typeof produit.longueur === 'string'
                ? parseFloat(produit.longueur)
                : 2800;
          const largeur = produit.largeur || 2070;
          const epaisseur = produit.epaisseur || 19;
          const prixM2 = produit.prixAchatM2 || 0;
          const surfaceM2 = (longueur * largeur) / 1_000_000;

          return {
            ...c,
            produit,
            panneauId: produit.id,
            panneauNom: produit.nom,
            panneauReference: produit.reference,
            panneauImageUrl: produit.imageUrl || null,
            panneauLongueur: longueur,
            panneauLargeur: largeur,
            prixPanneauM2: prixM2,
            epaisseur,
            materiau: produit.type || '',
            surfaceM2,
            prixCouche: surfaceM2 * prixM2,
            isActive: false, // Désactiver après assignation
          };
        })
      );

      // Désactiver la couche après assignation
      setActiveCoucheId(null);
    },
    []
  );

  const retirerProduit = useCallback((coucheId: string) => {
    setCouches((prev) =>
      prev.map((c) => {
        if (c.id !== coucheId) return c;
        return {
          ...c,
          produit: null,
          panneauId: null,
          panneauNom: null,
          panneauReference: null,
          panneauImageUrl: null,
          panneauLongueur: null,
          panneauLargeur: null,
          prixPanneauM2: 0,
          epaisseur: 0,
          surfaceM2: 0,
          prixCouche: 0,
        };
      })
    );
  }, []);

  const reorderCouches = useCallback((fromIndex: number, toIndex: number) => {
    console.log('[MulticoucheContext] reorderCouches:', fromIndex, '->', toIndex);
    setCouches((prev) => {
      const result = [...prev];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      // Recalculer les ordres
      return result.map((c, i) => ({ ...c, ordre: i + 1 }));
    });
  }, []);

  // ---------------------------------------------------------------------------
  // ACTIONS: SURCOTE
  // ---------------------------------------------------------------------------

  const toggleSurcote = useCallback(() => {
    setAvecSurcote((prev) => !prev);
  }, []);

  const setSurcoteMm = useCallback((mm: number) => {
    const clamped = Math.max(
      REGLES_MULTICOUCHE.SURCOTE_MIN,
      Math.min(REGLES_MULTICOUCHE.SURCOTE_MAX, mm)
    );
    setSurcoteMmState(clamped);
  }, []);

  // ---------------------------------------------------------------------------
  // ACTIONS: CHANTS
  // ---------------------------------------------------------------------------

  const assignerChant = useCallback((chant: SearchProduct) => {
    setChants((prev) => ({ ...prev, chant }));
  }, []);

  const retirerChant = useCallback(() => {
    setChants(createDefaultChants());
  }, []);

  const toggleChantCote = useCallback((cote: 'A' | 'B' | 'C' | 'D') => {
    setChants((prev) => ({
      ...prev,
      actifs: { ...prev.actifs, [cote]: !prev.actifs[cote] },
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // ACTIONS: NAVIGATION
  // ---------------------------------------------------------------------------

  const configurerDebit = useCallback(() => {
    if (!validation.isValid) return;

    // Préparer les données pour le configurateur
    const storageData: MulticoucheBuilderStorageData = {
      modeCollage,
      couches,
      dimensionsFinales,
      chants,
      epaisseurTotale,
      prixTotal,
      chutes,
      avecSurcote,
      surcoteMm,
    };

    // Stocker dans sessionStorage
    sessionStorage.setItem(
      MULTICOUCHE_BUILDER_STORAGE_KEY,
      JSON.stringify(storageData)
    );

    // Naviguer vers le configurateur
    router.push('/configurateur?import=multicouche-artisanal');
  }, [
    validation.isValid,
    modeCollage,
    couches,
    dimensionsFinales,
    chants,
    epaisseurTotale,
    prixTotal,
    chutes,
    avecSurcote,
    surcoteMm,
    router,
  ]);

  const reset = useCallback(() => {
    setModeCollageState('fournisseur');
    setCouches(createDefaultCouches());
    setActiveCoucheId(null);
    setAvecSurcote(false);
    setSurcoteMmState(REGLES_MULTICOUCHE.SURCOTE_DEFAUT);
    setChants(createDefaultChants());
  }, []);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const contextValue = useMemo<MulticoucheBuilderContextType>(
    () => ({
      // State
      modeCollage,
      couches,
      activeCoucheId,
      avecSurcote,
      surcoteMm,
      dimensionsFinales,
      chants,
      chutes,
      epaisseurTotale,
      prixTotalCouches,
      prixCollage,
      prixTotal,
      isValid: validation.isValid,
      erreurs: validation.erreurs,

      // Actions
      setModeCollage,
      ajouterCouche,
      supprimerCouche,
      setActiveCouche,
      updateCoucheType,
      assignerProduit,
      retirerProduit,
      reorderCouches,
      toggleSurcote,
      setSurcoteMm,
      assignerChant,
      retirerChant,
      toggleChantCote,
      configurerDebit,
      reset,
    }),
    [
      modeCollage,
      couches,
      activeCoucheId,
      avecSurcote,
      surcoteMm,
      dimensionsFinales,
      chants,
      chutes,
      epaisseurTotale,
      prixTotalCouches,
      prixCollage,
      prixTotal,
      validation,
      setModeCollage,
      ajouterCouche,
      supprimerCouche,
      setActiveCouche,
      updateCoucheType,
      assignerProduit,
      retirerProduit,
      reorderCouches,
      toggleSurcote,
      setSurcoteMm,
      assignerChant,
      retirerChant,
      toggleChantCote,
      configurerDebit,
      reset,
    ]
  );

  return (
    <MulticoucheBuilderContext.Provider value={contextValue}>
      {children}
    </MulticoucheBuilderContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useMulticoucheBuilder(): MulticoucheBuilderContextType {
  const context = useContext(MulticoucheBuilderContext);
  if (!context) {
    throw new Error(
      'useMulticoucheBuilder must be used within MulticoucheBuilderProvider'
    );
  }
  return context;
}

// ============================================================================
// UTILITY: Read from session storage (for Configurateur)
// ============================================================================

export function readMulticoucheBuilderFromSession(): MulticoucheBuilderStorageData | null {
  try {
    const data = sessionStorage.getItem(MULTICOUCHE_BUILDER_STORAGE_KEY);
    if (!data) return null;
    // Don't remove yet - let configurateur consume it
    return JSON.parse(data) as MulticoucheBuilderStorageData;
  } catch {
    return null;
  }
}

export function clearMulticoucheBuilderSession(): void {
  sessionStorage.removeItem(MULTICOUCHE_BUILDER_STORAGE_KEY);
}
