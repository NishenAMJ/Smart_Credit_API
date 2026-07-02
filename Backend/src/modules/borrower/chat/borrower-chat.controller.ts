import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { BorrowerChatService } from './borrower-chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('borrower/chat')
export class BorrowerChatController {
  constructor(private readonly borrowerChatService: BorrowerChatService) {}

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  async getAllConversations(@Query('borrowerId') borrowerId: string) {
    return this.borrowerChatService.getAllConversations(borrowerId);
  }

  @Get(':conversationId')
  @HttpCode(HttpStatus.OK)
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
  ) {
    return this.borrowerChatService.getConversationMessages(conversationId);
  }

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return this.borrowerChatService.sendMessage(sendMessageDto);
  }
}
