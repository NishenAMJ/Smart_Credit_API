import { Module } from '@nestjs/common';
import { BlocksService } from './blocks.service';

/**
 * BlocksController has been intentionally merged into UsersController.
 * This module only provides BlocksService for injection by GatewayModule.
 */
@Module({
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}