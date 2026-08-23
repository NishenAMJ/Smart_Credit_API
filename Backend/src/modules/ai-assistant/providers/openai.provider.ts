import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type {
  AiAssistantProvider,
  AiProviderRequest,
  AiProviderResult,
} from '../ai-assistant.types';

type OpenAiOutputItem = {
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  content?: Array<{ type?: string; text?: string }>;
  [key: string]: unknown;
};

type OpenAiResponse = {
  id?: string;
  model?: string;
  output?: OpenAiOutputItem[];
  output_text?: string;
  error?: { message?: string };
};

@Injectable()
export class OpenAiProvider implements AiAssistantProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(request: AiProviderRequest): Promise<AiProviderResult> {
    this.assertConfigured();
    const model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() || 'gpt-5.6-terra';
    const input: unknown[] = request.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const toolNames = new Set<string>();

    for (let round = 0; round <= 3; round += 1) {
      const response = await this.createResponse({
        model,
        instructions: request.instructions,
        input,
        tools: request.tools,
        tool_choice: 'auto',
        reasoning: { effort: 'low', context: 'current_turn' },
        text: { verbosity: 'low' },
        max_output_tokens: 700,
        store: false,
        safety_identifier: this.buildSafetyIdentifier(request.user.sub),
      });
      const output = response.output ?? [];
      const calls = output.filter(
        (item) =>
          item.type === 'function_call' &&
          typeof item.name === 'string' &&
          typeof item.call_id === 'string',
      );

      if (calls.length === 0) {
        const content = this.readOutputText(response);
        if (!content) {
          throw new ServiceUnavailableException(
            'The AI assistant returned an empty response. Please try again.',
          );
        }
        return {
          content,
          toolNames: Array.from(toolNames),
          model: response.model ?? model,
        };
      }

      if (round === 3) {
        throw new ServiceUnavailableException(
          'The AI assistant could not finish within the safe tool limit.',
        );
      }

      input.push(...output);
      for (const call of calls) {
        const name = call.name as string;
        const callId = call.call_id as string;
        toolNames.add(name);
        let argumentsValue: Record<string, unknown> = {};

        try {
          const parsed = JSON.parse(call.arguments || '{}') as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            argumentsValue = parsed as Record<string, unknown>;
          }
        } catch {
          argumentsValue = {};
        }

        let toolOutput: unknown;
        try {
          toolOutput = await request.executeTool(name, argumentsValue);
        } catch (error) {
          toolOutput = {
            error:
              error instanceof Error
                ? error.message
                : 'The requested account record could not be loaded.',
          };
        }

        input.push({
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(toolOutput),
        });
      }
    }

    throw new ServiceUnavailableException(
      'The AI assistant could not complete the request.',
    );
  }

  private assertConfigured(): void {
    const enabled =
      this.configService.get<string>('AI_ASSISTANT_ENABLED')?.toLowerCase() ===
      'true';
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!enabled || !apiKey) {
      throw new ServiceUnavailableException(
        'The AI assistant is not configured. Enable it and provide the server API key.',
      );
    }
  }

  private async createResponse(
    payload: Record<string, unknown>,
  ): Promise<OpenAiResponse> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')!.trim();
    const baseUrl = (
      this.configService.get<string>('OPENAI_BASE_URL')?.trim() ||
      'https://api.openai.com/v1'
    ).replace(/\/$/, '');
    let response: Response;

    try {
      response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(
        `OpenAI request failed: ${error instanceof Error ? error.message : 'network error'}`,
      );
      throw new ServiceUnavailableException(
        'The AI assistant provider is temporarily unreachable.',
      );
    }

    const body = (await response.json().catch(() => ({}))) as OpenAiResponse;
    if (!response.ok) {
      this.logger.error(
        `OpenAI request returned ${response.status}: ${body.error?.message ?? 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'The AI assistant provider could not process the request.',
      );
    }
    return body;
  }

  private readOutputText(response: OpenAiResponse): string {
    if (
      typeof response.output_text === 'string' &&
      response.output_text.trim()
    ) {
      return response.output_text.trim();
    }
    return (response.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter(
        (content) =>
          content.type === 'output_text' && typeof content.text === 'string',
      )
      .map((content) => content.text!.trim())
      .filter(Boolean)
      .join('\n');
  }

  private buildSafetyIdentifier(userId: string): string {
    const salt =
      this.configService.get<string>('AI_SAFETY_IDENTIFIER_SALT') ||
      'smart-credit';
    return createHash('sha256').update(`${salt}:${userId}`).digest('hex');
  }
}
