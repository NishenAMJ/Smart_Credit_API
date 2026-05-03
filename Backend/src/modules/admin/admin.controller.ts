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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Returns user counts grouped by account status and role for the admin dashboard.
  @Get('users/stats')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  // Returns users that match the optional search, role, and status filters.
  @Get('users')
  async getAllUsers(
    @Query() query: QueryUsersDto,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getAllUsers(query, limit, cursor);
  }

  // Returns a single user record by document id.
  @Get('users/:userId')
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  // Suspends a user account and records the admin's reason.
  @Post('users/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(@Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(dto.userId, dto.reason);
  }

  // Re-activates a previously suspended user account.
  @Post('users/activate')
  @HttpCode(HttpStatus.OK)
  async activateUser(@Body() dto: ActivateUserDto) {
    return this.adminService.activateUser(dto.userId);
  }

  // Deletes a user document from Firestore.
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.adminService.deleteUser(userId);
  }
}
