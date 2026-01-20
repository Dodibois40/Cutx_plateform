'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from '@/i18n/routing';
import { LogOut, Settings, User } from 'lucide-react';

export function UserAccountMenu() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Always render same wrapper structure to prevent hydration mismatch
  // The outer div with relative positioning is always present

  // Loading state - show skeleton
  if (!mounted || !isLoaded) {
    return (
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.1)] animate-pulse" />
      </div>
    );
  }

  // Not signed in - show sign in button
  if (!isSignedIn) {
    return (
      <div className="relative">
        <button
          onClick={() => router.push('/sign-in')}
          className="
            flex items-center gap-2
            px-4 py-2
            bg-amber-500 hover:bg-amber-400
            text-black font-medium text-sm
            rounded-full
            transition-colors duration-200
          "
        >
          Se connecter
        </button>
      </div>
    );
  }

  // Get user info
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Utilisateur';
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const imageUrl = user?.imageUrl;

  // Generate initials for avatar fallback
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName
      ? firstName[0].toUpperCase()
      : email
        ? email[0].toUpperCase()
        : 'U';

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    router.push('/');
  };

  const handleManageAccount = () => {
    setIsOpen(false);
    router.push('/compte');
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          group
          w-9 h-9
          rounded-full
          overflow-hidden
          border-2 border-transparent
          hover:border-amber-500/50
          focus:border-amber-500
          focus:outline-none
          transition-all duration-200
        "
        title={fullName}
        aria-label="Menu du compte"
        aria-expanded={isOpen}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={fullName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="
              w-full h-full
              bg-gradient-to-br from-amber-500 to-amber-600
              flex items-center justify-center
              text-black text-sm font-bold
            "
          >
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-3
            w-[300px]
            bg-[#1F1F1E]
            border border-[rgba(255,255,255,0.1)]
            rounded-2xl
            shadow-[0_8px_40px_rgba(0,0,0,0.5)]
            overflow-hidden
            z-50
          "
        >
          {/* User info header */}
          <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-4">
              {/* Large avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="
                      w-full h-full
                      bg-gradient-to-br from-amber-500 to-amber-600
                      flex items-center justify-center
                      text-black text-xl font-bold
                    "
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Name and email */}
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-semibold text-white truncate">
                  {fullName}
                </h3>
                <p className="text-[13px] text-[rgba(255,255,255,0.5)] truncate">
                  {email}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            {/* Manage account */}
            <button
              onClick={handleManageAccount}
              className="
                w-full
                flex items-center gap-3
                px-4 py-3
                rounded-xl
                text-left
                hover:bg-[rgba(255,255,255,0.06)]
                transition-colors duration-150
              "
            >
              <div
                className="
                  w-9 h-9 rounded-lg
                  bg-[rgba(255,255,255,0.08)]
                  flex items-center justify-center
                  text-[rgba(255,255,255,0.7)]
                "
              >
                <Settings size={18} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-white">
                  Gérer mon compte
                </div>
                <div className="text-[11px] text-[rgba(255,255,255,0.4)]">
                  Profil, préférences, abonnement
                </div>
              </div>
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="
                w-full
                flex items-center gap-3
                px-4 py-3
                rounded-xl
                text-left
                hover:bg-[rgba(255,255,255,0.06)]
                transition-colors duration-150
              "
            >
              <div
                className="
                  w-9 h-9 rounded-lg
                  bg-[rgba(239,68,68,0.12)]
                  flex items-center justify-center
                  text-red-400
                "
              >
                <LogOut size={18} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-[13px] font-medium text-white">
                  Déconnexion
                </div>
                <div className="text-[11px] text-[rgba(255,255,255,0.4)]">
                  Se déconnecter de CutX
                </div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.15)]">
            <p className="text-[11px] text-center text-[rgba(255,255,255,0.3)]">
              CutX Workspace
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
