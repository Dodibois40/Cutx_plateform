'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  FileText,
  Recycle,
  Package,
  GraduationCap,
  Users,
  Globe,
  User,
  MessageCircle,
  Box,
} from 'lucide-react';

interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  href?: string;
  available: boolean;
}

interface AppCategory {
  id: string;
  label: string;
  apps: AppItem[];
}

export function CutXAppsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true); // Always show for now
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const categories: AppCategory[] = [
    {
      id: 'outils',
      label: 'OUTILS',
      apps: [
        {
          id: 'core',
          name: 'Configurateur',
          description: 'Découpe & optimisation',
          icon: <Scissors size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(245, 158, 11, 0.15)',
          iconColor: '#f59e0b',
          href: '/configurateur',
          available: true,
        },
        {
          id: 'sketchup',
          name: 'SketchUp',
          description: 'Plugin export',
          icon: <Box size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(239, 68, 68, 0.12)',
          iconColor: '#ef4444',
          href: '/sketchup',
          available: true,
        },
      ],
    },
    {
      id: 'business',
      label: 'BUSINESS',
      apps: [
        {
          id: 'devis',
          name: 'Devis',
          description: 'Facturation',
          icon: <FileText size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(59, 130, 246, 0.12)',
          iconColor: '#3b82f6',
          href: '/devis',
          available: true,
        },
        {
          id: 'stock',
          name: 'Stock',
          description: 'Inventaire',
          icon: <Package size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(168, 85, 247, 0.12)',
          iconColor: '#a855f7',
          href: '/stock',
          available: true,
        },
        {
          id: 'chutes',
          name: 'Chutes',
          description: 'Marketplace',
          icon: <Recycle size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(34, 197, 94, 0.12)',
          iconColor: '#22c55e',
          href: '/chutes',
          available: true,
        },
      ],
    },
    {
      id: 'reseau',
      label: 'RÉSEAU',
      apps: [
        {
          id: 'communaute',
          name: 'Communauté',
          description: 'Réseau social',
          icon: <MessageCircle size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(99, 102, 241, 0.12)',
          iconColor: '#6366f1',
          href: '/communaute',
          available: true,
        },
        {
          id: 'jobs',
          name: 'Jobs',
          description: 'Recrutement',
          icon: <Users size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(20, 184, 166, 0.12)',
          iconColor: '#14b8a6',
          href: '/jobs',
          available: true,
        },
        {
          id: 'learn',
          name: 'Learn',
          description: 'Formations',
          icon: <GraduationCap size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(236, 72, 153, 0.12)',
          iconColor: '#ec4899',
          href: '/learn',
          available: true,
        },
      ],
    },
    {
      id: 'profil',
      label: 'PROFIL',
      apps: [
        {
          id: 'vitrine',
          name: 'Vitrine',
          description: 'Site web',
          icon: <Globe size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(249, 115, 22, 0.12)',
          iconColor: '#f97316',
          href: '/vitrine',
          available: true,
        },
        {
          id: 'compte',
          name: 'Compte',
          description: 'Mon profil',
          icon: <User size={24} strokeWidth={1.8} />,
          iconBg: 'rgba(255, 255, 255, 0.08)',
          iconColor: 'rgba(255, 255, 255, 0.7)',
          href: '/compte',
          available: true,
        },
      ],
    },
  ];

  const handleAppClick = (app: AppItem) => {
    if (app.available && app.href) {
      window.location.href = app.href;
      setIsOpen(false);
    }
  };

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
    // Hide teaser when menu is opened
    if (showTeaser) {
      setShowTeaser(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Teaser bubble - first time only */}
      {showTeaser && (
        <div
          className="
            absolute left-full top-1/2 -translate-y-1/2 ml-4
            animate-[fadeInSlide_0.4s_ease-out]
            cursor-pointer
            flex items-center gap-2
          "
          onClick={handleMenuClick}
        >
          {/* Arrow pointing left towards button */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="18"
            width="18"
            viewBox="0 0 18 18"
            className="text-amber-500 animate-[arrowBounce_2s_ease-in-out_infinite] rotate-180"
          >
            <path
              opacity="0.4"
              d="M15 9.75H2.75C2.336 9.75 2 9.414 2 9C2 8.586 2.336 8.25 2.75 8.25H15C15.414 8.25 15.75 8.586 15.75 9C15.75 9.414 15.414 9.75 15 9.75Z"
              fill="currentColor"
            />
            <path
              d="M11 14C10.808 14 10.616 13.927 10.47 13.78C10.177 13.487 10.177 13.012 10.47 12.719L14.19 8.99899L10.47 5.279C10.177 4.986 10.177 4.511 10.47 4.218C10.763 3.925 11.238 3.925 11.531 4.218L15.781 8.468C16.074 8.761 16.074 9.236 15.781 9.529L11.531 13.779C11.385 13.925 11.193 13.999 11.001 13.999L11 14Z"
              fill="currentColor"
            />
          </svg>

          {/* Bubble */}
          <div
            className="
              px-4 py-2
              bg-[#2A2A29]
              border border-[rgba(255,255,255,0.08)]
              rounded-lg
              whitespace-nowrap
              hover:border-[rgba(255,255,255,0.12)]
              transition-colors duration-200
            "
          >
            <span className="text-[13px] font-medium text-white/80">
              Découvrir CutX Workspace
            </span>
          </div>
        </div>
      )}

      {/* Grid button - 9 points */}
      <button
        onClick={handleMenuClick}
        className="
          group
          p-3
          flex items-center justify-center
          transition-all duration-200
        "
        title="Applications CutX"
        aria-label="Menu des applications"
        aria-expanded={isOpen}
      >
        {/* Grille de 9 points */}
        <div className="grid grid-cols-3 gap-[5px]">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="
                w-[5px] h-[5px] rounded-full
                bg-white/50
                group-hover:bg-white/70
                transition-all duration-200
                animate-[dotPulse_4s_ease-in-out_infinite]
              "
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-3
            w-[340px]
            bg-[#1F1F1E]
            border border-[rgba(255,255,255,0.1)]
            rounded-2xl
            shadow-[0_8px_40px_rgba(0,0,0,0.5)]
            overflow-hidden
            z-50
          "
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10 h-10 rounded-xl
                  bg-gradient-to-br from-amber-500 to-amber-600
                  flex items-center justify-center
                  shadow-[0_2px_8px_rgba(245,158,11,0.3)]
                "
              >
                <span className="text-black text-lg font-black">C</span>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">
                  CutX Workspace
                </h3>
                <p className="text-[12px] text-[rgba(255,255,255,0.45)]">
                  L&apos;écosystème menuisier
                </p>
              </div>
            </div>
          </div>

          {/* Apps by category */}
          <div className="p-3 space-y-3">
            {categories.map((category) => (
              <div key={category.id}>
                {/* Category header */}
                <div className="px-2 py-1.5 mb-1">
                  <span className="text-[10px] font-semibold tracking-wider text-[rgba(255,255,255,0.35)]">
                    {category.label}
                  </span>
                </div>

                {/* Category apps */}
                <div className="flex flex-wrap gap-1">
                  {category.apps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleAppClick(app)}
                      disabled={!app.available}
                      className={`
                        flex items-center gap-2.5
                        px-3 py-2
                        rounded-lg
                        text-left
                        transition-all duration-150
                        ${app.available
                          ? 'hover:bg-[rgba(255,255,255,0.06)] cursor-pointer'
                          : 'opacity-60 cursor-default hover:opacity-70'
                        }
                      `}
                    >
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: app.iconBg,
                          color: app.iconColor,
                        }}
                      >
                        {app.icon}
                      </div>

                      {/* Text */}
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium text-white">
                          {app.name}
                        </div>
                        <div className="text-[10px] text-[rgba(255,255,255,0.4)]">
                          {app.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)]">
            <p className="text-[11px] text-center text-[rgba(255,255,255,0.3)]">
              Plus de fonctionnalités bientôt disponibles
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
