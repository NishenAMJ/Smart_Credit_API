/**
 * messages.controller.ts
 * Base path: /conversations/:conversationId/messages
 *
 * LOCAL-FIRST NOTE:
 * The GET endpoint is used on first install to seed the local SQLite database.
 * The POST endpoint is an HTTP fallback if WebSocket is unavailable.
 * Normal message sending goes through the WebSocket gateway.
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  NotImplementedException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class SendMessageDto {
  @IsString()
  text!: string;
}

@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  /**
   * GET /conversations/:conversationId/messages
   * Returns paginated message history from Firestore.
   * Used on first install to seed the local SQLite database.
   * page is 0-indexed (page=0 → newest 30 messages).
   */
  @Get()
  list(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Query('page') page: string = '0',
    @Query('limit') limit: string = '30',
  ) {
    return this.messagesService.getMessages(conversationId, userId, page, limit);
  }

  /**
   * POST /conversations/:conversationId/messages
   * HTTP fallback for sending a message when WebSocket is unavailable.
   * Under normal conditions the frontend uses the WebSocket gateway instead.
   */
  @Post()
  sendText(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendText(conversationId, userId, dto.text);
  }

  /**
   * POST /conversations/:conversationId/messages/upload
   * Media upload — not yet implemented.
   * Needs a proper Firebase Storage upload before storing the URL.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia() {
    throw new NotImplementedException(
      'Media upload not yet implemented. Implement Firebase Storage upload first.',
    );
  }
}