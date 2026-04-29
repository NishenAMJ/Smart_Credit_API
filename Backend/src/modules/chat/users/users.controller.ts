// Users controller handles user-related API endpoints
// Includes searching users, fetching user details, and updating FCM token

import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Param,
} from '@nestjs/common';

import { IsString } from 'class-validator';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// DTO for updating FCM token
// Ensures fcmToken is a valid string
class UpdateFcmTokenDto {
  @IsString()
  fcmToken!: string;
}

// Base route: /users
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  
  // SEARCH USERS
  // GET /users/search?q=john
  // Returns users whose username starts with query
  
  @Get('search')
  search(
    @Query('q') q: string,
    @CurrentUser() userId: string,
  ) {
    return this.usersService.search(q ?? '', userId);
  }

  
  // GET SINGLE USER BY ID
  // GET /users/:id
  
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  
  // UPDATE FCM TOKEN
  // PATCH /users/fcm-token
  // Called when mobile app refreshes push notification token
 
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(
      userId,
      dto.fcmToken,
    );
  }
}