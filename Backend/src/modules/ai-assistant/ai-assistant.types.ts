import type { AuthenticatedUser } from '../../common/types/authenticated-request';

export const AI_ASSISTANT_PROVIDER = 'AI_ASSISTANT_PROVIDER';

export type AiAssistantRole = Extract<
  AuthenticatedUser['role'],
  'borrower' | 'lender' | 'admin'
>;

export type AiToolDefinition = {
  type: 'function';
  name: string;
  description: string;
  strict: true;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
};

export type AiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiProviderRequest = {
  user: AuthenticatedUser;
  instructions: string;
  messages: AiChatMessage[];
  tools: AiToolDefinition[];
  executeTool: (
    name: string,
    argumentsValue: Record<string, unknown>,
  ) => Promise<unknown>;
};

export type AiProviderResult = {
  content: string;
  toolNames: string[];
  model: string;
};

export interface AiAssistantProvider {
  generate(request: AiProviderRequest): Promise<AiProviderResult>;
}

export type AiConversation = {
  conversationId: string;
  userId: string;
  userRole: AiAssistantRole;
  title: string;
  status: 'active' | 'archived';
  messageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AiStoredMessage = {
  messageId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'completed' | 'failed';
  toolNames: string[];
  model: string | null;
  createdAt: string | null;
};
