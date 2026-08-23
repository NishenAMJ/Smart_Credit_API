import { ServiceUnavailableException } from '@nestjs/common';
import { TextlkSmsProvider } from './textlk-sms.provider';

const configValues: Record<string, string> = {
  TEXTLK_API_URL: 'https://app.text.lk/api/v3/sms/send',
  TEXTLK_API_TOKEN: 'test-token',
  TEXTLK_SENDER_ID: 'SmartCredit',
};

function createProvider(values = configValues) {
  return new TextlkSmsProvider({
    get: jest.fn((key: string) => values[key]),
  } as any);
}

describe('TextlkSmsProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports its configuration and sender ID', () => {
    const provider = createProvider();

    expect(provider.isConfigured()).toBe(true);
    expect(provider.getSenderId()).toBe('SmartCredit');
  });

  it('sends the Text.lk OAuth request and returns the delivery UID', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve('{"status":"success","data":{"uid":"textlk_1"}}'),
    } as Response);
    const provider = createProvider();

    await expect(
      provider.send({ to: '+94 77-000-0001', message: 'Payment reminder' }),
    ).resolves.toBe('textlk_1');
    expect(fetch).toHaveBeenCalledWith('https://app.text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: '94770000001',
        sender_id: 'SmartCredit',
        type: 'plain',
        message: 'Payment reminder',
      }),
    });
  });

  it('rejects sending when any required Text.lk setting is missing', async () => {
    const provider = createProvider({
      TEXTLK_API_TOKEN: 'test-token',
      TEXTLK_SENDER_ID: 'SmartCredit',
    });

    expect(provider.isConfigured()).toBe(false);
    await expect(
      provider.send({ to: '+94770000001', message: 'Payment reminder' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects an error payload even when Text.lk responds with HTTP 200', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"status":"error"}'),
    } as Response);
    const provider = createProvider();

    await expect(
      provider.send({ to: '+94770000001', message: 'Payment reminder' }),
    ).rejects.toThrow('Text.lk returned status 200.');
  });
});
