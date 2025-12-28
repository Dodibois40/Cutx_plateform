'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, ArrowRight } from 'lucide-react';
import { VIDEOS } from '@/lib/assets';

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY = 'hasSeenWelcomeV2';
const TUTORIAL_VIDEO = VIDEOS.TUTORIAL_CONFIGURATEUR;

interface Props {
  onClose?: () => void;
  forceOpen?: boolean;
  onForceOpenHandled?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function WelcomeModal({ onClose, forceOpen, onForceOpenHandled }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if user has already seen the modal
    const hasSeenWelcome = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenWelcome) {
      // Small delay for smooth appearance
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle forceOpen from parent (Guide button)
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      onForceOpenHandled?.();
    }
  }, [forceOpen, onForceOpenHandled]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    onClose?.();
  };

  // Don't render on server
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8"
          >
            <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 transition-all duration-200"
              >
                <X size={20} />
              </button>

              {/* Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 h-full">

                {/* Left Column - Text Content */}
                <div className="flex flex-col justify-center p-8 md:p-12 order-2 md:order-1">

                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-[#8B9D51]/10 border border-[#8B9D51]/30 rounded-full text-[#a8bf6a] text-sm font-medium w-fit">
                    <span className="w-2 h-2 rounded-full bg-[#8B9D51] animate-pulse" />
                    Nouveau Configurateur
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Bienvenue sur l'Espace
                    <br />
                    <span className="text-[#a8bf6a]">Configuration</span>
                  </h1>

                  {/* Description */}
                  <p className="text-white/60 text-base md:text-lg leading-relaxed mb-6">
                    Ce configurateur a pour but de faciliter la gestion et l'organisation de vos commandes de finition bois.
                  </p>

                  {/* Tip Box */}
                  <div className="flex gap-3 p-4 mb-8 bg-[#8B9D51]/5 border border-[#8B9D51]/20 rounded-xl">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[#8B9D51]/10">
                      <Lightbulb size={20} className="text-[#a8bf6a]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80 mb-1">Astuce</p>
                      <p className="text-sm text-white/50 leading-relaxed">
                        Une question ? Cliquez sur les icônes <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-[10px] text-white/60 mx-0.5">i</span> à côté de chaque option pour voir les détails techniques.
                      </p>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={handleClose}
                    className="group flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#8B9D51] to-[#6d7a3f] hover:from-[#9aad5d] hover:to-[#7d8a4f] text-white font-semibold rounded-xl shadow-lg shadow-[#8B9D51]/20 hover:shadow-[#8B9D51]/30 transition-all duration-300"
                  >
                    Accéder au configurateur
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Right Column - Tutorial Video */}
                <div className="relative bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] order-1 md:order-2 min-h-[250px] md:min-h-0 flex items-center justify-center p-4">
                  {/* Video Container */}
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      src={TUTORIAL_VIDEO}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="max-w-full max-h-[400px] md:max-h-full object-contain rounded-lg shadow-2xl border border-white/5"
                    />
                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 bg-[#8B9D51]/5 rounded-lg blur-2xl -z-10" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

