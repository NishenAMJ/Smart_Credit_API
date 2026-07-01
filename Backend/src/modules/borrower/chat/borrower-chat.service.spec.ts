import { BorrowerChatService } from './borrower-chat.service';

describe('BorrowerChatService', () => {
  const createCollection = () => {
    const get = jest.fn();
    const add = jest.fn();
    const update = jest.fn();
    const doc = jest.fn(() => ({ update }));
    const where = jest.fn(() => ({ get }));

    return {
      collection: { where, add, doc },
      get,
      add,
      update,
      where,
      doc,
    };
  };

  const createService = () => {
    const messages = createCollection();
    const conversations = createCollection();
    const getDb = jest.fn(() => ({
      collection: jest.fn((name: string) =>
        name === 'messages' ? messages.collection : conversations.collection,
      ),
    }));
    const service = new BorrowerChatService({ getDb } as never);

    return { service, messages, conversations };
  };

  it('should return borrower conversations sorted by last message time', async () => {
    const { service, conversations } = createService();
    conversations.get.mockResolvedValue({
      docs: [
        { id: 'old', data: () => ({ lastMessageAt: { _seconds: 1 } }) },
        { id: 'new', data: () => ({ lastMessageAt: { _seconds: 3 } }) },
      ],
    });

    const result = await service.getAllConversations('borrower-1');

    expect(conversations.where).toHaveBeenCalledWith(
      'participants',
      'array-contains',
      'borrower-1',
    );
    expect(result.data.map((item) => item.conversationId)).toEqual([
      'new',
      'old',
    ]);
  });

  it('should return conversation messages sorted by created time', async () => {
    const { service, messages } = createService();
    messages.get.mockResolvedValue({
      docs: [
        { id: 'second', data: () => ({ createdAt: { _seconds: 2 } }) },
        { id: 'first', data: () => ({ createdAt: { _seconds: 1 } }) },
      ],
    });

    const result = await service.getConversationMessages('conversation-1');

    expect(messages.where).toHaveBeenCalledWith(
      'conversationId',
      '==',
      'conversation-1',
    );
    expect(result.data.map((item) => item.messageId)).toEqual([
      'first',
      'second',
    ]);
  });

  it('should send a message and update the conversation last message', async () => {
    const { service, messages, conversations } = createService();
    messages.add.mockResolvedValue({ id: 'message-1' });

    const result = await service.sendMessage({
      conversationId: 'conversation-1',
      senderId: 'borrower-1',
      message: 'Hello',
    });

    expect(messages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        senderId: 'borrower-1',
        message: 'Hello',
        read: false,
      }),
    );
    expect(conversations.doc).toHaveBeenCalledWith('conversation-1');
    expect(conversations.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastMessage: 'Hello' }),
    );
    expect(result.data.messageId).toBe('message-1');
  });
});
