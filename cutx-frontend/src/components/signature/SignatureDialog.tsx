'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Loader2, PenTool, Shield, CheckCircle } from 'lucide-react';
import SignaturePad from './SignaturePad';

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: (signatureData: string) => Promise<boolean>;
  clientName: string;
  title?: string;
  description?: string;
  totalTTC?: number;
  isModification?: boolean;
}

export default function SignatureDialog({
  open,
  onOpenChange,
  onSign,
  clientName,
  title = "Signer le devis",
  description = "Veuillez valider votre signature pour accepter ce devis",
  totalTTC,
  isModification = false
}: SignatureDialogProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [luApprouve, setLuApprouve] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCgvAccepted(false);
      setLuApprouve(false);
    }
  }, [open]);

  const canSign = signatureData && cgvAccepted && luApprouve;

  const handleSign = async () => {
    if (!signatureData || !canSign) return;

    setIsSigning(true);
    try {
      const success = await onSign(signatureData);
      if (success) {
        setSignatureData(null);
        setCgvAccepted(false);
        setLuApprouve(false);
        onOpenChange(false);
      }
    } finally {
      setIsSigning(false);
    }
  };

  const handleClose = () => {
    if (!isSigning) {
      setSignatureData(null);
      setCgvAccepted(false);
      setLuApprouve(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <PenTool className="h-5 w-5 text-[#8B9A4B]" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-[#A5A49F]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Alerte si modification */}
          {isModification && (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertDescription className="text-amber-200 text-sm">
                <strong className="text-amber-300">Attention :</strong> Le devis a été modifié.
                Une nouvelle validation est requise.
              </AlertDescription>
            </Alert>
          )}

          {/* Montant si fourni */}
          {totalTTC && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-[#A5A49F] text-sm mb-1">Montant total TTC</p>
              <p className="text-2xl font-bold text-[#8B9A4B]">{totalTTC.toFixed(2)} €</p>
            </div>
          )}

          {/* Signature générée automatiquement */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Votre signature
            </label>
            <SignaturePad
              clientName={clientName}
              onSignatureChange={setSignatureData}
              disabled={isSigning}
            />
            <p className="text-xs text-[#7A8B9A] mt-2">
              Cliquez sur "Changer le style" pour voir différentes signatures
            </p>
          </div>

          {/* Checkboxes légales */}
          <div className="space-y-4 pt-2">
            {/* CGV */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="cgv"
                checked={cgvAccepted}
                onCheckedChange={(checked: boolean | 'indeterminate') => setCgvAccepted(checked === true)}
                disabled={isSigning}
                className="mt-1 border-zinc-600 data-[state=checked]:bg-[#8B9A4B] data-[state=checked]:border-[#8B9A4B]"
              />
              <label htmlFor="cgv" className="text-sm text-[#A5A49F] cursor-pointer">
                J'ai lu et j'accepte les{' '}
                <a
                  href="/cgv"
                  target="_blank"
                  className="text-[#8B9A4B] hover:underline"
                >
                  Conditions Générales de Vente
                </a>
              </label>
            </div>

            {/* Lu et approuvé */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="lu-approuve"
                checked={luApprouve}
                onCheckedChange={(checked: boolean | 'indeterminate') => setLuApprouve(checked === true)}
                disabled={isSigning}
                className="mt-1 border-zinc-600 data-[state=checked]:bg-[#8B9A4B] data-[state=checked]:border-[#8B9A4B]"
              />
              <label htmlFor="lu-approuve" className="text-sm text-[#A5A49F] cursor-pointer">
                <strong className="text-white">Lu et approuvé - Bon pour accord</strong>
                <br />
                Je reconnais avoir pris connaissance des prestations et accepte le devis.
              </label>
            </div>
          </div>

          {/* Informations légales */}
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-[#8B9A4B] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#7A8B9A]">
                Cette signature électronique a valeur légale (règlement eIDAS UE 910/2014).
                Date, heure et adresse IP seront enregistrées.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSigning}
            className="border-zinc-700 bg-zinc-800 text-[#A5A49F] hover:bg-zinc-700 hover:text-white"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSign}
            disabled={!canSign || isSigning}
            className="bg-[#8B9A4B] hover:bg-[#7A8B3A] text-white disabled:opacity-50"
          >
            {isSigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accepter et signer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
