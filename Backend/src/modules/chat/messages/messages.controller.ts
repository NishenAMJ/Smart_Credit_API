// Messages controller handles sending and retrieving messages in conversations
// Supports text messages and media uploads (images, videos)


import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  NotImplementedException,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { CurrentUser } from '../common/decorators/current-user.decorator'; // ✅ FIXED: correct path (plural, hyphen)

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

  // ✅ FIXED: was calling sendText(file.filename) which stores a local path as the message text.
  // Throws NotImplementedException until a proper sendMedia method is built that
  // uploads to Firebase Storage and saves a real mediaUrl.
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @Param('conversationId') _conversationId: string,
    @CurrentUser() _userId: string,
    @UploadedFile() _file: Express.Multer.File,
  ) {
    throw new NotImplementedException(
      'Media upload is not yet implemented. Implement a sendMedia() method in MessagesService that uploads to Firebase Storage first.',
    );
  }
}