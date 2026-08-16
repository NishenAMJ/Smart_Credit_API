import type { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';

describe('GeminiProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        AI_ASSISTANT_ENABLED: 'true',
        GEMINI_API_KEY: 'test-key',
        GEMINI_MODEL: 'gemini-test-model',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes a tool call and returns the final assistant message', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'gemini-test-model',
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: 'call-1',
                      type: 'function',
                      function: {
                        name: 'list_my_loans',
                        arguments: '{}',
                      },
                    },
                  ],
                },
              },
            ],
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'gemini-test-model',
            choices: [
              {
                message: { content: 'You have one active loan.' },
              },
            ],
          }),
      } as Response);
    const executeTool = jest.fn(() => Promise.resolve([{ loanId: 'loan-1' }]));
    const provider = new GeminiProvider(config);

    const result = await provider.generate({
      user: { sub: 'borrower-1', email: 'b@example.com', role: 'borrower' },
      instructions: 'Read only.',
      messages: [{ role: 'user', content: 'Show my loans' }],
      tools: [
        {
          type: 'function',
          name: 'list_my_loans',
          description: 'List loans.',
          strict: true,
          parameters: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      ],
      executeTool,
    });

    expect(result).toEqual({
      content: 'You have one active loan.',
      toolNames: ['list_my_loans'],
      model: 'gemini-test-model',
    });
    expect(executeTool).toHaveBeenCalledWith('list_my_loans', {});
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestBody = (fetchMock.mock.calls[1][1] as RequestInit).body;
    const secondRequest = JSON.parse(requestBody as string) as {
      messages: Array<{ role: string; tool_call_id?: string }>;
    };
    expect(secondRequest.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'tool', tool_call_id: 'call-1' }),
      ]),
    );
  });
});
