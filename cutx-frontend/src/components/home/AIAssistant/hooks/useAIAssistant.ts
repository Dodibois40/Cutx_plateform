'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  streamChat,
  generateConfig,
  parseClaudeResponse,
  classifyQuery,
  type Message,
  type ClaudeRecommendation,
} from '@/lib/services/ai-assistant-api';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIState {
  isOpen: boolean;
  messages: AIMessage[];
  isStreaming: boolean;
  recap: ClaudeRecommendation | null;
  error: string | null;
  isGenerating: boolean;
}

const AI_GROUPES_KEY = 'AI_GENERATED_GROUPES';

export function useAIAssistant() {
  const router = useRouter();
  const [state, setState] = useState<AIState>({
    isOpen: false,
    messages: [],
    isStreaming: false,
    recap: null,
    error: null,
    isGenerating: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check if a query should trigger AI mode
   */
  const shouldUseAI = useCallback(async (query: string): Promise<boolean> => {
    try {
      const result = await classifyQuery(query);
      return result.needsAI;
    } catch {
      return false;
    }
  }, []);

  /**
   * Open AI canvas with initial message
   */
  const openWithMessage = useCallback((initialMessage: string) => {
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: initialMessage,
      timestamp: new Date(),
    };

    setState((s) => ({
      ...s,
      isOpen: true,
      messages: [userMessage],
      isStreaming: true,
      error: null,
      recap: null,
    }));

    // Start streaming response
    streamResponse([{ role: 'user', content: initialMessage }]);
  }, []);

  /**
   * Send a new message
   */
  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      const updatedMessages = [...state.messages, userMessage];

      setState((s) => ({
        ...s,
        messages: updatedMessages,
        isStreaming: true,
        error: null,
      }));

      // Convert to API format
      const apiMessages: Message[] = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await streamResponse(apiMessages);
    },
    [state.messages]
  );

  /**
   * Stream response from Claude
   */
  const streamResponse = async (messages: Message[]) => {
    try {
      // Create assistant message placeholder
      const assistantId = crypto.randomUUID();
      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          },
        ],
      }));

      let fullContent = '';

      // Stream the response
      for await (const chunk of streamChat(messages)) {
        fullContent += chunk;

        setState((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, isStreaming: true }
              : m
          ),
        }));
      }

      // Finalize message
      setState((s) => ({
        ...s,
        isStreaming: false,
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        ),
      }));

      // Try to parse recommendation
      const parsed = parseClaudeResponse(fullContent);
      if (parsed?.understood && parsed.recommendation) {
        setState((s) => ({ ...s, recap: parsed }));
      }
    } catch (error) {
      setState((s) => ({
        ...s,
        isStreaming: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erreur de communication avec Claude',
      }));
    }
  };

  /**
   * Validate recommendation and redirect to configurateur
   */
  const validateAndRedirect = useCallback(async () => {
    if (!state.recap?.recommendation) return;

    setState((s) => ({ ...s, isGenerating: true }));

    try {
      const { groupes } = await generateConfig(state.recap.recommendation);

      // Store in session storage
      sessionStorage.setItem(AI_GROUPES_KEY, JSON.stringify(groupes));

      // Redirect to configurateur
      router.push('/configurateur?import=ai');
    } catch (error) {
      setState((s) => ({
        ...s,
        isGenerating: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la génération de la configuration',
      }));
    }
  }, [state.recap, router]);

  /**
   * Open the AI canvas
   */
  const open = useCallback(() => {
    setState((s) => ({ ...s, isOpen: true }));
  }, []);

  /**
   * Close the AI canvas
   */
  const close = useCallback(() => {
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  /**
   * Reset the conversation
   */
  const reset = useCallback(() => {
    setState({
      isOpen: false,
      messages: [],
      isStreaming: false,
      recap: null,
      error: null,
      isGenerating: false,
    });
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    shouldUseAI,
    openWithMessage,
    sendMessage,
    validateAndRedirect,
    open,
    close,
    reset,
    clearError,
  };
}
