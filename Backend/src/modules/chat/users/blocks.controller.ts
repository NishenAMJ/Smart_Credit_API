/**
 * blocks.controller.ts
 * Base path: /users
 */
import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class BlocksController {
  constructor(private blocks: BlocksService) {}

  /** GET /users/blocked — list all users blocked by current user */
  @Get('blocked')
  getBlocked(@CurrentUser() userId: string) {
    return this.blocks.getBlockedUsers(userId);
  }

  /** POST /users/block/:targetId — block a user */
  @Post('block/:targetId')
  block(
    @CurrentUser() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.blocks.blockUser(userId, targetId);
  }

  /** DELETE /users/block/:targetId — unblock a user */
  @Delete('block/:targetId')
  unblock(
    @CurrentUser() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.blocks.unblockUser(userId, targetId);
  }
}