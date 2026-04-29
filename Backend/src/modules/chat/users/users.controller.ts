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
import { CurrentUser } from '../common/decorators/current-user.decorator'; // ✅ FIXED: plural folder, hyphen filename

class UpdateFcmTokenDto {
  @IsString()
  fcmToken!: string;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /users/search?q=john
  @Get('search')
  search(
    @Query('q') q: string,
    @CurrentUser() userId: string,
  ) {
    return this.usersService.search(q ?? '', userId);
  }

  // GET /users/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // PATCH /users/fcm-token  — called by app whenever FCM token refreshes
  @Patch('fcm-token')
  updateFcmToken(
    @CurrentUser() userId: string,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.usersService.updateFcmToken(userId, dto.fcmToken);
  }
}