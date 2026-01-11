import { User } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function ComptePage() {
  return (
    <ComingSoonPage
      icon={<User size={40} strokeWidth={1.5} />}
      name="Compte"
      description="Gérez votre profil, vos abonnements et vos préférences. Centralisez toutes vos informations CutX."
      features={[
        'Gestion de votre profil professionnel',
        'Historique de vos projets et commandes',
        'Paramètres de facturation et abonnement',
        'Préférences de notifications',
        'Connexion multi-appareils',
        'Export de vos données personnelles',
      ]}
      iconBg="rgba(255, 255, 255, 0.08)"
      iconColor="rgba(255, 255, 255, 0.7)"
    />
  );
}
