import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import {
  AI_ASSISTANT_PROVIDER,
  type AiAssistantProvider,
} from './ai-assistant.types';
import { AiConversationRepository } from './ai-conversation.repository';
import { AssistantKnowledgeService } from './knowledge/assistant-knowledge.service';
import { AiRoleRouterService } from './roles/ai-role-router.service';
import { AiUsageService } from './usage/ai-usage.service';

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly conversations: AiConversationRepository,
    private readonly roleRouter: AiRoleRouterService,
    private readonly knowledge: AssistantKnowledgeService,
    private readonly usage: AiUsageService,
    @Inject(AI_ASSISTANT_PROVIDER)
    private readonly provider: AiAssistantProvider,
  ) {}

  async createConversation(user: AuthenticatedUser, requestedTitle?: string) {
    const role = this.roleRouter.getRole(user);
    const title = this.normalizeTitle(requestedTitle) || 'New conversation';
    return this.conversations.create(user, role, title);
  }

  async listConversations(user: AuthenticatedUser) {
    const role = this.roleRouter.getRole(user);
    return this.conversations.list(user, role);
  }

  async listMessages(user: AuthenticatedUser, conversationId: string) {
    const role = this.roleRouter.getRole(user);
    return this.conversations.listMessages(conversationId, user, role);
  }

  async sendMessage(
    user: AuthenticatedUser,
    conversationId: string,
    rawContent: string,
  ) {
    const content = rawContent?.trim();
    if (!content || content.length > 2000) {
      throw new BadRequestException(
        'Message content must contain 1 to 2000 characters.',
      );
    }
    const role = this.roleRouter.getRole(user);
    await this.usage.assertWithinLimit(`${role}:${user.sub}`);
    const existingMessages = await this.conversations.listMessages(
      conversationId,
      user,
      role,
      30,
    );
    const userMessage = await this.conversations.addMessage(conversationId, {
      role: 'user',
      content,
      status: 'completed',
    });

    if (existingMessages.length === 0) {
      await this.conversations.updateTitle(
        conversationId,
        this.normalizeTitle(content) || 'New conversation',
      );
    }

    try {
      const result = await this.provider.generate({
        user,
        instructions: this.knowledge.buildInstructions(role),
        messages: [...existingMessages, userMessage]
          .filter((message) => message.status === 'completed')
          .slice(-16)
          .map((message) => ({ role: message.role, content: message.content })),
        tools: this.roleRouter.getTools(user),
        executeTool: (name, argumentsValue) =>
          this.roleRouter.executeTool(user, name, argumentsValue),
      });
      const assistantMessage = await this.conversations.addMessage(
        conversationId,
        {
          role: 'assistant',
          content: result.content,
          status: 'completed',
          toolNames: result.toolNames,
          model: result.model,
        },
      );
      return { userMessage, assistantMessage };
    } catch (error) {
      await this.conversations.addMessage(conversationId, {
        role: 'assistant',
        content: 'I could not complete that request. Please try again shortly.',
        status: 'failed',
      });
      throw error;
    }
  }

  async archiveConversation(user: AuthenticatedUser, conversationId: string) {
    const role = this.roleRouter.getRole(user);
    await this.conversations.archive(conversationId, user, role);
  }

  private normalizeTitle(value?: string): string {
    return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  }
}
