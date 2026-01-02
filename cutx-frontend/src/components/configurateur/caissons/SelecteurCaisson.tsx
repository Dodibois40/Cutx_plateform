'use client';

// components/configurateur/caissons/SelecteurCaisson.tsx
// Bouton et menu pour selectionner un template de caisson

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Box, Plus, ArrowRight } from 'lucide-react';
import { TEMPLATES_CAISSONS } from '@/lib/caissons/templates';
import type { TemplateCaisson } from '@/lib/caissons/types';

interface SelecteurCaissonProps {
  onSelect: (templateId: string) => void;
  className?: string;
}

export default function SelecteurCaisson({ onSelect, className = '' }: SelecteurCaissonProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (templateId: string) => {
    setOpen(false);
    onSelect(templateId);
  };

  // Icones par type
  const getIcon = (type: string) => {
    switch (type) {
      case 'bas_cuisine':
        return '🗄️';
      case 'haut_cuisine':
        return '📦';
      case 'colonne':
        return '🗃️';
      case 'tiroir':
        return '🗂️';
      default:
        return '⚙️';
    }
  };

  return (
    <>
      {/* Bouton declencheur */}
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className={`gap-2 ${className}`}
      >
        <Box className="w-4 h-4" />
        Configurer un caisson
      </Button>

      {/* Dialog de selection */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              Selectionner un type de caisson
            </DialogTitle>
            <DialogDescription>
              Choisissez un template pour demarrer la configuration
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {TEMPLATES_CAISSONS.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                icon={getIcon(template.typeCaisson)}
                onSelect={() => handleSelect(template.id)}
              />
            ))}
          </div>

          {/* Option rapide */}
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => handleSelect('custom')}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Configuration libre sans template
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Carte de template
interface TemplateCardProps {
  template: TemplateCaisson;
  icon: string;
  onSelect: () => void;
}

function TemplateCard({ template, icon, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className="
        p-4 rounded-lg border-2 border-gray-200 text-left
        hover:border-blue-500 hover:bg-blue-50 transition-all
        group
      "
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold group-hover:text-blue-700">
            {template.nom}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {template.description}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span>H: {template.hauteurDefaut}mm</span>
            <span>L: {template.largeurDefaut}mm</span>
            <span>P: {template.profondeurDefaut}mm</span>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </button>
  );
}
