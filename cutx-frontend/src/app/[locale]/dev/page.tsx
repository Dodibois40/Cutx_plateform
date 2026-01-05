'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Circle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Save,
  RotateCcw,
  Sparkles,
  Code2,
  Layers,
  ShoppingCart,
  FileText,
  Settings,
  Palette,
  Globe,
  Zap,
  Shield,
  Database,
  Layout,
  Smartphone,
  TestTube,
  Bug,
  Package,
  Drill,
  FileCode,
  Eye
} from 'lucide-react';

// Types
interface Todo {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffort?: string;
}

interface TodoCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  todos: Todo[];
  collapsed?: boolean;
}

// Initial todos data based on the analysis
const getInitialTodos = (): TodoCategory[] => [
  {
    id: 'core',
    name: 'Configurateur Core',
    icon: <Layers size={18} />,
    color: '#D4A84B',
    todos: [
      { id: 'core-1', title: 'Configurateur V3 - Base', description: 'Ajout/suppression/édition de lignes, tableau de prestations', status: 'completed', priority: 'critical' },
      { id: 'core-2', title: 'Sélection panneau catalogue', description: 'Popup de sélection avec filtres et recherche', status: 'completed', priority: 'critical' },
      { id: 'core-3', title: 'Configuration chants (4 côtés)', description: 'Booléens pour chaque côté A, B, C, D', status: 'completed', priority: 'high' },
      { id: 'core-4', title: 'Finitions (vernis/laque)', description: 'Choix finition avec couleurs et brillance', status: 'completed', priority: 'high' },
      { id: 'core-5', title: 'Calculs de prix temps réel', description: 'Surface, panneau, finition, chants, usinages', status: 'completed', priority: 'critical' },
      { id: 'core-6', title: 'Validation configurateur', description: 'Surface min, montant min, warnings', status: 'completed', priority: 'high' },
      { id: 'core-7', title: 'Copie de lignes', description: 'Avec modal de renommage', status: 'completed', priority: 'medium' },
      { id: 'core-8', title: 'Auto-save localStorage', description: 'Sauvegarde automatique toutes les 500ms', status: 'completed', priority: 'high' },
      { id: 'core-9', title: 'Sens du fil', description: 'Longueur ou largeur pour le panneau', status: 'completed', priority: 'medium' },
      { id: 'core-10', title: 'Forme panneau (5/6)', description: 'Rectangle, Pentagon, Triangle, Cercle, Ellipse ✓ | DXF à faire', status: 'completed', priority: 'high' },
      { id: 'core-11', title: 'SelecteurForme dropdown', description: 'Dropdown avec icônes SVG pour toutes les formes', status: 'completed', priority: 'high' },
      { id: 'core-12', title: 'PopupFormePentagon', description: 'Popup L-shape avec 4 dimensions + coin coupé', status: 'completed', priority: 'high' },
      { id: 'core-13', title: 'PopupFormeTriangle', description: 'Popup triangle rectangle avec angles calculés', status: 'completed', priority: 'high' },
      { id: 'core-14', title: 'Chants dynamiques par forme', description: 'A/B/C/D rectangle, A/B/C triangle, 5 côtés pentagon, contour courbé', status: 'completed', priority: 'high' },
      { id: 'core-15', title: 'Calculs surface/périmètre par forme', description: 'Cercle, ellipse, triangle, L-shape avec Pythagore et Ramanujan', status: 'completed', priority: 'high' },
      { id: 'core-16', title: 'Génération étiquettes PDF', description: 'Export PDF des étiquettes avec options de format', status: 'completed', priority: 'high' },
    ]
  },
  {
    id: 'groupes',
    name: 'Groupes & Drag-Drop',
    icon: <Layout size={18} />,
    color: '#8B5CF6',
    todos: [
      { id: 'grp-1', title: 'GroupesContext', description: 'Contexte React pour gestion des groupes de panneaux', status: 'completed', priority: 'critical' },
      { id: 'grp-2', title: 'GroupePanneau component', description: 'Composant groupe avec panneau sélectionné et lignes', status: 'completed', priority: 'critical' },
      { id: 'grp-3', title: 'ZoneNonAssignee', description: 'Zone pour lignes sans groupe assigné', status: 'completed', priority: 'high' },
      { id: 'grp-4', title: 'GroupesContainer', description: 'Container principal avec tous les groupes', status: 'completed', priority: 'high' },
      { id: 'grp-5', title: 'LignePanneauSortable', description: 'Ligne draggable avec @dnd-kit/sortable', status: 'completed', priority: 'critical' },
      { id: 'grp-6', title: 'Drag & Drop entre groupes', description: 'Déplacer lignes entre groupes et zone non assignée', status: 'completed', priority: 'critical' },
      { id: 'grp-7', title: 'Réordonnancement lignes', description: 'Changer ordre des lignes par drag & drop', status: 'completed', priority: 'high' },
      { id: 'grp-8', title: 'Détection incompatibilité épaisseur', description: 'Warning si épaisseur ligne ≠ épaisseurs panneau', status: 'completed', priority: 'medium' },
      { id: 'grp-9', title: 'Création groupe depuis panneau', description: 'Créer groupe en sélectionnant un panneau', status: 'completed', priority: 'high' },
      { id: 'grp-10', title: 'Suppression groupe', description: 'Supprimer groupe et renvoyer lignes vers non assignées', status: 'completed', priority: 'medium' },
      { id: 'grp-11', title: 'Apply chants à groupe', description: 'Appliquer config chants à toutes les lignes du groupe', status: 'completed', priority: 'medium' },
      { id: 'grp-12', title: 'Apply finition à groupe', description: 'Appliquer finition à toutes les lignes du groupe', status: 'completed', priority: 'medium' },
      { id: 'grp-13', title: 'Totaux par groupe', description: 'Calcul surface et prix par groupe', status: 'completed', priority: 'high' },
      { id: 'grp-14', title: 'Auto-save groupes', description: 'Sauvegarde localStorage des groupes', status: 'completed', priority: 'high' },
      { id: 'grp-15', title: 'Mode groupes toggle', description: 'Basculer entre ancien mode et mode groupes', status: 'completed', priority: 'medium' },
      { id: 'grp-16', title: 'UI/UX groupes desktop', description: 'Affiner l\'interface groupes desktop', status: 'in_progress', priority: 'high' },
      { id: 'grp-17', title: 'UI/UX groupes mobile', description: 'Adapter l\'interface groupes pour mobile', status: 'pending', priority: 'high' },
    ]
  },
  {
    id: 'caisson',
    name: 'Caisson Designer 3D',
    icon: <Package size={18} />,
    color: '#EC4899',
    todos: [
      { id: 'cais-1', title: 'PopupCaissonConfig', description: 'Popup principal du configurateur de caissons', status: 'completed', priority: 'critical' },
      { id: 'cais-2', title: 'CaissonPreview3D', description: 'Visualisation 3D du caisson avec Three.js/R3F', status: 'completed', priority: 'critical' },
      { id: 'cais-3', title: 'EtapeStructure', description: 'Étape 1: Dimensions et type de caisson', status: 'completed', priority: 'high' },
      { id: 'cais-4', title: 'EtapeFond', description: 'Étape 2: Configuration du fond', status: 'completed', priority: 'high' },
      { id: 'cais-5', title: 'EtapeFacade', description: 'Étape 3: Configuration de la façade', status: 'completed', priority: 'high' },
      { id: 'cais-6', title: 'EtapeCharnieres', description: 'Étape 4: Sélection et positionnement charnières', status: 'completed', priority: 'high' },
      { id: 'cais-7', title: 'HingeModel3D', description: 'Modèle 3D des charnières Blum', status: 'completed', priority: 'medium' },
      { id: 'cais-8', title: 'Charnières Blum intégrées', description: 'Catalogue charnières Blum avec spécifications', status: 'completed', priority: 'high' },
      { id: 'cais-9', title: 'Visualisation perçages', description: 'Affichage des points de perçage sur les pièces', status: 'completed', priority: 'high' },
      { id: 'cais-10', title: 'Vues techniques 2D', description: 'VueFace, VueDessus, VueCote avec MakerJS', status: 'completed', priority: 'high' },
      { id: 'cais-11', title: 'Cotations automatiques', description: 'CotationLine pour mesures sur vues techniques', status: 'completed', priority: 'medium' },
      { id: 'cais-12', title: 'Export liste pièces', description: 'Générer liste des pièces pour découpe', status: 'in_progress', priority: 'high' },
      { id: 'cais-13', title: 'Tiroirs et coulisses', description: 'Ajouter configuration tiroirs avec coulisses', status: 'pending', priority: 'high' },
      { id: 'cais-14', title: 'Étagères réglables', description: 'Configuration étagères avec trous 32mm', status: 'pending', priority: 'medium' },
      { id: 'cais-15', title: 'Export DXF/PDF plans', description: 'Export plans de découpe pour CNC', status: 'pending', priority: 'high' },
    ]
  },
  {
    id: 'usinages',
    name: 'Usinages & Perçages',
    icon: <Drill size={18} />,
    color: '#F97316',
    todos: [
      { id: 'usin-1', title: 'Structure données usinages', description: 'Types et modèle de données pour usinages', status: 'in_progress', priority: 'critical' },
      { id: 'usin-2', title: 'Popup sélection usinage', description: 'Interface de choix du type d\'usinage', status: 'pending', priority: 'critical' },
      { id: 'usin-3', title: 'Catalogue usinages', description: 'Liste des usinages disponibles avec prix', status: 'pending', priority: 'high' },
      { id: 'usin-4', title: 'Usinage: Feuillure', description: 'Configuration feuillure (profondeur, largeur)', status: 'pending', priority: 'high' },
      { id: 'usin-5', title: 'Usinage: Rainure', description: 'Configuration rainure (profondeur, largeur, position)', status: 'pending', priority: 'high' },
      { id: 'usin-6', title: 'Usinage: Chanfrein', description: 'Configuration chanfrein (angle, longueur)', status: 'pending', priority: 'medium' },
      { id: 'usin-7', title: 'Usinage: Arrondi', description: 'Configuration arrondi (rayon)', status: 'pending', priority: 'medium' },
      { id: 'usin-8', title: 'Usinage: Découpe forme', description: 'Découpe selon forme personnalisée', status: 'pending', priority: 'medium' },
      { id: 'usin-9', title: 'Perçage: Configuration', description: 'Diamètre, profondeur, position', status: 'pending', priority: 'high' },
      { id: 'usin-10', title: 'Perçage: Multi-points', description: 'Plusieurs perçages sur même pièce', status: 'pending', priority: 'medium' },
      { id: 'usin-11', title: 'Perçage: Patterns prédéfinis', description: 'Grilles de perçage standards (32mm, etc.)', status: 'pending', priority: 'medium' },
      { id: 'usin-12', title: 'Calcul prix usinages', description: 'Tarification par type et complexité', status: 'pending', priority: 'high' },
      { id: 'usin-13', title: 'Visualisation usinages', description: 'Aperçu graphique des usinages sur pièce', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'dxf',
    name: 'DXF & Forme Custom',
    icon: <FileCode size={18} />,
    color: '#0EA5E9',
    todos: [
      { id: 'dxf-1', title: 'Parser DXF', description: 'Bibliothèque dxf-parser intégrée', status: 'completed', priority: 'high' },
      { id: 'dxf-0', title: 'Types FormeCustom', description: 'Interface DXF avec surface, périmètre, boundingBox', status: 'completed', priority: 'high' },
      { id: 'dxf-2', title: 'PopupImportDxf', description: 'Popup pour forme "Autre (DXF)" dans SelecteurForme', status: 'pending', priority: 'critical' },
      { id: 'dxf-3', title: 'Viewer DXF 2D', description: 'Affichage graphique des formes DXF', status: 'pending', priority: 'critical' },
      { id: 'dxf-4', title: 'Stockage DXF (API)', description: 'Sauvegarde des fichiers DXF en base', status: 'pending', priority: 'high' },
      { id: 'dxf-5', title: 'Bouton visualisation DXF', description: 'Icône pour voir le DXF attaché à une pièce', status: 'pending', priority: 'high' },
      { id: 'dxf-6', title: 'Association DXF ↔ Ligne', description: 'Lier un DXF à une ligne du configurateur', status: 'pending', priority: 'high' },
      { id: 'dxf-7', title: 'Extraction dimensions DXF', description: 'Auto-remplir longueur/largeur depuis DXF', status: 'pending', priority: 'medium' },
      { id: 'dxf-8', title: 'Calcul surface forme DXF', description: 'Surface réelle pour formes complexes', status: 'pending', priority: 'medium' },
      { id: 'dxf-9', title: 'Export DXF découpe', description: 'Générer DXF pour machine CNC', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'multicouche',
    name: 'Panneau Multicouche',
    icon: <Layers size={18} />,
    color: '#14B8A6',
    todos: [
      { id: 'multi-1', title: 'UI Popup Multicouche', description: 'Structure 3 étapes refactorisée', status: 'completed', priority: 'critical' },
      { id: 'multi-2', title: 'Étape 1: Mode collage', description: 'Choix fournisseur vs client', status: 'completed', priority: 'high' },
      { id: 'multi-3', title: 'Étape 2: Gestion couches', description: 'Ajout/suppression/réordonnancement couches', status: 'completed', priority: 'critical' },
      { id: 'multi-4', title: 'Drag & Drop couches', description: 'Réorganiser les couches par glisser-déposer', status: 'completed', priority: 'medium' },
      { id: 'multi-5', title: 'Sélection panneau par couche', description: 'Choisir un panneau du catalogue pour chaque couche', status: 'completed', priority: 'high' },
      { id: 'multi-6', title: 'Visualisation coupe panneau', description: 'Vue en coupe du panneau multicouche', status: 'completed', priority: 'medium' },
      { id: 'multi-7', title: 'Calcul épaisseur totale', description: 'Somme des épaisseurs de toutes les couches', status: 'completed', priority: 'high' },
      { id: 'multi-8', title: 'Calcul prix estimé/m²', description: 'Prix total des couches + collage', status: 'completed', priority: 'high' },
      { id: 'multi-9', title: 'Templates multicouche', description: 'Sauvegarde/chargement de configurations', status: 'completed', priority: 'medium' },
      { id: 'multi-10', title: 'API templates utilisateur', description: 'Backend pour sauvegarder les templates', status: 'completed', priority: 'medium' },
      { id: 'multi-11', title: 'Fichiers backup nettoyés', description: 'PopupMulticouche.backup.tsx supprimé', status: 'completed', priority: 'low' },
    ]
  },
  {
    id: 'import-export',
    name: 'Import / Export',
    icon: <FileText size={18} />,
    color: '#10B981',
    todos: [
      { id: 'ie-1', title: 'Import Excel', description: 'Auto-détection format fichier', status: 'completed', priority: 'critical' },
      { id: 'ie-2', title: 'Format Bouney', description: 'Support import format Bouney', status: 'completed', priority: 'high' },
      { id: 'ie-3', title: 'Format IdeaBois', description: 'Support import format IdeaBois', status: 'completed', priority: 'high' },
      { id: 'ie-4', title: 'Format DebitLog', description: 'Support import format DebitLog', status: 'completed', priority: 'high' },
      { id: 'ie-5', title: 'Génération étiquettes PDF', description: 'Export PDF des étiquettes pour découpe', status: 'completed', priority: 'high' },
      { id: 'ie-6', title: 'Export Excel configuration', description: 'Exporter la configuration actuelle', status: 'pending', priority: 'medium' },
    ]
  },
  {
    id: 'optimiseur',
    name: 'Optimiseur Découpe',
    icon: <Zap size={18} />,
    color: '#F59E0B',
    todos: [
      { id: 'opt-1', title: 'UI Popup Optimiseur', description: 'Interface popup pour optimisation', status: 'completed', priority: 'high' },
      { id: 'opt-2', title: 'Algorithme bin-packing', description: 'Optimisation de placement des pièces', status: 'completed', priority: 'critical' },
      { id: 'opt-3', title: 'Visualisation panneaux', description: 'Affichage graphique du placement', status: 'completed', priority: 'high' },
      { id: 'opt-4', title: 'Récap débits', description: 'Récapitulatif des découpes', status: 'completed', priority: 'medium' },
      { id: 'opt-5', title: 'Infos chants depuis catalogue', description: 'TODO: Récupérer les infos chants', status: 'in_progress', priority: 'high' },
      { id: 'opt-6', title: 'Export plan de découpe PDF', description: 'Générer PDF du plan optimisé', status: 'pending', priority: 'medium' },
      { id: 'opt-7', title: 'Prise en compte sens du fil', description: 'Respecter l\'orientation du bois', status: 'pending', priority: 'medium' },
    ]
  },
  {
    id: 'panier',
    name: 'Panier & Commandes',
    icon: <ShoppingCart size={18} />,
    color: '#EF4444',
    todos: [
      { id: 'pan-1', title: 'Modal commande (UI)', description: 'Interface de passage de commande', status: 'completed', priority: 'high' },
      { id: 'pan-2', title: 'Bouton "Ajouter au panier"', description: 'Actuellement: "En cours de développement"', status: 'blocked', priority: 'critical' },
      { id: 'pan-3', title: 'API POST /api/panier', description: 'Backend pour ajouter au panier', status: 'pending', priority: 'critical' },
      { id: 'pan-4', title: 'Panier persistant', description: 'Sauvegarde panier en base de données', status: 'pending', priority: 'critical' },
      { id: 'pan-5', title: 'Page panier', description: 'Visualisation et modification du panier', status: 'pending', priority: 'high' },
      { id: 'pan-6', title: 'API POST /api/commandes', description: 'Backend création de commande', status: 'pending', priority: 'critical' },
      { id: 'pan-7', title: 'Validation commande', description: 'Vérification stock, prix, disponibilité', status: 'pending', priority: 'high' },
      { id: 'pan-8', title: 'Emails de confirmation', description: 'Notification commande créée', status: 'pending', priority: 'medium' },
      { id: 'pan-9', title: 'Intégration Stripe', description: 'Paiement en ligne (si requis)', status: 'pending', priority: 'medium' },
    ]
  },
  {
    id: 'devis',
    name: 'Gestion Devis',
    icon: <FileText size={18} />,
    color: '#3B82F6',
    todos: [
      { id: 'dev-1', title: 'API devis existante', description: 'GET/POST /api/devis fonctionnel', status: 'completed', priority: 'high' },
      { id: 'dev-2', title: 'Page "Mes devis"', description: 'Liste des devis de l\'utilisateur', status: 'pending', priority: 'high' },
      { id: 'dev-3', title: 'Visualisation devis', description: 'Page de détail d\'un devis', status: 'pending', priority: 'high' },
      { id: 'dev-4', title: 'Édition devis existant', description: 'Modifier un devis sauvegardé', status: 'pending', priority: 'high' },
      { id: 'dev-5', title: 'Signature digitale', description: 'Composants SignaturePad prêts', status: 'completed', priority: 'medium' },
      { id: 'dev-6', title: 'Export PDF devis', description: 'Génération PDF formaté', status: 'pending', priority: 'high' },
      { id: 'dev-7', title: 'Partage devis client', description: 'Lien de partage pour clients', status: 'pending', priority: 'medium' },
      { id: 'dev-8', title: 'Historique modifications', description: 'Tracking des changements', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'catalogue',
    name: 'Catalogue Produits',
    icon: <Database size={18} />,
    color: '#06B6D4',
    todos: [
      { id: 'cat-1', title: 'API panneaux catalogue', description: 'CRUD complet fonctionnel', status: 'completed', priority: 'critical' },
      { id: 'cat-2', title: 'Panneaux MDF', description: 'Standard + hydrofuge', status: 'completed', priority: 'high' },
      { id: 'cat-3', title: 'Panneaux aggloméré', description: 'Brut + plaqué', status: 'completed', priority: 'high' },
      { id: 'cat-4', title: 'Contreplaqué', description: 'Différentes essences', status: 'completed', priority: 'high' },
      { id: 'cat-5', title: 'Essences fines', description: 'Aggloméré/contreplaqué/MDF replaqués', status: 'completed', priority: 'medium' },
      { id: 'cat-6', title: 'Stratifiés/mélaminés', description: 'Panneaux décoratifs', status: 'completed', priority: 'high' },
      { id: 'cat-7', title: 'Chants standards', description: 'Catalogue des chants', status: 'completed', priority: 'medium' },
      { id: 'cat-8', title: 'Scraping Dispano Panneaux', description: '1150 panneaux importés depuis Dispano', status: 'completed', priority: 'high' },
      { id: 'cat-9', title: 'Scraping Dispano Bois', description: '1036 panneaux bois importés', status: 'completed', priority: 'high' },
      { id: 'cat-10', title: 'Scraping Dispano Chants', description: 'Import automatique des chants Dispano', status: 'completed', priority: 'medium' },
      { id: 'cat-11', title: 'Popup fiche produit', description: 'Popup avec détails produit via bouton info', status: 'completed', priority: 'high' },
      { id: 'cat-12', title: 'Plans de travail', description: 'Ajout catégorie plans de travail', status: 'pending', priority: 'medium' },
      { id: 'cat-13', title: 'Gestion des prix dynamiques', description: 'Mise à jour automatique des tarifs', status: 'pending', priority: 'medium' },
      { id: 'cat-14', title: 'Refonte filtres UX', description: 'Affiner et réorganiser les filtres pour une meilleure UX', status: 'in_progress', priority: 'high' },
      { id: 'cat-15', title: 'Améliorer mise en page catalogue', description: 'Infos produits tronquées - revoir le layout visuel', status: 'pending', priority: 'high' },
      { id: 'cat-16', title: 'Optimisation code catalogue', description: 'Rendre le code propre, rapide et maintenable', status: 'pending', priority: 'high' },
      { id: 'cat-17', title: 'Pagination/virtualisation', description: '3344+ articles - implémenter scroll virtualisé ou pagination', status: 'pending', priority: 'critical' },
      { id: 'cat-18', title: 'Hooks React Query/SWR', description: 'Cache et gestion état serveur pour performances', status: 'pending', priority: 'high' },
      { id: 'cat-19', title: 'Recherche full-text', description: 'Recherche rapide avec indexation (Algolia, MeiliSearch ou API)', status: 'pending', priority: 'medium' },
    ]
  },
  {
    id: 'auth',
    name: 'Authentification',
    icon: <Shield size={18} />,
    color: '#8B5CF6',
    todos: [
      { id: 'auth-1', title: 'Intégration Clerk', description: 'ClerkProvider configuré', status: 'completed', priority: 'critical' },
      { id: 'auth-2', title: 'Page Sign-in', description: 'Interface connexion stylisée', status: 'completed', priority: 'critical' },
      { id: 'auth-3', title: 'Page Sign-up', description: 'Interface inscription stylisée', status: 'completed', priority: 'critical' },
      { id: 'auth-4', title: 'Sync préférences utilisateur', description: 'Sauvegarde préférences en base', status: 'completed', priority: 'medium' },
      { id: 'auth-5', title: 'Gestion organisations', description: 'Multi-utilisateurs par entreprise', status: 'pending', priority: 'low' },
      { id: 'auth-6', title: 'Rôles et permissions', description: 'Admin, user, viewer', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'i18n',
    name: 'Internationalisation',
    icon: <Globe size={18} />,
    color: '#EC4899',
    todos: [
      { id: 'i18n-1', title: 'Configuration next-intl', description: 'FR/EN avec routing locale', status: 'completed', priority: 'high' },
      { id: 'i18n-2', title: 'Traductions Configurateur', description: 'Messages, validation, toasts', status: 'completed', priority: 'high' },
      { id: 'i18n-3', title: 'Traductions Multicouche', description: 'Popup et composants', status: 'completed', priority: 'medium' },
      { id: 'i18n-4', title: 'Traductions Optimiseur', description: 'Interface optimisation', status: 'completed', priority: 'medium' },
      { id: 'i18n-5', title: 'LocaleSwitcher', description: 'Bouton changement de langue', status: 'completed', priority: 'medium' },
      { id: 'i18n-6', title: 'Support unités (mm/inches)', description: 'Conversion automatique', status: 'completed', priority: 'medium' },
      { id: 'i18n-7', title: 'Traductions emails', description: 'Templates emails multilingues', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'ui',
    name: 'Interface & Design',
    icon: <Palette size={18} />,
    color: '#F472B6',
    todos: [
      { id: 'ui-1', title: 'Design system CutX', description: 'Variables CSS, thème cohérent', status: 'completed', priority: 'high' },
      { id: 'ui-2', title: 'Composants shadcn/ui', description: 'Button, Dialog, Input, etc.', status: 'completed', priority: 'high' },
      { id: 'ui-3', title: 'Dark mode', description: 'Support classes Tailwind dark:', status: 'completed', priority: 'medium' },
      { id: 'ui-4', title: 'Welcome Modal', description: 'Guide de démarrage', status: 'completed', priority: 'low' },
      { id: 'ui-5', title: 'Tooltips/InfoBulles', description: 'Aide contextuelle', status: 'completed', priority: 'low' },
      { id: 'ui-6', title: 'Animations Framer Motion', description: 'Transitions fluides', status: 'completed', priority: 'low' },
      { id: 'ui-7', title: 'Loading states', description: 'Skeletons et spinners', status: 'in_progress', priority: 'medium' },
      { id: 'ui-8', title: 'Toast notifications', description: 'Feedback utilisateur', status: 'completed', priority: 'medium' },
    ]
  },
  {
    id: 'responsive',
    name: 'Responsive / Mobile',
    icon: <Smartphone size={18} />,
    color: '#14B8A6',
    todos: [
      { id: 'resp-1', title: 'ResponsiveConfigurateurV3', description: 'Wrapper responsive desktop/mobile', status: 'completed', priority: 'high' },
      { id: 'resp-2', title: 'MobileConfigurateurV3', description: 'Version mobile du configurateur', status: 'completed', priority: 'high' },
      { id: 'resp-3', title: 'MobileLineCard', description: 'Carte ligne pour mobile', status: 'completed', priority: 'high' },
      { id: 'resp-4', title: 'BottomSheetEditor', description: 'Éditeur en bottom sheet', status: 'completed', priority: 'medium' },
      { id: 'resp-5', title: 'Tests mobile complets', description: 'Vérifier toutes les interactions', status: 'pending', priority: 'high' },
      { id: 'resp-6', title: 'PWA manifest', description: 'Installation comme app', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'integrations',
    name: 'Intégrations Externes',
    icon: <Code2 size={18} />,
    color: '#6366F1',
    todos: [
      { id: 'int-1', title: 'Plugin SketchUp', description: 'Communication via postMessage', status: 'completed', priority: 'high' },
      { id: 'int-2', title: 'Types SketchUpData', description: 'Interface de données SketchUp', status: 'completed', priority: 'medium' },
      { id: 'int-3', title: 'Conversion SketchUp → Lignes', description: 'Transformation des données', status: 'completed', priority: 'high' },
      { id: 'int-4', title: 'Webhooks système', description: 'Notifications événements', status: 'in_progress', priority: 'medium' },
      { id: 'int-5', title: 'API publique documentée', description: 'Documentation OpenAPI/Swagger', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'admin',
    name: 'Administration',
    icon: <Settings size={18} />,
    color: '#78716C',
    todos: [
      { id: 'adm-1', title: 'Panel admin panneaux', description: 'CRUD panneaux avec reorder', status: 'pending', priority: 'high' },
      { id: 'adm-2', title: 'Gestion tarifs', description: 'Modification prix découpe/chants', status: 'pending', priority: 'high' },
      { id: 'adm-3', title: 'Gestion utilisateurs', description: 'Liste et modification users', status: 'pending', priority: 'medium' },
      { id: 'adm-4', title: 'Dashboard statistiques', description: 'Métriques commandes/devis', status: 'pending', priority: 'medium' },
      { id: 'adm-5', title: 'Logs d\'activité', description: 'Historique des actions', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'backend',
    name: 'Backend API',
    icon: <Database size={18} />,
    color: '#A855F7',
    todos: [
      { id: 'back-1', title: 'NestJS API base', description: 'Structure modules/services', status: 'completed', priority: 'critical' },
      { id: 'back-2', title: 'Prisma ORM', description: 'Schéma et migrations', status: 'completed', priority: 'critical' },
      { id: 'back-3', title: 'Endpoints catalogues', description: '/api/catalogues/*', status: 'completed', priority: 'high' },
      { id: 'back-4', title: 'Endpoints devis', description: '/api/devis', status: 'completed', priority: 'high' },
      { id: 'back-5', title: 'Webhooks Clerk', description: 'Sync utilisateurs', status: 'completed', priority: 'high' },
      { id: 'back-6', title: 'Scraper Dispano Panneaux', description: '1150 panneaux importés avec catégorisation', status: 'completed', priority: 'high' },
      { id: 'back-7', title: 'Scraper Dispano Bois', description: '1036 panneaux bois importés', status: 'completed', priority: 'high' },
      { id: 'back-8', title: 'Scraper Dispano Chants', description: 'Import chants automatique', status: 'completed', priority: 'medium' },
      { id: 'back-9', title: 'Module Caissons API', description: 'Endpoints pour configurations caissons', status: 'completed', priority: 'high' },
      { id: 'back-10', title: 'Rate limiting', description: 'Protection API', status: 'pending', priority: 'medium' },
      { id: 'back-11', title: 'Caching Redis', description: 'Performance requêtes', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'testing',
    name: 'Tests & Qualité',
    icon: <TestTube size={18} />,
    color: '#84CC16',
    todos: [
      { id: 'test-1', title: 'Tests unitaires calculs', description: 'Validation formules prix', status: 'pending', priority: 'high' },
      { id: 'test-2', title: 'Tests E2E configurateur', description: 'Parcours utilisateur complet', status: 'pending', priority: 'high' },
      { id: 'test-3', title: 'Tests API endpoints', description: 'Validation responses', status: 'pending', priority: 'medium' },
      { id: 'test-4', title: 'Tests import Excel', description: 'Validation formats', status: 'pending', priority: 'medium' },
      { id: 'test-5', title: 'Audit sécurité', description: 'OWASP, injections, XSS', status: 'pending', priority: 'high' },
      { id: 'test-6', title: 'Tests de charge', description: 'Performance sous load', status: 'pending', priority: 'low' },
    ]
  },
  {
    id: 'bugs',
    name: 'Bugs & Nettoyage',
    icon: <Bug size={18} />,
    color: '#DC2626',
    todos: [
      { id: 'bug-1', title: 'Nettoyer fichiers backup', description: 'PopupMulticouche.backup.tsx supprimé', status: 'completed', priority: 'medium' },
      { id: 'bug-2', title: 'Nettoyage composants orphelins', description: 'Refactorisation et suppression fichiers obsolètes', status: 'completed', priority: 'medium' },
      { id: 'bug-3', title: 'Factorisation CSS', description: 'CSS factorisé dans cutx.css', status: 'completed', priority: 'medium' },
      { id: 'bug-4', title: 'Mock API en prod', description: 'Vérifier NODE_ENV configuration', status: 'pending', priority: 'high' },
      { id: 'bug-5', title: 'Re-renders Context', description: 'Optimiser avec selector hooks (GroupesContext)', status: 'pending', priority: 'medium' },
      { id: 'bug-6', title: 'Auto-save optimisation', description: 'Debounce 500ms peut être amélioré', status: 'pending', priority: 'low' },
      { id: 'bug-7', title: 'Types DraggableAttributes', description: 'Fix types @dnd-kit pour drag & drop', status: 'completed', priority: 'high' },
    ]
  },
];

const STORAGE_KEY = 'cutx-dev-todos';

export default function DevPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with initial todos to get any new items
        const initial = getInitialTodos();
        const merged = initial.map(cat => {
          const savedCat = parsed.find((c: TodoCategory) => c.id === cat.id);
          if (savedCat) {
            return {
              ...cat,
              todos: cat.todos.map(todo => {
                const savedTodo = savedCat.todos.find((t: Todo) => t.id === todo.id);
                return savedTodo ? { ...todo, status: savedTodo.status } : todo;
              })
            };
          }
          return cat;
        });
        setCategories(merged);
        setLastSaved(new Date(parsed._lastSaved || Date.now()));
      } catch {
        setCategories(getInitialTodos());
      }
    } else {
      setCategories(getInitialTodos());
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback(() => {
    const toSave = categories.map(cat => ({
      id: cat.id,
      todos: cat.todos.map(t => ({ id: t.id, status: t.status }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...toSave, _lastSaved: new Date().toISOString() }));
    setLastSaved(new Date());
    setHasChanges(false);
  }, [categories]);

  // Auto-save on changes
  useEffect(() => {
    if (hasChanges && categories.length > 0) {
      const timeout = setTimeout(saveToStorage, 1000);
      return () => clearTimeout(timeout);
    }
  }, [hasChanges, categories, saveToStorage]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleTodoStatus = (categoryId: string, todoId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        todos: cat.todos.map(todo => {
          if (todo.id !== todoId) return todo;
          // Cycle: pending -> in_progress -> completed -> pending
          const nextStatus = todo.status === 'completed' ? 'pending'
            : todo.status === 'in_progress' ? 'completed'
            : todo.status === 'blocked' ? 'pending'
            : 'in_progress';
          return { ...todo, status: nextStatus };
        })
      };
    }));
    setHasChanges(true);
  };

  const resetAllTodos = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les todos ?')) {
      setCategories(getInitialTodos());
      localStorage.removeItem(STORAGE_KEY);
      setHasChanges(false);
    }
  };

  // Stats
  const stats = categories.reduce((acc, cat) => {
    cat.todos.forEach(todo => {
      acc.total++;
      if (todo.status === 'completed') acc.completed++;
      else if (todo.status === 'in_progress') acc.inProgress++;
      else if (todo.status === 'blocked') acc.blocked++;
      else acc.pending++;
    });
    return acc;
  }, { total: 0, completed: 0, inProgress: 0, pending: 0, blocked: 0 });

  const progressPercent = Math.round((stats.completed / stats.total) * 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check size={14} className="text-green-500" />;
      case 'in_progress': return <Clock size={14} className="text-amber-500 animate-pulse" />;
      case 'blocked': return <AlertCircle size={14} className="text-red-500" />;
      default: return <Circle size={14} className="text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                CutX Development Roadmap
              </h1>
              <p className="text-sm text-gray-500">Suivi du développement app.cutx.ai</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Sauvegardé {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={resetAllTodos}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
              title="Réinitialiser"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={saveToStorage}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                hasChanges
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              <Save size={16} />
              {hasChanges ? 'Sauvegarder' : 'Sauvegardé'}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Overview */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Progression Globale</h2>
            <span className="text-3xl font-bold text-amber-500">{progressPercent}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              <div className="text-xs text-gray-500">Terminés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{stats.inProgress}</div>
              <div className="text-xs text-gray-500">En cours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{stats.pending}</div>
              <div className="text-xs text-gray-500">À faire</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.blocked}</div>
              <div className="text-xs text-gray-500">Bloqués</div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-6 pb-12 space-y-4">
        {categories.map(category => {
          const isCollapsed = collapsedCategories.has(category.id);
          const catStats = category.todos.reduce((acc, t) => {
            acc.total++;
            if (t.status === 'completed') acc.completed++;
            return acc;
          }, { total: 0, completed: 0 });
          const catPercent = Math.round((catStats.completed / catStats.total) * 100);

          return (
            <div
              key={category.id}
              className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  {category.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium">{category.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[200px]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${catPercent}%`, backgroundColor: category.color }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {catStats.completed}/{catStats.total}
                    </span>
                  </div>
                </div>
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              </button>

              {/* Todos */}
              {!isCollapsed && (
                <div className="border-t border-white/10">
                  {category.todos.map(todo => (
                    <div
                      key={todo.id}
                      onClick={() => toggleTodoStatus(category.id, todo.id)}
                      className={`flex items-start gap-3 p-4 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors ${
                        todo.status === 'completed' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {getStatusIcon(todo.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                            {todo.title}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityBadge(todo.priority)}`}>
                            {todo.priority}
                          </span>
                        </div>
                        {todo.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{todo.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-sm text-gray-500">
        <p>CutX Platform Development Tracker</p>
        <p className="text-xs mt-1">Cliquez sur un todo pour changer son statut</p>
      </footer>
    </div>
  );
}
