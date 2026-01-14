'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Download, RefreshCw, Palette, Type, Circle } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export default function LogoMakerPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [style, setStyle] = useState<'modern' | 'classic' | 'minimal' | 'playful'>('modern');
  const [color, setColor] = useState('#f59e0b');
  const [generating, setGenerating] = useState(false);
  const [logoGenerated, setLogoGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!companyName) return;

    setGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLogoGenerated(true);
    setGenerating(false);
  }, [companyName]);

  const handleDownload = useCallback(() => {
    // Convert SVG to downloadable image
    const svgElement = document.getElementById('logo-preview');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${companyName.replace(/\s+/g, '-').toLowerCase()}-logo.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [companyName]);

  return (
    <div className="min-h-screen bg-[var(--cx-background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--cx-border)] bg-[var(--cx-surface-1)]/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity"
          >
            <span className="text-white">Cut</span>
            <span className="text-amber-500">X</span>
          </button>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h1 className="text-xl font-bold text-white">Logo Maker</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left panel - Configuration */}
          <div className="space-y-6">
            <div className="bg-[var(--cx-surface-1)] rounded-2xl border border-[var(--cx-border)] p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Type className="w-5 h-5" />
                Configuration du logo
              </h2>

              <div className="space-y-4">
                {/* Company name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Ma Menuiserie"
                    className="w-full px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white placeholder:text-[var(--cx-text-muted)] focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                    Secteur d'activité
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Ex: Menuiserie, Ébénisterie..."
                    className="w-full px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white placeholder:text-[var(--cx-text-muted)] focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                    Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['modern', 'classic', 'minimal', 'playful'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          style === s
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                            : 'bg-[var(--cx-background)] border-[var(--cx-border)] text-[var(--cx-text-muted)] hover:border-purple-500/50'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-[var(--cx-text)] mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Couleur principale
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-16 h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!companyName || generating}
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Générer avec l'IA
                  </>
                )}
              </Button>
            </div>

            {/* Tips */}
            <div className="bg-amber-500/10 rounded-2xl border border-amber-500/30 p-6">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">💡 Conseils</h3>
              <ul className="text-sm text-[var(--cx-text-muted)] space-y-1">
                <li>• Choisissez un nom court et mémorable</li>
                <li>• Le style moderne convient à la plupart des entreprises</li>
                <li>• Les couleurs vives attirent l'attention</li>
                <li>• Vous pouvez régénérer autant de fois que souhaité</li>
              </ul>
            </div>
          </div>

          {/* Right panel - Preview */}
          <div className="space-y-6">
            <div className="bg-[var(--cx-surface-1)] rounded-2xl border border-[var(--cx-border)] p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Circle className="w-5 h-5" />
                Aperçu du logo
              </h2>

              {/* Preview area */}
              <div className="aspect-square bg-[var(--cx-background)] rounded-xl border border-[var(--cx-border)] flex items-center justify-center relative overflow-hidden">
                {logoGenerated ? (
                  <svg
                    id="logo-preview"
                    viewBox="0 0 400 400"
                    className="w-full h-full p-8"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Background */}
                    <rect width="400" height="400" fill="transparent" />

                    {/* Logo shape based on style */}
                    {style === 'modern' && (
                      <>
                        <circle cx="200" cy="150" r="80" fill={color} opacity="0.2" />
                        <rect x="140" y="120" width="120" height="60" rx="30" fill={color} />
                      </>
                    )}
                    {style === 'classic' && (
                      <>
                        <circle cx="200" cy="150" r="70" fill="none" stroke={color} strokeWidth="4" />
                        <text x="200" y="165" textAnchor="middle" fontSize="48" fontWeight="bold" fill={color}>
                          {companyName.charAt(0).toUpperCase()}
                        </text>
                      </>
                    )}
                    {style === 'minimal' && (
                      <line x1="140" y1="150" x2="260" y2="150" stroke={color} strokeWidth="8" strokeLinecap="round" />
                    )}
                    {style === 'playful' && (
                      <>
                        <circle cx="180" cy="140" r="40" fill={color} />
                        <circle cx="220" cy="140" r="40" fill={color} opacity="0.7" />
                        <circle cx="200" cy="170" r="40" fill={color} opacity="0.4" />
                      </>
                    )}

                    {/* Company name */}
                    <text
                      x="200"
                      y="280"
                      textAnchor="middle"
                      fontSize="32"
                      fontWeight="bold"
                      fill="white"
                    >
                      {companyName}
                    </text>

                    {/* Industry subtitle */}
                    {industry && (
                      <text
                        x="200"
                        y="310"
                        textAnchor="middle"
                        fontSize="16"
                        fill="rgba(255,255,255,0.5)"
                      >
                        {industry}
                      </text>
                    )}
                  </svg>
                ) : (
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-[var(--cx-text-muted)] mx-auto mb-4 opacity-50" />
                    <p className="text-[var(--cx-text-muted)]">
                      Configurez votre logo et cliquez sur "Générer"
                    </p>
                  </div>
                )}
              </div>

              {/* Download button */}
              {logoGenerated && (
                <Button
                  onClick={handleDownload}
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Télécharger le logo
                </Button>
              )}
            </div>

            {/* Variants preview */}
            {logoGenerated && (
              <div className="bg-[var(--cx-surface-1)] rounded-2xl border border-[var(--cx-border)] p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Variantes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Fond blanc', 'Fond noir', 'Couleur inversée', 'Monochrome'].map((variant, idx) => (
                    <div
                      key={idx}
                      className="aspect-video rounded-lg border border-[var(--cx-border)] bg-[var(--cx-background)] flex items-center justify-center text-xs text-[var(--cx-text-muted)]"
                    >
                      {variant}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
