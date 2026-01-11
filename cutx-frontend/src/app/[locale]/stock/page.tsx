import { Package } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function StockPage() {
  return (
    <ComingSoonPage
      icon={<Package size={40} strokeWidth={1.5} />}
      name="Stock"
      description="Gérez votre inventaire de panneaux, chants et quincaillerie. Suivez vos entrées, sorties et seuils d'alerte."
      features={[
        'Vue temps réel de votre stock',
        'Alertes automatiques de réapprovisionnement',
        'Historique des mouvements de stock',
        'Scan code-barres pour entrées/sorties rapides',
        'Valorisation du stock en temps réel',
        'Intégration avec vos projets CutX',
        'Affectation des chutes de débit vers CutX Chutes en un clic',
        'Recherche par référence pour retrouver vos chutes disponibles',
      ]}
      iconBg="rgba(168, 85, 247, 0.12)"
      iconColor="#a855f7"
    />
  );
}
