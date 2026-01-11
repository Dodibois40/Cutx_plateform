import { Recycle } from 'lucide-react';
import { ComingSoonPage } from '@/components/workspace';

export default function ChutesPage() {
  return (
    <ComingSoonPage
      icon={<Recycle size={40} strokeWidth={1.5} />}
      name="Chutes"
      description="La marketplace des chutes de panneaux. Vendez vos surplus, achetez à prix réduit auprès d'autres professionnels."
      features={[
        'Publication de vos chutes en quelques secondes',
        'Recherche par décor, dimensions et localisation',
        'Messagerie intégrée entre vendeurs et acheteurs',
        'Système de notation et avis',
        'Géolocalisation pour trouver les chutes près de vous',
        'Réduction de votre impact environnemental',
      ]}
      iconBg="rgba(34, 197, 94, 0.12)"
      iconColor="#22c55e"
    />
  );
}
