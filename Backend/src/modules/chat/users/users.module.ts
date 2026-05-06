
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BlocksService } from './blocks.service';

@Module({
  controllers: [UsersController], // single controller — route order guaranteed
  providers: [UsersService, BlocksService],
  exports: [UsersService, BlocksService],
})
export class UsersModule { }
