'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ComingSoonPageProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  features: string[];
  iconBg: string;
  iconColor: string;
}

export function ComingSoonPage({
  icon,
  name,
  description,
  features,
  iconBg,
  iconColor,
}: ComingSoonPageProps) {
  return (
    <div className="fixed inset-0 bg-[var(--cx-background)] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/60 hover:text-white/90 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Retour</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg text-center">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            {icon}
          </div>

          {/* Name & Badge */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-white">CutX {name}</h1>
            <span className="px-3 py-1 text-xs font-medium bg-amber-500/15 text-amber-500 rounded-full">
              Prochainement
            </span>
          </div>

          {/* Description */}
          <p className="text-lg text-white/60 mb-8">{description}</p>

          {/* Features */}
          <div className="bg-[#1F1F1E] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
            <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
              Fonctionnalités prévues
            </h3>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-white/70 text-sm"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: iconColor }}
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <p className="mt-8 text-sm text-white/40">
            Vous souhaitez être informé du lancement ?{' '}
            <a
              href="mailto:contact@cutx.fr?subject=Notification lancement CutX"
              className="text-amber-500 hover:text-amber-400 transition-colors"
            >
              Contactez-nous
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-[rgba(255,255,255,0.06)]">
        <p className="text-center text-xs text-white/30">
          CutX Workspace — L&apos;écosystème menuisier
        </p>
      </footer>
    </div>
  );
}
