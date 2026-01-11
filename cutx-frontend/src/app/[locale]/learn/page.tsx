import { GraduationCap } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function LearnPage() {
  return (
    <ComingSoonPage
      icon={<GraduationCap size={40} strokeWidth={1.5} />}
      name="Learn"
      description="Formations vidéo et tutoriels pour maîtriser l'agencement, la menuiserie et les outils CutX."
      features={[
        'Parcours de formation progressifs',
        'Tutoriels vidéo par des pros du métier',
        'Certification CutX reconnue',
        'Ateliers pratiques en ligne',
        'Communauté d\'entraide entre apprenants',
        'Accès illimité à la bibliothèque de contenus',
      ]}
      iconBg="rgba(236, 72, 153, 0.12)"
      iconColor="#ec4899"
    />
  );
}
