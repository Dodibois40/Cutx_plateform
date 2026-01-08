'use client';

import { useEffect, useRef } from 'react';
import { X, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { AIMessageBubble } from './AIMessageBubble';
import { AIRecapCard } from './AIRecapCard';
import { AIInputBar } from './AIInputBar';
import type { ClaudeRecommendation } from '@/lib/services/ai-assistant-api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AICanvasProps {
  isOpen: boolean;
  messages: Message[];
  isStreaming: boolean;
  recap: ClaudeRecommendation | null;
  error: string | null;
  isGenerating: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
  onValidate: () => void;
  onClearError: () => void;
}

export function AICanvas({
  isOpen,
  messages,
  isStreaming,
  recap,
  error,
  isGenerating,
  onClose,
  onSendMessage,
  onValidate,
  onClearError,
}: AICanvasProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Canvas container */}
      <div className="relative w-full max-w-2xl h-[85vh] mx-4 bg-[var(--cx-surface)] rounded-2xl border border-[var(--cx-border)] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--cx-border)] bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--cx-text)]">
                Assistant Panneau
              </h2>
              <p className="text-xs text-[var(--cx-text-muted)]">
                Propulsé par Claude Sonnet 4.5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--cx-surface-2)] transition-colors text-[var(--cx-text-muted)] hover:text-[var(--cx-text)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Welcome message if no messages */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-[var(--cx-accent)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--cx-text)] mb-2">
                Comment puis-je t'aider ?
              </h3>
              <p className="text-sm text-[var(--cx-text-muted)] max-w-sm">
                Décris ton projet et je te proposerai les panneaux adaptés avec
                un devis automatique.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {[
                  'Meuble salle de bain en chêne',
                  'Bibliothèque salon MDF',
                  'Cuisine mélaminé blanc',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => onSendMessage(suggestion)}
                    className="px-3 py-1.5 text-xs bg-[var(--cx-surface-2)] text-[var(--cx-text-muted)] rounded-full hover:bg-[var(--cx-surface-3)] hover:text-[var(--cx-text)] transition-colors border border-[var(--cx-border)]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <AIMessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              isStreaming={message.isStreaming}
            />
          ))}

          {/* Recap card */}
          {recap?.understood && recap.recommendation && !isStreaming && (
            <div className="mt-4">
              <AIRecapCard
                recap={recap}
                onValidate={onValidate}
                onModify={() => onSendMessage("Je voudrais modifier...")}
                isGenerating={isGenerating}
              />
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={onClearError}
                  className="text-xs text-red-500 hover:underline mt-1"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--cx-border)] bg-[var(--cx-surface)]">
          <AIInputBar
            onSend={onSendMessage}
            isLoading={isStreaming}
            placeholder="Décris ton projet ou pose une question..."
          />
          <p className="text-xs text-[var(--cx-text-muted)] text-center mt-2">
            Claude peut faire des erreurs. Vérifie les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
