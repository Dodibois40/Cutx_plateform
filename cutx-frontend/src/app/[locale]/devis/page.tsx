import { FileText } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function DevisPage() {
  return (
    <ComingSoonPage
      icon={<FileText size={40} strokeWidth={1.5} />}
      name="Devis"
      description="Créez des devis professionnels en quelques clics et facturez vos clients directement depuis votre espace de travail."
      features={[
        'Génération automatique de devis à partir de vos projets',
        'Modèles personnalisables avec votre logo',
        'Suivi des devis envoyés et acceptés',
        'Conversion devis → facture en un clic',
        'Export PDF professionnel',
        'Historique client complet',
      ]}
      iconBg="rgba(59, 130, 246, 0.12)"
      iconColor="#3b82f6"
    />
  );
}
