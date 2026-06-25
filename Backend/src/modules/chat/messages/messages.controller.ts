import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  NotImplementedException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class SendMessageDto {
  @IsString() text!: string;
}

/**
 * All routes protected by JwtAuthGuard.
 * MessagesService.getMessages() calls ConversationsService.findOne()
 * internally which checks participantIds — so a user can only read
 * messages from conversations they belong to.
 */
@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  /** GET /conversations/:id/messages — paginated, 0-indexed page */
  @Get()
  list(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Query('page') page: string = '0',
    @Query('limit') limit: string = '30',
  ) {
    return this.messagesService.getMessages(conversationId, userId, page, limit);
  }

  /** POST /conversations/:id/messages — HTTP fallback when WebSocket unavailable */
  @Post()
  sendText(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendText(conversationId, userId, dto.text);
  }

  /** POST /conversations/:id/messages/upload — not yet implemented */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia() {
    throw new NotImplementedException(
      'Media upload not yet implemented.',
    );
  }
}