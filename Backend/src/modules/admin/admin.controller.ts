import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ActivateUserDto } from './dto/activate-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
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
