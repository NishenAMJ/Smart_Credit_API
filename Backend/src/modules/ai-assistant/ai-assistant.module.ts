import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AI_ASSISTANT_PROVIDER } from './ai-assistant.types';
import { AiConversationRepository } from './ai-conversation.repository';
import { AssistantKnowledgeService } from './knowledge/assistant-knowledge.service';
import { OpenAiProvider } from './providers/openai.provider';
import { AiRoleRouterService } from './roles/ai-role-router.service';
import { BorrowerAiToolsService } from './roles/borrower-ai-tools.service';
import { LenderAiToolsService } from './roles/lender-ai-tools.service';
import { AiUsageService } from './usage/ai-usage.service';

@Module({
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    AiConversationRepository,
    AssistantKnowledgeService,
    AiRoleRouterService,
    BorrowerAiToolsService,
    LenderAiToolsService,
    AiUsageService,
    OpenAiProvider,
    {
      provide: AI_ASSISTANT_PROVIDER,
      useExisting: OpenAiProvider,
    },
  ],
})
export class AiAssistantModule {}
