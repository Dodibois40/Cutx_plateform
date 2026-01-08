'use client';

import { AICanvas } from './AICanvas';
import { useAIAssistant } from './hooks/useAIAssistant';

export { useAIAssistant } from './hooks/useAIAssistant';
export { useIntegratedAI } from './hooks/useIntegratedAI';

interface AIAssistantProps {
  initialMessage?: string;
}

export function AIAssistant({ initialMessage }: AIAssistantProps) {
  const {
    isOpen,
    messages,
    isStreaming,
    recap,
    error,
    isGenerating,
    openWithMessage,
    sendMessage,
    validateAndRedirect,
    close,
    clearError,
  } = useAIAssistant();

  // Open with initial message if provided
  if (initialMessage && !isOpen) {
    openWithMessage(initialMessage);
  }

  return (
    <AICanvas
      isOpen={isOpen}
      messages={messages}
      isStreaming={isStreaming}
      recap={recap}
      error={error}
      isGenerating={isGenerating}
      onClose={close}
      onSendMessage={sendMessage}
      onValidate={validateAndRedirect}
      onClearError={clearError}
    />
  );
}

// Re-export components for direct use
export { AICanvas } from './AICanvas';
export { AIMessageBubble } from './AIMessageBubble';
export { AIRecapCard } from './AIRecapCard';
export { AIInputBar } from './AIInputBar';
