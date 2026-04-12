import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ActivateUserDto } from './dto/activate-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AdminJwtGuard } from './admin-auth/guards/admin-jwt.guard';

@Controller('admin')
@UseGuards(AdminJwtGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users/stats')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('users')
  async getAllUsers(@Query() query: QueryUsersDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:userId')
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  @Post('users/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(@Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(dto.userId, dto.reason);
  }

  @Post('users/activate')
  @HttpCode(HttpStatus.OK)
  async activateUser(@Body() dto: ActivateUserDto) {
    return this.adminService.activateUser(dto.userId);
  }

  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }
}
