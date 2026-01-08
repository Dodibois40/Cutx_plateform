'use client';

import { useEffect, useState } from 'react';
import { User, Bot } from 'lucide-react';

interface AIMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function AIMessageBubble({ role, content, isStreaming }: AIMessageBubbleProps) {
  const [displayContent, setDisplayContent] = useState('');

  // Typewriter effect for assistant messages
  useEffect(() => {
    if (role === 'user') {
      setDisplayContent(content);
      return;
    }

    // For assistant, show content progressively if streaming
    if (isStreaming) {
      setDisplayContent(content);
    } else {
      setDisplayContent(content);
    }
  }, [content, role, isStreaming]);

  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-[var(--cx-accent)] text-black'
            : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-[var(--cx-accent)] text-black rounded-tr-sm'
            : 'bg-[var(--cx-surface-2)] text-[var(--cx-text)] rounded-tl-sm'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {displayContent}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
