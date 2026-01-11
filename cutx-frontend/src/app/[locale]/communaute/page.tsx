import { MessageCircle } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function CommunautePage() {
  return (
    <ComingSoonPage
      icon={<MessageCircle size={40} strokeWidth={1.5} />}
      name="Communauté"
      description="Le réseau social des pros du panneau. Connectez-vous, échangez et collaborez avec d'autres menuisiers et agenceurs."
      features={[
        'Messagerie privée entre pros (demander un conseil, proposer une collab)',
        'Liste d\'amis et réseau de contacts menuisiers',
        'Discussions par thématiques (panneaux, chants, quincaillerie, machines)',
        'Fil d\'actualité : projets, réalisations, astuces de la communauté',
        'Avis et retours d\'expérience sur les fournisseurs',
        'Questions/réponses avec système de votes',
        'Petites annonces machines d\'occasion entre pros',
        'Profils pros avec portfolio de réalisations',
        'Badges et réputation selon votre expertise',
      ]}
      iconBg="rgba(99, 102, 241, 0.12)"
      iconColor="#6366f1"
    />
  );
}
