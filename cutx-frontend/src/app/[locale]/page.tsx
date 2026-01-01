'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';

export default function HomePage() {
  const t = useTranslations('common');
  const router = useRouter();

  const handleAccessConfigurator = () => {
    router.push('/configurateur');
  };

  return (
    <div className="min-h-screen bg-[#0F0E0D] flex flex-col">
      {/* Header with language switcher */}
      <header className="absolute top-0 right-0 p-4">
        <LocaleSwitcher />
      </header>

      {/* Main content - centered */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl mx-auto">
          {/* Logo / Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
            {t('home.title')}
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-amber-500 font-medium mb-6">
            {t('home.subtitle')}
          </p>

          {/* Description */}
          <p className="text-gray-400 text-lg mb-12 max-w-lg mx-auto">
            {t('home.description')}
          </p>

          {/* CTA Button */}
          <button
            onClick={handleAccessConfigurator}
            className="inline-flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-lg rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
          >
            {t('home.cta')}
            <ArrowRight size={20} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} CutX
        </p>
      </footer>
    </div>
  );
}
