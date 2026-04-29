// Blocks controller handles user blocking functionality in the app
// Allows users to block, unblock, and view blocked users

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
} from '@nestjs/common';

import { BlocksService } from './blocks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Base route: /users
@Controller('users')
export class BlocksController {
  constructor(private blocks: BlocksService) {}

  // GET /users/blocked
  // Get list of users blocked by the current user
  @Get('blocked')
  getBlocked(@CurrentUser() userId: string) {
    return this.blocks.getBlockedUsers(userId);
  }

  // POST /users/block/:targetId
  // Block a specific user (targetId)
  @Post('block/:targetId')
  block(
    @CurrentUser() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.blocks.blockUser(userId, targetId);
  }

  // DELETE /users/block/:targetId
  // Unblock a previously blocked user
  @Delete('block/:targetId')
  unblock(
    @CurrentUser() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.blocks.unblockUser(userId, targetId);
  }
}