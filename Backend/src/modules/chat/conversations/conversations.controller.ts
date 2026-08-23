import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class StartConversationDto {
  @IsString() targetUserId!: string;
}

class MuteDto {
  @IsBoolean() muted!: boolean;
}

/**
 * All routes protected by JwtAuthGuard.
 * @CurrentUser() reads req.user.sub from the verified JWT payload —
 * so every query is automatically scoped to the logged-in user.
 * A user can never see another user's conversations.
 */
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private conversations: ConversationsService) {}

  /** GET /conversations — only returns conversations this user participates in */
  @Get()
  list(@CurrentUser() userId: string) {
    return this.conversations.listForUser(userId);
  }

  /** POST /conversations — start or get existing conversation */
  @Post()
  start(@CurrentUser() userId: string, @Body() dto: StartConversationDto) {
    return this.conversations.getOrCreate(userId, dto.targetUserId);
  }

  /** GET /conversations/:id — throws 403 if user is not a participant */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.conversations.findOne(id, userId);
  }

  /** PATCH /conversations/:id/read — reset this user's unread count */
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.conversations.markAsRead(id, userId);
  }

  /** PATCH /conversations/:id/mute — mute/unmute for this user only */
  @Patch(':id/mute')
  mute(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: MuteDto,
  ) {
    return this.conversations.setMuted(id, userId, dto.muted);
  }

  /** DELETE /conversations/:id — only a participant can delete */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.conversations.delete(id, userId);
  }
}