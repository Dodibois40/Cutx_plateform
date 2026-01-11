import { Box } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function SketchUpPage() {
  return (
    <ComingSoonPage
      icon={<Box size={40} strokeWidth={1.5} />}
      name="SketchUp"
      description="Exportez vos projets SketchUp directement vers CutX. Vos composants deviennent des panneaux optimisables en un clic."
      features={[
        'Export direct depuis SketchUp vers CutX',
        'Détection automatique des composants panneaux',
        'Conservation des dimensions et matériaux',
        'Synchronisation bidirectionnelle',
        'Compatible SketchUp 2021, 2022, 2023, 2024',
        'Tutoriels vidéo intégrés',
        'Support des groupes et composants imbriqués',
        'Mapping automatique des décors Egger/Kronospan',
      ]}
      iconBg="rgba(239, 68, 68, 0.12)"
      iconColor="#ef4444"
    />
  );
}
