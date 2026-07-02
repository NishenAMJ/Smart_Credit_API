import { IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  conversationId: string;

  @IsString()
  senderId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
