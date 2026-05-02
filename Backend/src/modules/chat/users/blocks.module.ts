/**
 * blocks.module.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * BlocksController has been REMOVED and merged into UsersController.
 * This module now only provides BlocksService for injection elsewhere.
 *
 * If you import BlocksModule somewhere, it still works — BlocksService is
 * exported. But route handling is now exclusively in UsersController.
 */
import { Module } from '@nestjs/common';
import { BlocksService } from './blocks.service';

@Module({
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}