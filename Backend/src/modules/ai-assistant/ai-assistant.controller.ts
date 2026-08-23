import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiAssistantService } from './ai-assistant.service';
import { CreateAiConversationDto } from './dto/create-conversation.dto';
import { SendAiMessageDto } from './dto/send-ai-message.dto';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('borrower', 'lender', 'admin')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('conversations')
  async createConversation(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAiConversationDto,
  ) {
    return {
      conversation: await this.aiAssistantService.createConversation(
        request.user,
        dto?.title,
      ),
    };
  }

  @Get('conversations')
  async listConversations(@Req() request: AuthenticatedRequest) {
    return {
      conversations: await this.aiAssistantService.listConversations(
        request.user,
      ),
    };
  }

  @Get('conversations/:conversationId/messages')
  async listMessages(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return {
      messages: await this.aiAssistantService.listMessages(
        request.user,
        conversationId,
      ),
    };
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendAiMessageDto,
  ) {
    return this.aiAssistantService.sendMessage(
      request.user,
      conversationId,
      dto?.content,
    );
  }

  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveConversation(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    await this.aiAssistantService.archiveConversation(
      request.user,
      conversationId,
    );
  }
}
