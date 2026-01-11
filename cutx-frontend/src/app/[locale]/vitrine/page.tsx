import { Globe } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function VitrinePage() {
  return (
    <ComingSoonPage
      icon={<Globe size={40} strokeWidth={1.5} />}
      name="Vitrine"
      description="Créez votre site web professionnel en quelques minutes. Présentez vos réalisations et attirez de nouveaux clients."
      features={[
        'Templates modernes prêts à l\'emploi',
        'Portfolio de vos réalisations',
        'Formulaire de contact intégré',
        'Optimisation SEO automatique',
        'Nom de domaine personnalisé',
        'Statistiques de visites en temps réel',
      ]}
      iconBg="rgba(249, 115, 22, 0.12)"
      iconColor="#f97316"
    />
  );
}
