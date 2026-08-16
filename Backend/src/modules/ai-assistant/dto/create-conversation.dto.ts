import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAiConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}
