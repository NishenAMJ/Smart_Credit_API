import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BlocksService } from './blocks.service';
import { AuthModule } from '../../auth/auth.module';

/**
 * Single module for both user and block functionality.
 * BlocksController is intentionally NOT registered separately —
 * all routes are merged into UsersController to prevent the
 * dual-@Controller('users') route collision that breaks search.
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, BlocksService],
  exports: [UsersService, BlocksService],
})
export class UsersModule {}