'use client';

/**
 * Page Configurateur V3 - Route directe
 *
 * Cette page permet d'acceder au ConfigurateurV3 directement via /[locale]/configurateur
 * Utile pour:
 * - Acces direct au configurateur (sans authentification)
 * - Plugin CutX SketchUp via API + redirect (?import=sessionId)
 * - Plugin CutX SketchUp via postMessage (legacy iframe)
 * - Recherche homepage via ?panel=REFERENCE (pre-selectionne le panneau)
 * - Tests et demo
 *
 * Modes de pre-remplissage:
 * 1. URL ?import=sessionId -> Fetch API /api/cutx/import/:id
 * 2. URL ?panel=REFERENCE -> Fetch panneau et cree une ligne avec ce panneau
 * 3. postMessage INIT_PLUGIN -> Communication iframe directe
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import ConfigurateurV3 from '@/components/configurateur/ConfigurateurV3';
import ThicknessMismatchDialog, { type ThicknessMismatchInfo } from '@/components/configurateur/dialogs/ThicknessMismatchDialog';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { PanneauGroupe } from '@/lib/configurateur/groupes/types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import { creerNouvelleLigne } from '@/lib/configurateur/constants';
import { mettreAJourCalculsLigne } from '@/lib/configurateur/calculs';
import { readImportedLinesFromSession } from '@/components/home/hooks/useFileImport';
import { MULTI_GROUP_CONFIG_KEY, type GroupConfig } from '@/components/home/MultiFileImportWizard';
import type { InitialGroupeData } from '@/contexts/GroupesContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// ===================================================================
// TYPES SKETCHUP / CUTX
// ===================================================================

interface SketchUpPanneau {
  entityId: number;
  reference: string;
  longueur: number;
  largeur: number;
  epaisseur: number;
  panneau?: {
    id: string;
    nom: string;
    marque?: string;
    prixM2?: number;
    imageUrl?: string;
  };
  chants?: { A: boolean; B: boolean; C: boolean; D: boolean; };
  finition?: {
    type: 'vernis' | 'teinte_vernis' | 'laque' | null;
    teinte?: string | null;
    couleurRAL?: string | null;
    brillance?: string | null;
    faces?: 1 | 2;
  };
  usinages?: {
    percage?: boolean;
    liste?: Array<{ type: string; description?: string; quantite?: number; }>;
  };
  materiau?: string;
  sensDuFil?: 'longueur' | 'largeur';
}

interface SketchUpData {
  panneaux: SketchUpPanneau[];
  projetNom: string;
}

// ===================================================================
// COMMUNICATION SKETCHUP
// ===================================================================

function sendToSketchUp(type: string, data?: unknown) {
  const message = { type, data };
  console.log('[ConfigV3] Envoi vers parent:', type);
  if (window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
}

// ===================================================================
// CONVERSION SKETCHUP -> CONFIGURATEUR V3
// ===================================================================

function convertirPanneauxEnLignes(panneaux: SketchUpPanneau[]): LignePrestationV3[] {
  return panneaux.map(panneau => {
    const ligne = creerNouvelleLigne();

    ligne.id = panneau.entityId.toString();
    ligne.reference = panneau.reference;
    ligne.dimensions = {
      longueur: panneau.longueur,
      largeur: panneau.largeur,
      epaisseur: panneau.epaisseur,
    };

    if (panneau.sensDuFil) ligne.sensDuFil = panneau.sensDuFil;
    if (panneau.materiau) ligne.materiau = panneau.materiau;

    if (panneau.panneau) {
      ligne.avecFourniture = true;
      ligne.panneauId = panneau.panneau.id;
      ligne.panneauNom = panneau.panneau.nom;
      ligne.panneauImageUrl = panneau.panneau.imageUrl || null;
      ligne.prixPanneauM2 = panneau.panneau.prixM2 || 0;
    }

    if (panneau.chants) {
      ligne.chants = {
        A: panneau.chants.A ?? true,
        B: panneau.chants.B ?? true,
        C: panneau.chants.C ?? true,
        D: panneau.chants.D ?? true,
      };
    }

    if (panneau.finition?.type) {
      ligne.avecFinition = true;
      ligne.typeFinition = panneau.finition.type;
      if (panneau.finition.type === 'laque') {
        ligne.finition = 'laque';
        ligne.codeCouleurLaque = panneau.finition.couleurRAL || null;
      } else {
        ligne.finition = 'vernis';
        ligne.teinte = panneau.finition.teinte || null;
      }
      if (panneau.finition.brillance) {
        ligne.brillance = panneau.finition.brillance as LignePrestationV3['brillance'];
      }
      ligne.nombreFaces = panneau.finition.faces || 1;
    }

    if (panneau.usinages) {
      ligne.percage = panneau.usinages.percage ?? false;
      if (panneau.usinages.liste?.length) {
        ligne.usinages = panneau.usinages.liste.map(u => ({
          type: u.type,
          description: u.description || '',
          prixUnitaire: 0,
          quantite: u.quantite || 1,
        }));
      }
    }

    return mettreAJourCalculsLigne(ligne);
  });
}

// ===================================================================
// PAGE PRINCIPALE (avec useSearchParams)
// ===================================================================

function ConfigurateurContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projetNom, setProjetNom] = useState<string>('Nouveau projet');
  const [initialLignes, setInitialLignes] = useState<LignePrestationV3[] | undefined>(undefined);
  const [initialGroupe, setInitialGroupe] = useState<{ panneau: PanneauGroupe } | undefined>(undefined);
  const [initialGroupes, setInitialGroupes] = useState<InitialGroupeData[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  // Track if multi-import data has been processed
  const [isMultiImportReady, setIsMultiImportReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasReceivedData = useRef(false);
  const waitingForUserChoice = useRef(false);

  // State for thickness mismatch dialog
  const [thicknessMismatchInfo, setThicknessMismatchInfo] = useState<ThicknessMismatchInfo | null>(null);
  const [pendingGroupeData, setPendingGroupeData] = useState<{
    panneauCatalogue: PanneauCatalogue;
    importedLines: LignePrestationV3[];
    projectName: string;
  } | null>(null);

  // Charger les donnees depuis l'API si ?import= ou ?panel= est present
  useEffect(() => {
    const importId = searchParams.get('import');
    const panelRef = searchParams.get('panel');
    const debitRef = searchParams.get('ref'); // Reference du debit depuis la homepage

    // Mode 0: Multi-file import from homepage wizard
    if (importId === 'multi' && !hasReceivedData.current) {
      hasReceivedData.current = true;
      console.log('[ConfigV3] Mode multi-fichiers detecte');

      try {
        const storedData = sessionStorage.getItem(MULTI_GROUP_CONFIG_KEY);
        if (storedData) {
          sessionStorage.removeItem(MULTI_GROUP_CONFIG_KEY);
          const groupConfigs: GroupConfig[] = JSON.parse(storedData);
          console.log('[ConfigV3] GroupConfigs charges:', groupConfigs.length, 'groupes');

          if (groupConfigs.length > 0) {
            // Convert GroupConfig[] to InitialGroupeData[]
            const groupesData: InitialGroupeData[] = groupConfigs.map(config => {
              // Convert SearchProduct to PanneauCatalogue
              const panneauCatalogue: PanneauCatalogue = {
                id: config.panel.id,
                nom: config.panel.nom,
                categorie: 'agglo_plaque' as const,
                essence: null,
                epaisseurs: config.panel.epaisseur ? [config.panel.epaisseur] : [19],
                prixM2: config.panel.epaisseur
                  ? { [String(config.panel.epaisseur)]: config.panel.prixAchatM2 || 0 }
                  : { '19': config.panel.prixAchatM2 || 0 },
                fournisseur: config.panel.fournisseur || 'Catalogue',
                disponible: true,
                description: config.panel.refFabricant || config.panel.reference,
                ordre: 0,
                longueur: typeof config.panel.longueur === 'number' ? config.panel.longueur : 2800,
                largeur: config.panel.largeur || 2070,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                imageUrl: config.panel.imageUrl || undefined,
              };

              return {
                panneau: { type: 'catalogue' as const, panneau: panneauCatalogue },
                lignes: config.lines,
              };
            });

            setInitialGroupes(groupesData);
            setProjetNom(`Import multi-fichiers (${groupConfigs.reduce((sum, c) => sum + c.lines.length, 0)} pièces)`);
            console.log('[ConfigV3] Groupes crees:', groupesData.length);
          }
        }
        // Mark multi-import as ready (data processed)
        setIsMultiImportReady(true);
      } catch (err) {
        console.error('[ConfigV3] Erreur lecture multi-import:', err);
        setError('Erreur lors du chargement des fichiers importés');
        setIsMultiImportReady(true);
      }
      return; // Skip other import modes
    }

    // Mode AI: Import from AI Assistant
    if (importId === 'ai' && !hasReceivedData.current) {
      hasReceivedData.current = true;
      console.log('[ConfigV3] Mode AI Assistant detecte');

      try {
        const AI_GROUPES_KEY = 'AI_GENERATED_GROUPES';
        const storedData = sessionStorage.getItem(AI_GROUPES_KEY);
        if (storedData) {
          sessionStorage.removeItem(AI_GROUPES_KEY);
          const groupesData: InitialGroupeData[] = JSON.parse(storedData);
          console.log('[ConfigV3] Groupes AI charges:', groupesData.length, 'groupes');

          if (groupesData.length > 0) {
            setInitialGroupes(groupesData);
            const totalPieces = groupesData.reduce((sum, g) => sum + (g.lignes?.length || 0), 0);
            setProjetNom(`Projet IA (${totalPieces} pièces)`);
            console.log('[ConfigV3] Groupes AI crees:', groupesData.length);
          }
        }
        setIsMultiImportReady(true);
      } catch (err) {
        console.error('[ConfigV3] Erreur lecture AI import:', err);
        setError('Erreur lors du chargement de la configuration IA');
        setIsMultiImportReady(true);
      }
      return; // Skip other import modes
    }

    // Mode 1: Import depuis SketchUp (ignore "session" qui est géré différemment)
    if (importId && importId !== 'session' && importId !== 'multi' && importId !== 'ai' && !hasReceivedData.current) {
      hasReceivedData.current = true;
      setIsLoading(true);
      setError(null);

      console.log('[ConfigV3] Chargement import:', importId);

      fetch(`${API_URL}/api/cutx/import/${importId}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Erreur ${res.status}`);
          }
          return res.json();
        })
        .then((data: { panneaux: SketchUpPanneau[]; projetNom?: string }) => {
          console.log('[ConfigV3] Donnees recues:', data.panneaux?.length, 'panneaux');

          if (data.projetNom) setProjetNom(data.projetNom);

          if (data.panneaux?.length > 0) {
            const lignes = convertirPanneauxEnLignes(data.panneaux);
            setInitialLignes(lignes);
            console.log('[ConfigV3] Lignes pre-remplies:', lignes.length);
          }
        })
        .catch((err) => {
          console.error('[ConfigV3] Erreur import:', err);
          setError(err.message || 'Erreur lors du chargement des donnees');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    // Mode 2: Pre-selection panneau depuis recherche homepage
    // Peut inclure des lignes importées via ?import=session
    const importMode = searchParams.get('import');

    if (panelRef && !hasReceivedData.current) {
      hasReceivedData.current = true;
      setIsLoading(true);
      setError(null);

      console.log('[ConfigV3] Chargement panneau:', panelRef);

      // Lire les lignes importées depuis sessionStorage si présentes
      let importedLines: LignePrestationV3[] | null = null;
      if (importMode === 'session') {
        importedLines = readImportedLinesFromSession();
        if (importedLines) {
          console.log('[ConfigV3] Lignes importées depuis session:', importedLines.length);
        }
      }

      fetch(`${API_URL}/api/catalogues/panels/by-reference/${encodeURIComponent(panelRef)}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Panneau "${panelRef}" non trouve`);
          }
          return res.json();
        })
        .then((data: { panel: {
          id: string;
          name: string;
          reference: string;
          manufacturerRef?: string;
          defaultThickness?: number;
          thickness?: number[];
          defaultLength: number;
          defaultWidth: number;
          pricePerM2?: number;
          imageUrl?: string;
          finish?: string;
        } }) => {
          const panel = data.panel;
          console.log('[ConfigV3] Panneau charge:', panel.name);

          // Convertir les donnees API en PanneauCatalogue
          const panneauCatalogue: PanneauCatalogue = {
            id: panel.id,
            nom: panel.name,
            categorie: 'agglo_plaque' as const,
            essence: null,
            epaisseurs: panel.thickness || [panel.defaultThickness || 19],
            prixM2: panel.thickness
              ? Object.fromEntries(panel.thickness.map(e => [e.toString(), panel.pricePerM2 || 0]))
              : { [String(panel.defaultThickness || 19)]: panel.pricePerM2 || 0 },
            fournisseur: 'Catalogue',
            disponible: true,
            description: panel.manufacturerRef || panel.reference,
            ordre: 0,
            longueur: panel.defaultLength || 2800,
            largeur: panel.defaultWidth || 2070,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            imageUrl: panel.imageUrl || undefined,
          };

          const projectName = debitRef || `Débit - ${panel.name}`;
          const panelThickness = panel.defaultThickness || 19;

          // Check for thickness mismatches if there are imported lines
          if (importedLines && importedLines.length > 0) {
            const mismatchedLines = importedLines.filter(
              (line) => line.dimensions.epaisseur !== panelThickness
            );

            if (mismatchedLines.length > 0) {
              // Show dialog for user to decide - keep loading state until user chooses
              waitingForUserChoice.current = true;
              const matchedCount = importedLines.length - mismatchedLines.length;
              setThicknessMismatchInfo({
                panelThickness,
                panelName: panel.name,
                mismatchedLines: mismatchedLines.map((line) => ({
                  reference: line.reference || 'Sans ref',
                  thickness: line.dimensions.epaisseur,
                })),
                matchedCount,
              });
              setPendingGroupeData({
                panneauCatalogue,
                importedLines,
                projectName,
              });
              console.log('[ConfigV3] Epaisseurs incompatibles detectees:', mismatchedLines.length, 'pieces');
              return; // Don't proceed, wait for user choice
            }
          }

          // No mismatches, proceed normally
          const groupe: { panneau: PanneauGroupe; lignes?: LignePrestationV3[] } = {
            panneau: { type: 'catalogue', panneau: panneauCatalogue },
            lignes: importedLines || undefined,
          };
          setProjetNom(projectName);
          setInitialGroupe(groupe);

          const lignesCount = importedLines?.length || 0;
          console.log('[ConfigV3] Groupe cree avec panneau:', panel.name, '- Ref:', projectName, '- Lignes:', lignesCount);
        })
        .catch((err) => {
          console.error('[ConfigV3] Erreur chargement panneau:', err);
          setError(err.message || 'Erreur lors du chargement du panneau');
        })
        .finally(() => {
          // Don't set loading false if waiting for user to choose in thickness mismatch dialog
          if (!waitingForUserChoice.current) {
            setIsLoading(false);
          }
        });
    }
  }, [searchParams]);

  // Ecouter les messages (plugin CutX via iframe ou postMessage - legacy)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      console.log('[ConfigV3] Message recu:', message.type);

      if (message.type === 'INIT_PLUGIN' && !hasReceivedData.current) {
        hasReceivedData.current = true;
        const data = message.data as SketchUpData;

        if (data.projetNom) setProjetNom(data.projetNom);

        if (data.panneaux?.length > 0) {
          const lignes = convertirPanneauxEnLignes(data.panneaux);
          setInitialLignes(lignes);
          console.log('[ConfigV3] Lignes pre-remplies:', lignes.length);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Signaler que la page est prete (pour iframe)
    setTimeout(() => {
      sendToSketchUp('READY');
      console.log('[ConfigV3] READY envoye');
    }, 100);

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Retour (ferme le dialog SketchUp ou navigue)
  const handleBack = useCallback(() => {
    // Si dans iframe SketchUp, envoyer CLOSE
    if (window.parent !== window) {
      sendToSketchUp('CLOSE');
    } else {
      // Sinon retour normal
      router.push('/');
    }
  }, [router]);

  // Handle thickness mismatch: convert all lines to panel thickness
  const handleConvertThickness = useCallback(() => {
    if (!pendingGroupeData) return;

    const { panneauCatalogue, importedLines, projectName } = pendingGroupeData;
    const panelThickness = panneauCatalogue.epaisseurs[0];

    // Convert all lines to the panel thickness
    const convertedLines = importedLines.map((line) => ({
      ...line,
      dimensions: {
        ...line.dimensions,
        epaisseur: panelThickness,
      },
    }));

    const groupe: { panneau: PanneauGroupe; lignes: LignePrestationV3[] } = {
      panneau: { type: 'catalogue', panneau: panneauCatalogue },
      lignes: convertedLines,
    };

    // Clear dialog and waiting state first, then set data
    waitingForUserChoice.current = false;
    setThicknessMismatchInfo(null);
    setPendingGroupeData(null);
    setProjetNom(projectName);
    setInitialGroupe(groupe);
    setIsLoading(false);

    console.log('[ConfigV3] Lignes converties en', panelThickness, 'mm');
  }, [pendingGroupeData]);

  // Handle thickness mismatch: keep mismatched lines as unassigned
  const handleKeepUnassigned = useCallback(() => {
    if (!pendingGroupeData) return;

    const { panneauCatalogue, importedLines, projectName } = pendingGroupeData;
    const panelThickness = panneauCatalogue.epaisseurs[0];

    // Split lines: matched go to group, mismatched go to initial lignes (unassigned)
    const matchedLines = importedLines.filter(
      (line) => line.dimensions.epaisseur === panelThickness
    );
    const mismatchedLines = importedLines.filter(
      (line) => line.dimensions.epaisseur !== panelThickness
    );

    // Create group with matched lines only
    const groupe: { panneau: PanneauGroupe; lignes: LignePrestationV3[] } = {
      panneau: { type: 'catalogue', panneau: panneauCatalogue },
      lignes: matchedLines,
    };

    // Clear dialog and waiting state first, then set data
    waitingForUserChoice.current = false;
    setThicknessMismatchInfo(null);
    setPendingGroupeData(null);
    setProjetNom(projectName);
    setInitialGroupe(groupe);
    // Mismatched lines go to initial lignes (will be shown as unassigned)
    if (mismatchedLines.length > 0) {
      setInitialLignes(mismatchedLines);
    }
    setIsLoading(false);

    console.log('[ConfigV3] Lignes compatibles:', matchedLines.length, '- Non assignees:', mismatchedLines.length);
  }, [pendingGroupeData]);

  // Handle thickness mismatch: cancel import
  const handleCancelImport = useCallback(() => {
    waitingForUserChoice.current = false;
    setThicknessMismatchInfo(null);
    setPendingGroupeData(null);
    setIsLoading(false);
    router.push('/');
  }, [router]);

  // Afficher le loader pendant le chargement multi-import
  const isMultiImportMode = searchParams.get('import') === 'multi';
  if (isMultiImportMode && !isMultiImportReady) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement des fichiers importés...</p>
        </div>
      </div>
    );
  }

  // Afficher le loader pendant le chargement (sauf si on attend le choix utilisateur)
  if (isLoading && !thicknessMismatchInfo) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement des panneaux depuis SketchUp...</p>
        </div>
      </div>
    );
  }

  // Show only the dialog when waiting for user choice
  if (thicknessMismatchInfo && isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0E0D]">
        <ThicknessMismatchDialog
          open={true}
          info={thicknessMismatchInfo}
          onConvert={handleConvertThickness}
          onKeepUnassigned={handleKeepUnassigned}
          onCancel={handleCancelImport}
        />
      </div>
    );
  }

  // Afficher l'erreur si presente
  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-white text-xl font-semibold mb-2">Erreur de chargement</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/configurateur')}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
          >
            Nouveau projet
          </button>
        </div>
      </div>
    );
  }

  // Build initialData based on what we have
  const initialData = initialLignes || initialGroupe || initialGroupes ? {
    referenceChantier: projetNom,
    lignes: initialLignes,
    initialGroupe: initialGroupe,
    initialGroupes: initialGroupes,
  } : undefined;

  return (
    <>
      <ConfigurateurV3
        isClientMode={true}
        initialData={initialData}
        onBack={handleBack}
      />

      {/* Thickness mismatch dialog */}
      <ThicknessMismatchDialog
        open={!!thicknessMismatchInfo}
        info={thicknessMismatchInfo}
        onConvert={handleConvertThickness}
        onKeepUnassigned={handleKeepUnassigned}
        onCancel={handleCancelImport}
      />
    </>
  );
}

// Wrapper avec Suspense pour useSearchParams
export default function ConfigurateurV3Page() {
  return (
    <div className="min-h-screen bg-[#0F0E0D]">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      }>
        <ConfigurateurContent />
      </Suspense>
    </div>
  );
}
