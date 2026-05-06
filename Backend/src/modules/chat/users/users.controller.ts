

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  Logger,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { UsersService } from './users.service';
import { BlocksService } from './blocks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateFcmTokenDto {
  @IsString()
  fcmToken!: string;
}

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private usersService: UsersService,
    private blocksService: BlocksService,
  ) { }



  /**
   * GET /users/search?q=fathima
   * Returns users whose displayName or username contains the query string.
   * Case-insensitive partial match.
   */
  @Get('search')
  async search(@Query('q') q: string, @CurrentUser() userId: string) {
    this.logger.log(`[search] q="${q}" userId="${userId}"`);
    const results = await this.usersService.search(q ?? '', userId);
    this.logger.log(`[search] returning ${results.length} results`);
    // Return plain array — no wrapping so frontend receives [] or [user, ...]
    return results;
  }

  //  Blocked users — MUST be before :id 

  /** GET /users/blocked — list all users blocked by current user */
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

  /** PATCH /users/fcm-token — update device push token */
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(userId, dto.fcmToken);
  }



  /** GET /users/:id — get a single user's public profile */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
