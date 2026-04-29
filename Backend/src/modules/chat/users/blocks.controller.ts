import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
} from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { CurrentUser } from '../common/decorators/current-user.decorator'; // ✅ FIXED: plural folder, hyphen filename

@Controller('users')
export class BlocksController {
  constructor(private blocks: BlocksService) {}

  // GET /users/blocked
  @Get('blocked')
  getBlocked(@CurrentUser() userId: string) {
    return this.blocks.getBlockedUsers(userId);
  }

  // POST /users/block/:targetId
  @Post('block/:targetId')
  block(
    @CurrentUser() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.blocks.blockUser(userId, targetId);
  }

  // DELETE /users/block/:targetId
  @Delete('block/:targetId')
  unblock(
    @CurrentUser() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.blocks.unblockUser(userId, targetId);
  }
}