import { Users } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function JobsPage() {
  return (
    <ComingSoonPage
      icon={<Users size={40} strokeWidth={1.5} />}
      name="Jobs"
      description="Trouvez votre prochain collaborateur ou votre prochaine mission. Le job board dédié à l'agencement et la menuiserie."
      features={[
        'Offres d\'emploi spécialisées menuiserie/agencement',
        'Profils vérifiés de candidats qualifiés',
        'Matching intelligent selon les compétences',
        'Missions freelance et CDI',
        'Messagerie directe employeur/candidat',
        'Badges de compétences certifiées',
      ]}
      iconBg="rgba(20, 184, 166, 0.12)"
      iconColor="#14b8a6"
    />
  );
}
