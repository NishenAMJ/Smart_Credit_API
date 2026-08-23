import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiAssistantProvider,
  AiProviderRequest,
  AiProviderResult,
} from '../ai-assistant.types';

type GeminiToolCall = {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type GeminiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: GeminiToolCall[];
  tool_call_id?: string;
};

type GeminiChatCompletion = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: GeminiToolCall[];
    };
  }>;
  error?: { message?: string };
};

type GeminiErrorResponse =
  | GeminiChatCompletion
  | Array<{ error?: { message?: string } }>;

@Injectable()
export class GeminiProvider implements AiAssistantProvider {
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(request: AiProviderRequest): Promise<AiProviderResult> {
    this.assertConfigured();
    const model =
      this.configService.get<string>('GEMINI_MODEL')?.trim() ||
      'gemini-flash-latest';
    const messages: GeminiMessage[] = [
      { role: 'system', content: request.instructions },
      ...request.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];
    const tools = request.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
    const toolNames = new Set<string>();

    for (let round = 0; round <= 3; round += 1) {
      const response = await this.createCompletion({
        model,
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 700,
      });
      const assistant = response.choices?.[0]?.message;
      const calls = (assistant?.tool_calls ?? []).filter(
        (call) =>
          typeof call.id === 'string' &&
          typeof call.function?.name === 'string',
      );

      if (calls.length === 0) {
        const content = assistant?.content?.trim();
        if (!content) {
          throw new ServiceUnavailableException(
            'The Gemini assistant returned an empty response. Please try again.',
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
          'The Gemini assistant could not finish within the safe tool limit.',
        );
      }

      messages.push({
        role: 'assistant',
        content: assistant?.content ?? null,
        tool_calls: calls,
      });

      for (const call of calls) {
        const name = call.function!.name as string;
        const callId = call.id as string;
        toolNames.add(name);
        let argumentsValue: Record<string, unknown> = {};

        try {
          const parsed = JSON.parse(
            call.function?.arguments || '{}',
          ) as unknown;
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

        messages.push({
          role: 'tool',
          tool_call_id: callId,
          content: JSON.stringify(toolOutput),
        });
      }
    }

    throw new ServiceUnavailableException(
      'The Gemini assistant could not complete the request.',
    );
  }

  private assertConfigured(): void {
    const enabled =
      this.configService.get<string>('AI_ASSISTANT_ENABLED')?.toLowerCase() ===
      'true';
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
    if (!enabled || !apiKey) {
      throw new ServiceUnavailableException(
        'The Gemini assistant is not configured. Enable it and provide the server API key.',
      );
    }
  }

  private async createCompletion(
    payload: Record<string, unknown>,
  ): Promise<GeminiChatCompletion> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')!.trim();
    const baseUrl = (
      this.configService.get<string>('GEMINI_BASE_URL')?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/openai'
    ).replace(/\/$/, '');
    let response: Response;

    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(
        `Gemini request failed: ${error instanceof Error ? error.message : 'network error'}`,
      );
      throw new ServiceUnavailableException(
        'The Gemini assistant provider is temporarily unreachable.',
      );
    }

    const body = (await response
      .json()
      .catch(() => ({}))) as GeminiErrorResponse;
    if (!response.ok) {
      const errorMessage = Array.isArray(body)
        ? body[0]?.error?.message
        : body.error?.message;
      this.logger.error(
        `Gemini request returned ${response.status}: ${errorMessage ?? 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'The Gemini assistant provider could not process the request.',
      );
    }
    return body as GeminiChatCompletion;
  }
}
