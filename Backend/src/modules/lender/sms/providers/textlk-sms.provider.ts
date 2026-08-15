import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SendSmsProviderInput, SmsProvider } from './sms-provider';

type TextlkConfig = {
  apiUrl: string;
  apiToken: string;
  senderId: string;
};

type TextlkResponse = {
  status?: unknown;
  messageId?: unknown;
  id?: unknown;
  data?: {
    uid?: unknown;
  };
};

@Injectable()
export class TextlkSmsProvider implements SmsProvider {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  getSenderId(): string | null {
    return this.getConfig()?.senderId ?? null;
  }

  async send(input: SendSmsProviderInput): Promise<string | null> {
    const config = this.getConfig();
    if (!config) {
      throw new ServiceUnavailableException(
        'SMS provider is not configured on the server.',
      );
    }

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: this.normalizeRecipient(input.to),
        sender_id: config.senderId,
        type: 'plain',
        message: input.message,
      }),
    });

    const responseText = await response.text();
    const payload = this.parseResponse(responseText);
    if (!response.ok || payload?.status === 'error') {
      throw new Error(`Text.lk returned status ${response.status}.`);
    }

    return this.readProviderMessageId(payload);
  }

  private getConfig(): TextlkConfig | null {
    const apiUrl = this.configService.get<string>('TEXTLK_API_URL')?.trim();
    const apiToken = this.configService.get<string>('TEXTLK_API_TOKEN')?.trim();
    const senderId = this.configService.get<string>('TEXTLK_SENDER_ID')?.trim();

    if (!apiUrl || !apiToken || !senderId) return null;
    return { apiUrl, apiToken, senderId };
  }

  private normalizeRecipient(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  private parseResponse(responseText: string): TextlkResponse | null {
    if (!responseText) return null;

    try {
      const payload = JSON.parse(responseText) as unknown;
      return payload && typeof payload === 'object'
        ? (payload as TextlkResponse)
        : null;
    } catch {
      return null;
    }
  }

  private readProviderMessageId(payload: TextlkResponse | null): string | null {
    const candidates = [payload?.data?.uid, payload?.messageId, payload?.id];
    const messageId = candidates.find(
      (value): value is string => typeof value === 'string' && Boolean(value),
    );
    return messageId ?? null;
  }
}
