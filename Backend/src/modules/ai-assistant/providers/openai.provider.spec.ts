import type { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';

describe('OpenAiProvider', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        AI_ASSISTANT_ENABLED: 'true',
        OPENAI_API_KEY: 'test-key',
        OPENAI_MODEL: 'test-model',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes a function call and returns the final assistant message', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'test-model',
            output: [
              {
                type: 'function_call',
                name: 'list_my_loans',
                call_id: 'call-1',
                arguments: '{}',
              },
            ],
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'test-model',
            output_text: 'You have one active loan.',
            output: [],
          }),
      } as Response);
    const executeTool = jest.fn(() => Promise.resolve([{ loanId: 'loan-1' }]));
    const provider = new OpenAiProvider(config);

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
      model: 'test-model',
    });
    expect(executeTool).toHaveBeenCalledWith('list_my_loans', {});
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestBody = (fetchMock.mock.calls[1][1] as RequestInit).body;
    expect(typeof requestBody).toBe('string');
    const secondRequest = JSON.parse(requestBody as string) as {
      input: Array<{ type?: string; call_id?: string }>;
    };
    expect(secondRequest.input).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'function_call_output',
          call_id: 'call-1',
        }),
      ]),
    );
  });
});
