'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import {
  classifyQuery,
  streamChat,
  generateConfig,
  parseClaudeResponse,
  type ClaudeRecommendation,
  type Message,
} from '@/lib/services/ai-assistant-api';

const AI_GROUPES_KEY = 'AI_GENERATED_GROUPES';

interface UseIntegratedAIResult {
  // State
  isActive: boolean;
  response: string;
  messages: Message[];
  isStreaming: boolean;
  recap: ClaudeRecommendation | null;
  error: string | null;
  isGenerating: boolean;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  validateAndRedirect: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for integrated AI in search - automatically detects if query needs AI
 * and handles the conversation inline
 */
export function useIntegratedAI(query: string): UseIntegratedAIResult {
  const router = useRouter();

  // State
  const [isActive, setIsActive] = useState(false);
  const [response, setResponse] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [recap, setRecap] = useState<ClaudeRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Track last processed query to avoid re-processing
  const lastProcessedQuery = useRef<string>('');
  const isProcessingRef = useRef(false);

  // Process query with AI using async generator
  const processWithAI = useCallback(async (userMessage: string, currentMessages: Message[]) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const newMessages: Message[] = [
      ...currentMessages,
      { role: 'user' as const, content: userMessage },
    ];
    setMessages(newMessages);
    setIsStreaming(true);
    setResponse('');
    setRecap(null);
    setError(null);

    try {
      let fullResponse = '';

      // Use async generator
      for await (const chunk of streamChat(newMessages)) {
        fullResponse += chunk;
        setResponse(fullResponse);
      }

      // Stream complete
      setMessages(prev => [
        ...prev,
        { role: 'assistant' as const, content: fullResponse },
      ]);
      setIsStreaming(false);

      // Try to parse recommendation from response
      const parsed = parseClaudeResponse(fullResponse);
      if (parsed) {
        setRecap(parsed);
      }
    } catch (err) {
      console.error('AI stream error:', err);
      setError('Erreur de communication. Essayez la recherche classique.');
      setIsStreaming(false);
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  // Detect if query needs AI and trigger automatically
  useEffect(() => {
    const checkAndProcess = async () => {
      // Don't reprocess same query
      if (query === lastProcessedQuery.current) return;
      if (isProcessingRef.current) return;

      // Short queries go to regular search
      if (query.length < 20) {
        if (isActive) {
          setIsActive(false);
          setResponse('');
          setMessages([]);
          setRecap(null);
        }
        return;
      }

      try {
        const result = await classifyQuery(query);

        if (result.needsAI && result.confidence > 0.6) {
          lastProcessedQuery.current = query;
          setIsActive(true);
          setError(null);

          // Start AI conversation with the query
          await processWithAI(query, []);
        } else {
          setIsActive(false);
        }
      } catch (err) {
        console.error('AI classification error:', err);
        setIsActive(false);
      }
    };

    // Debounce to avoid too many API calls
    const timeoutId = setTimeout(checkAndProcess, 500);
    return () => clearTimeout(timeoutId);
  }, [query, isActive, processWithAI]);

  // Send follow-up message
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isStreaming) return;
    await processWithAI(message, messages);
  }, [isStreaming, messages, processWithAI]);

  // Validate and redirect to configurateur
  const validateAndRedirect = useCallback(async () => {
    if (!recap || !recap.recommendation) {
      setError('Pas de recommandation à valider');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateConfig(recap.recommendation);

      if (result.groupes && result.groupes.length > 0) {
        // Store in sessionStorage and redirect
        sessionStorage.setItem(AI_GROUPES_KEY, JSON.stringify(result.groupes));
        router.push('/configurateur?import=ai');
      } else {
        setError('Aucun groupe généré. Essayez avec plus de détails.');
      }
    } catch (err) {
      console.error('Generate config error:', err);
      setError('Erreur lors de la génération. Réessayez.');
    } finally {
      setIsGenerating(false);
    }
  }, [recap, router]);

  // Reset state
  const reset = useCallback(() => {
    setIsActive(false);
    setResponse('');
    setMessages([]);
    setRecap(null);
    setError(null);
    setIsStreaming(false);
    setIsGenerating(false);
    lastProcessedQuery.current = '';
  }, []);

  return {
    isActive,
    response,
    messages,
    isStreaming,
    recap,
    error,
    isGenerating,
    sendMessage,
    validateAndRedirect,
    reset,
  };
}
