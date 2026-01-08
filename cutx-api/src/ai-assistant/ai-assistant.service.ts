import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { PANEL_EXPERT_SYSTEM_PROMPT } from './prompts';
import { classifyQuery } from './utils/query-classifier';
import { buildGroupeDataFromClaude } from './utils/groupe-builder';
import type { ChatRequestDto, GenerateConfigDto } from './dto/chat-request.dto';
import type {
  ClassificationResult,
  ClaudeRecommendation,
  InitialGroupeData,
  Message,
} from './types/ai-types';

@Injectable()
export class AIAssistantService {
  private readonly logger = new Logger(AIAssistantService.name);
  private anthropic: Anthropic;
  private readonly model: string;
  private readonly thinkingEnabled: boolean;
  private readonly thinkingBudget: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not configured - AI features will be disabled');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey || 'dummy-key-for-init',
    });

    // Claude Sonnet 4.5 with extended thinking
    this.model = this.configService.get<string>('AI_MODEL') || 'claude-sonnet-4-5-20250929';
    this.thinkingEnabled = true; // Enable extended thinking for better reasoning
    this.thinkingBudget = 10000; // Budget tokens for thinking
  }

  /**
   * Check if AI features are available
   */
  isAvailable(): boolean {
    return !!this.configService.get<string>('ANTHROPIC_API_KEY');
  }

  /**
   * Classify a query to determine if it needs AI assistance
   */
  classifyQuery(query: string): ClassificationResult {
    return classifyQuery(query);
  }

  /**
   * Stream a chat response from Claude
   * Returns an Observable for SSE streaming
   */
  streamChat(dto: ChatRequestDto): Observable<{ data: string }> {
    const subject = new Subject<{ data: string }>();

    if (!this.isAvailable()) {
      subject.next({
        data: JSON.stringify({
          error: true,
          message: "L'assistant IA n'est pas configuré. Utilisez la recherche classique.",
        }),
      });
      subject.complete();
      return subject.asObservable();
    }

    // Process in background
    this.processChat(dto.messages, subject);

    return subject.asObservable();
  }

  /**
   * Process chat with Claude (async) - with extended thinking enabled
   */
  private async processChat(messages: Message[], subject: Subject<{ data: string }>) {
    try {
      this.logger.debug(`Processing chat with ${messages.length} messages (thinking: ${this.thinkingEnabled})`);

      // Build request options with thinking mode
      const requestOptions: Parameters<typeof this.anthropic.messages.stream>[0] = {
        model: this.model,
        max_tokens: 16000, // Higher limit for thinking + response
        system: PANEL_EXPERT_SYSTEM_PROMPT,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };

      // Add thinking configuration if enabled
      if (this.thinkingEnabled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (requestOptions as any).thinking = {
          type: 'enabled',
          budget_tokens: this.thinkingBudget,
        };
      }

      const stream = await this.anthropic.messages.stream(requestOptions);

      let fullContent = '';
      let isThinking = false;

      for await (const event of stream) {
        // Handle thinking blocks (don't stream to user, just log)
        if (event.type === 'content_block_start') {
          const block = (event as { content_block?: { type: string } }).content_block;
          if (block?.type === 'thinking') {
            isThinking = true;
            this.logger.debug('Claude is thinking...');
            // Optionally notify user that Claude is thinking
            subject.next({ data: '[THINKING]' });
          } else if (block?.type === 'text') {
            isThinking = false;
          }
        }

        // Stream text deltas (only non-thinking content)
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string; thinking?: string };

          if (delta.type === 'thinking_delta' && delta.thinking) {
            // Log thinking but don't stream to user
            this.logger.debug(`Thinking: ${delta.thinking.substring(0, 100)}...`);
          } else if (delta.type === 'text_delta' && delta.text && !isThinking) {
            fullContent += delta.text;
            subject.next({ data: delta.text });
          }
        }
      }

      this.logger.debug(`Chat completed, response length: ${fullContent.length}`);

      // Send completion marker
      subject.next({ data: '\n[DONE]' });
      subject.complete();
    } catch (error) {
      this.logger.error('Error in chat stream:', error);

      subject.next({
        data: JSON.stringify({
          error: true,
          message: 'Erreur de communication avec Claude. Réessayez ou utilisez la recherche classique.',
          fallbackToSearch: true,
        }),
      });
      subject.complete();
    }
  }

  /**
   * Non-streaming chat for simple responses - with extended thinking
   */
  async chat(messages: Message[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error("L'assistant IA n'est pas configuré");
    }

    // Build request with thinking mode
    const requestOptions: Parameters<typeof this.anthropic.messages.create>[0] = {
      model: this.model,
      max_tokens: 16000,
      system: PANEL_EXPERT_SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Add thinking configuration if enabled
    if (this.thinkingEnabled) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (requestOptions as any).thinking = {
        type: 'enabled',
        budget_tokens: this.thinkingBudget,
      };
    }

    const response = await this.anthropic.messages.create(requestOptions);

    // Extract text content (skip thinking blocks)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = (response as any).content;
    if (Array.isArray(content)) {
      const textBlock = content.find((c: { type: string }) => c.type === 'text');
      return textBlock?.text || '';
    }
    return '';
  }

  /**
   * Get model info
   */
  getModelInfo(): { model: string; thinking: boolean } {
    return {
      model: this.model,
      thinking: this.thinkingEnabled,
    };
  }

  /**
   * Parse Claude's JSON response from a message
   */
  parseClaudeResponse(content: string): ClaudeRecommendation | null {
    // Look for JSON block in response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as ClaudeRecommendation;
      } catch (e) {
        this.logger.warn('Failed to parse JSON from Claude response:', e);
      }
    }

    // Try parsing entire content as JSON
    try {
      return JSON.parse(content) as ClaudeRecommendation;
    } catch {
      return null;
    }
  }

  /**
   * Generate InitialGroupeData from Claude's recommendation
   */
  async generateConfig(dto: GenerateConfigDto): Promise<{ groupes: InitialGroupeData[] }> {
    if (!dto.recommendation) {
      throw new Error('No recommendation provided');
    }

    const groupes = await buildGroupeDataFromClaude(
      {
        panels: dto.recommendation.panels,
        debits: dto.recommendation.debits,
      },
      this.prisma,
    );

    this.logger.debug(`Generated ${groupes.length} groupes from recommendation`);

    return { groupes };
  }
}
