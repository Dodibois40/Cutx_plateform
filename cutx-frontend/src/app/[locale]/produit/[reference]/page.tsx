import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FicheProduit, { type PanelDetails } from '@/components/produit/FicheProduit';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

interface PageProps {
  params: Promise<{
    locale: string;
    reference: string;
  }>;
}

async function getPanel(reference: string): Promise<PanelDetails | null> {
  try {
    const res = await fetch(`${API_URL}/api/catalogues/panels/by-reference/${encodeURIComponent(reference)}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.panel;
  } catch (error) {
    console.error('Error fetching panel:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { reference } = await params;
  const panel = await getPanel(reference);

  if (!panel) {
    return {
      title: 'Produit non trouvé | CutX',
    };
  }

  return {
    title: `${panel.name} | CutX`,
    description: panel.description || `${panel.name} - ${panel.productType} - Réf: ${panel.reference}`,
    openGraph: {
      title: panel.name,
      description: panel.description || `${panel.productType} - ${panel.reference}`,
      images: panel.imageUrl ? [{ url: panel.imageUrl }] : [],
    },
  };
}

export default async function ProduitPage({ params }: PageProps) {
  const { reference } = await params;
  const panel = await getPanel(reference);

  if (!panel) {
    notFound();
  }

  return <FicheProduit panel={panel} />;
}
