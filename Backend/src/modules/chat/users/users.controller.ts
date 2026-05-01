/**
 * users.controller.ts
 * Base path: /users
 */
import { Controller, Get, Patch, Body, Query, Param } from '@nestjs/common';
import { IsString } from 'class-validator';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class UpdateFcmTokenDto {
  @IsString()
  fcmToken!: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /** GET /users/search?q=john — search users by username prefix */
  @Get('search')
  search(@Query('q') q: string, @CurrentUser() userId: string) {
    return this.usersService.search(q ?? '', userId);
  }

  /** GET /users/:id — get a single user's public profile */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /** PATCH /users/fcm-token — update FCM push token (called on login/refresh) */
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(userId, dto.fcmToken);
  }
}