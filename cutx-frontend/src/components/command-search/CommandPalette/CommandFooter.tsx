'use client';

import { Sparkles } from 'lucide-react';

export function CommandFooter() {
  return (
    <div className="cutx-command-footer">
      <div className="cutx-command-footer-hints">
        <span className="cutx-command-footer-hint">
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <span>naviguer</span>
        </span>
        <span className="cutx-command-footer-hint">
          <kbd>↵</kbd>
          <span>sélectionner</span>
        </span>
        <span className="cutx-command-footer-hint">
          <kbd>esc</kbd>
          <span>fermer</span>
        </span>
      </div>
      <div className="cutx-command-footer-logo">
        <Sparkles />
        <span>CutX Search</span>
      </div>
    </div>
  );
}
