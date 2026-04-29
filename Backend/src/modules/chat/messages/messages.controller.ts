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

// DTO for sending a text message
// Ensures text is a valid string
class SendMessageDto {
  @IsString()
  text!: string;
}

// Base route: /conversations/:conversationId/messages
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  // Get paginated messages from a conversation
  // page → which batch of messages (0 = latest first batch)
  // limit → number of messages per request (default 30)
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

  // Send a text message in a conversation
  @Post()
  sendText(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendText(
      conversationId,
      userId,
      dto.text,
    );
  }

  // Upload and send media (image/video/file) in a conversation
  // Uses FileInterceptor to handle file upload
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @UploadedFile() file: any,
  ) {
    // Validate file existence
    if (!file) {
      throw new Error('No file provided');
    }

    // Send file (currently using filename as message content)
    return this.messagesService.sendText(
      conversationId,
      userId,
      file.filename,
    );
  }
}