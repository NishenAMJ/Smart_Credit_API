import { ChatGateway } from './chat.gateway';

function createClient() {
  return {
    id: 'socket_1',
    handshake: {
      auth: { token: 'Bearer valid-token' },
      headers: {},
    },
    data: {},
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as any;
}

describe('ChatGateway presence resilience', () => {
  it('keeps a connection alive when the Firestore presence write times out', async () => {
    const users = {
      setOnlineStatus: jest.fn().mockRejectedValue({
        code: 4,
        details: 'Deadline exceeded',
      }),
    };
    const gateway = new ChatGateway(
      {
        verify: jest.fn().mockReturnValue({
          sub: 'lender_1',
          email: 'lender@example.com',
          role: 'lender',
        }),
      } as any,
      users as any,
      {} as any,
    );
    gateway.server = { emit: jest.fn() } as any;
    const client = createClient();

    await expect(gateway.handleConnection(client)).resolves.toBeUndefined();

    expect(client.disconnect).not.toHaveBeenCalled();
    expect(gateway.server.emit).not.toHaveBeenCalledWith(
      'userOnline',
      expect.anything(),
    );
  });

  it('does not reject the disconnect lifecycle when Firestore is unavailable', async () => {
    const users = {
      setOnlineStatus: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce({ code: 4, details: 'Deadline exceeded' }),
    };
    const gateway = new ChatGateway(
      {
        verify: jest.fn().mockReturnValue({
          sub: 'borrower_1',
          email: 'borrower@example.com',
          role: 'borrower',
        }),
      } as any,
      users as any,
      {} as any,
    );
    gateway.server = { emit: jest.fn() } as any;
    const client = createClient();

    await gateway.handleConnection(client);
    await expect(gateway.handleDisconnect(client)).resolves.toBeUndefined();

    expect(users.setOnlineStatus).toHaveBeenLastCalledWith('borrower_1', false);
  });
});
