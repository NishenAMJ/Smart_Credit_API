// Messages controller handles sending and retrieving messages in conversations
// Supports text messages and media uploads (images, videos)

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
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

  // Get paginated list of messages from a conversation
  // Use page=0 for first batch, page=1 for second, etc
  @Get()
  list(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Query('page') page: string = '0',
    @Query('limit') limit: string = '30',
  ) {
    return this.messagesService.getMessages(
      conversationId,
      userId,
      page,
      limit,
    );
  }

  // Send a text message to the conversation
  @Post()
  sendText(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendText(conversationId, userId, dto.text);
  }

  // Upload and send media (image or video) to the conversation
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }
    return this.messagesService.sendText(conversationId, userId, file.filename);
  }
}