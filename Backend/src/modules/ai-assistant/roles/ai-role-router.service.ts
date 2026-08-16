import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-request';
import type { AiAssistantRole, AiToolDefinition } from '../ai-assistant.types';
import { BorrowerAiToolsService } from './borrower-ai-tools.service';
import { LenderAiToolsService } from './lender-ai-tools.service';

@Injectable()
export class AiRoleRouterService {
  constructor(
    private readonly borrowerTools: BorrowerAiToolsService,
    private readonly lenderTools: LenderAiToolsService,
  ) {}

  getRole(user: AuthenticatedUser): AiAssistantRole {
    if (user.role !== 'borrower' && user.role !== 'lender') {
      throw new ForbiddenException(
        'The AI assistant is available to borrower and lender roles only.',
      );
    }
    return user.role;
  }

  getTools(user: AuthenticatedUser): AiToolDefinition[] {
    return this.getRole(user) === 'borrower'
      ? this.borrowerTools.getDefinitions()
      : this.lenderTools.getDefinitions();
  }

  executeTool(
    user: AuthenticatedUser,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    return this.getRole(user) === 'borrower'
      ? this.borrowerTools.execute(user.sub, name, args)
      : this.lenderTools.execute(user.sub, name, args);
  }
}
