/**
 * AI Assistant API client
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';
const API_URL = `${BASE_URL}/api`;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClassificationResult {
  needsAI: boolean;
  confidence: number;
  reason: string;
  extractedIntent?: string;
}

export interface ParsedPanel {
  role: string;
  productType: string;
  criteria: {
    keywords: string[];
    thickness?: number;
    hydro?: boolean;
  };
  quantity?: number;
  reasoning?: string;
}

export interface ParsedDebit {
  panelRole: string;
  reference: string;
  longueur: number;
  largeur: number;
  quantity: number;
  chants: { A: boolean; B: boolean; C: boolean; D: boolean };
  description?: string;
}

export interface ClaudeRecommendation {
  understood: boolean;
  recap: string;
  questions?: string[];
  recommendation?: {
    panels: ParsedPanel[];
    debits: ParsedDebit[];
  };
}

/**
 * Check if AI assistant is available
 */
export async function checkAIStatus(): Promise<{ available: boolean; model: string }> {
  try {
    const response = await fetch(`${API_URL}/ai-assistant/status`);
    if (!response.ok) throw new Error('AI not available');
    return response.json();
  } catch {
    return { available: false, model: 'unknown' };
  }
}

/**
 * Classify a query to determine if AI is needed
 */
export async function classifyQuery(query: string): Promise<ClassificationResult> {
  const response = await fetch(`${API_URL}/ai-assistant/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Failed to classify query');
  }

  return response.json();
}

/**
 * Stream chat response from AI
 * Returns an async generator that yields text chunks
 */
export async function* streamChat(messages: Message[]): AsyncGenerator<string> {
  const response = await fetch(`${API_URL}/ai-assistant/chat-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error('Failed to start chat stream');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (typeof data === 'string') {
            yield data;
          } else if (data.error) {
            throw new Error(data.message);
          }
        } catch {
          // Raw text chunk
          const text = line.slice(6);
          if (text && text !== '[DONE]') {
            yield text.replace(/^"|"$/g, '');
          }
        }
      }
    }
  }
}

/**
 * Non-streaming chat (for simpler use cases)
 */
export async function chat(messages: Message[]): Promise<{
  content: string;
  parsed: ClaudeRecommendation | null;
}> {
  const response = await fetch(`${API_URL}/ai-assistant/chat-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error('Failed to get chat response');
  }

  return response.json();
}

/**
 * Generate configurateur data from recommendation
 */
export async function generateConfig(recommendation: ClaudeRecommendation['recommendation']): Promise<{
  groupes: unknown[];
}> {
  const response = await fetch(`${API_URL}/ai-assistant/generate-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendation }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate configuration');
  }

  return response.json();
}

/**
 * Parse Claude's response to extract JSON recommendation
 */
export function parseClaudeResponse(content: string): ClaudeRecommendation | null {
  // Look for JSON block
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Failed to parse
    }
  }

  // Try parsing entire content as JSON
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
