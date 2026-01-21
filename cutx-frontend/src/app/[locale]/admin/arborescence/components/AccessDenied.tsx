'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export function AccessDenied() {
  return (
    <div className="error-page">
      <div className="error-icon">
        <AlertTriangle size={40} />
      </div>
      <h1>Accès restreint</h1>
      <p>Cette page est réservée aux administrateurs</p>
      <Link href="/" className="back-link">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
