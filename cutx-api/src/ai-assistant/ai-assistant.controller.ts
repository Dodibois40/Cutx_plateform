import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Sse,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AIAssistantService } from './ai-assistant.service';
import { ChatRequestDto, ClassifyQueryDto, GenerateConfigDto } from './dto/chat-request.dto';

@Controller('ai-assistant')
export class AIAssistantController {
  constructor(private readonly aiService: AIAssistantService) {}

  /**
   * Check if AI assistant is available
   */
  @Get('status')
  getStatus() {
    const modelInfo = this.aiService.getModelInfo();
    return {
      available: this.aiService.isAvailable(),
      model: modelInfo.model,
      thinking: modelInfo.thinking,
      description: 'Claude Sonnet 4.5 avec Extended Thinking',
    };
  }

  /**
   * Classify a query to determine if it needs AI
   */
  @Post('classify')
  @HttpCode(HttpStatus.OK)
  classifyQuery(@Body() dto: ClassifyQueryDto) {
    const result = this.aiService.classifyQuery(dto.query);
    return result;
  }

  /**
   * Stream chat response using Server-Sent Events
   */
  @Post('chat')
  @Sse()
  streamChat(@Body() dto: ChatRequestDto): Observable<MessageEvent> {
    return this.aiService.streamChat(dto).pipe(
      map((data) => {
        return { data: data.data } as MessageEvent;
      }),
    );
  }

  /**
   * Alternative: Non-streaming chat endpoint
   * Useful for testing or when streaming isn't needed
   */
  @Post('chat-sync')
  @HttpCode(HttpStatus.OK)
  async chatSync(@Body() dto: ChatRequestDto) {
    const response = await this.aiService.chat(dto.messages);
    const parsed = this.aiService.parseClaudeResponse(response);

    return {
      content: response,
      parsed,
    };
  }

  /**
   * Generate InitialGroupeData from validated recommendation
   */
  @Post('generate-config')
  @HttpCode(HttpStatus.OK)
  async generateConfig(@Body() dto: GenerateConfigDto) {
    return this.aiService.generateConfig(dto);
  }

  /**
   * Stream chat with manual response handling (alternative to @Sse)
   * This provides more control over the SSE stream
   */
  @Post('chat-stream')
  async streamChatManual(@Body() dto: ChatRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const observable = this.aiService.streamChat(dto);

    observable.subscribe({
      next: (data) => {
        res.write(`data: ${JSON.stringify(data.data)}\n\n`);
      },
      error: (err) => {
        res.write(`data: ${JSON.stringify({ error: true, message: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });
  }
}
