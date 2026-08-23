import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { BlocksService } from './blocks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateFcmTokenDto {
  @IsString() fcmToken!: string;
}

/**
 * All routes protected by JwtAuthGuard.
 *
 * CRITICAL route order: fixed routes (/search, /blocked, /block/:id)
 * MUST be declared before the :id catch-all — otherwise NestJS routes
 * GET /users/search to GET /users/:id and returns the wrong data.
 */
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private usersService: UsersService,
    private blocksService: BlocksService,
  ) {}

  // ── Fixed routes FIRST ────────────────────────────────────────────────────

  /** GET /users/search?q=fathima — search users to start a new chat */
  @Get('search')
  async search(@Query('q') q: string, @CurrentUser() userId: string) {
    this.logger.log(`[search] q="${q}" requesterId="${userId}"`);
    const results = await this.usersService.search(q ?? '', userId);
    this.logger.log(`[search] returning ${results.length} results`);
    return results;
  }

  /** GET /users/blocked — list users blocked by the logged-in user */
  @Get('blocked')
  getBlocked(@CurrentUser() userId: string) {
    return this.blocksService.getBlockedUsers(userId);
  }

  /** POST /users/block/:targetId — block a user */
  @Post('block/:targetId')
  block(@CurrentUser() userId: string, @Param('targetId') targetId: string) {
    return this.blocksService.blockUser(userId, targetId);
  }

  /** DELETE /users/block/:targetId — unblock a user */
  @Delete('block/:targetId')
  unblock(@CurrentUser() userId: string, @Param('targetId') targetId: string) {
    return this.blocksService.unblockUser(userId, targetId);
  }

  /** PATCH /users/fcm-token — update push notification token after login */
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(userId, dto.fcmToken);
  }

  // ── :param route LAST ─────────────────────────────────────────────────────

  /** GET /users/:id — get any user's public profile */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}