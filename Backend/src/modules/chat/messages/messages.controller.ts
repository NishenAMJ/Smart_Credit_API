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

  // GET /conversations/:conversationId/messages?page=0&limit=30
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

  // POST /conversations/:conversationId/messages
  @Post()
  sendText(
    @Param('conversationId') conversationId: string,
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendText(conversationId, userId, dto.text);
  }

  // POST /conversations/:conversationId/messages/upload
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