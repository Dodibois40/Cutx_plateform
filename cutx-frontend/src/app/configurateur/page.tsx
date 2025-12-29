'use client';

/**
 * Page Configurateur V3 - Route directe
 *
 * Cette page permet d'accéder au ConfigurateurV3 directement via /configurateur
 * Utile pour:
 * - Accès direct au configurateur (sans authentification)
 * - Plugin CutX SketchUp via API + redirect (?import=sessionId)
 * - Plugin CutX SketchUp via postMessage (legacy iframe)
 * - Tests et démo
 *
 * Modes de pré-remplissage:
 * 1. URL ?import=sessionId → Fetch API /api/cutx/import/:id
 * 2. postMessage INIT_PLUGIN → Communication iframe directe
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfigurateurV3 from '@/components/configurateur/ConfigurateurV3';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import { creerNouvelleLigne } from '@/lib/configurateur/constants';
import { mettreAJourCalculsLigne } from '@/lib/configurateur/calculs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// ═══════════════════════════════════════════════════════════════
// TYPES SKETCHUP / CUTX
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// COMMUNICATION SKETCHUP
// ═══════════════════════════════════════════════════════════════

function sendToSketchUp(type: string, data?: unknown) {
  const message = { type, data };
  console.log('[ConfigV3] Envoi vers parent:', type);
  if (window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION SKETCHUP → CONFIGURATEUR V3
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE (avec useSearchParams)
// ═══════════════════════════════════════════════════════════════

function ConfigurateurContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projetNom, setProjetNom] = useState<string>('Nouveau projet');
  const [initialLignes, setInitialLignes] = useState<LignePrestationV3[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasReceivedData = useRef(false);

  // Charger les données depuis l'API si ?import= est présent
  useEffect(() => {
    const importId = searchParams.get('import');

    if (importId && !hasReceivedData.current) {
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
          console.log('[ConfigV3] Données reçues:', data.panneaux?.length, 'panneaux');

          if (data.projetNom) setProjetNom(data.projetNom);

          if (data.panneaux?.length > 0) {
            const lignes = convertirPanneauxEnLignes(data.panneaux);
            setInitialLignes(lignes);
            console.log('[ConfigV3] Lignes pré-remplies:', lignes.length);
          }
        })
        .catch((err) => {
          console.error('[ConfigV3] Erreur import:', err);
          setError(err.message || 'Erreur lors du chargement des données');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [searchParams]);

  // Écouter les messages (plugin CutX via iframe ou postMessage - legacy)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      console.log('[ConfigV3] Message reçu:', message.type);

      if (message.type === 'INIT_PLUGIN' && !hasReceivedData.current) {
        hasReceivedData.current = true;
        const data = message.data as SketchUpData;

        if (data.projetNom) setProjetNom(data.projetNom);

        if (data.panneaux?.length > 0) {
          const lignes = convertirPanneauxEnLignes(data.panneaux);
          setInitialLignes(lignes);
          console.log('[ConfigV3] Lignes pré-remplies:', lignes.length);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Signaler que la page est prête (pour iframe)
    setTimeout(() => {
      sendToSketchUp('READY');
      console.log('[ConfigV3] READY envoyé');
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

  // Afficher le loader pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Chargement des panneaux depuis SketchUp...</p>
        </div>
      </div>
    );
  }

  // Afficher l'erreur si présente
  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0E0D] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
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

  return (
    <ConfigurateurV3
      isClientMode={true}
      initialData={initialLignes ? {
        referenceChantier: projetNom,
        lignes: initialLignes,
      } : undefined}
      onBack={handleBack}
    />
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
