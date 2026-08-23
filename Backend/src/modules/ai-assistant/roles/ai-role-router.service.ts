import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-request';
import type { AiAssistantRole, AiToolDefinition } from '../ai-assistant.types';
import { BorrowerAiToolsService } from './borrower-ai-tools.service';
import { LenderAiToolsService } from './lender-ai-tools.service';
import { AdminAiToolsService } from './admin-ai-tools.service';

@Injectable()
export class AiRoleRouterService {
  constructor(
    private readonly borrowerTools: BorrowerAiToolsService,
    private readonly lenderTools: LenderAiToolsService,
    private readonly adminTools: AdminAiToolsService,
  ) {}

  getRole(user: AuthenticatedUser): AiAssistantRole {
    if (!['borrower', 'lender', 'admin'].includes(user.role)) {
      throw new ForbiddenException(
        'The AI assistant is not available to this role.',
      );
    }
    return user.role;
  }

  getTools(user: AuthenticatedUser): AiToolDefinition[] {
    switch (this.getRole(user)) {
      case 'borrower':
        return this.borrowerTools.getDefinitions();
      case 'lender':
        return this.lenderTools.getDefinitions();
      case 'admin':
        return this.adminTools.getDefinitions();
    }
  }

  executeTool(
    user: AuthenticatedUser,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (this.getRole(user)) {
      case 'borrower':
        return this.borrowerTools.execute(user.sub, name, args);
      case 'lender':
        return this.lenderTools.execute(user.sub, name, args);
      case 'admin':
        return this.adminTools.execute(user.sub, name, args);
    }
  }
}
