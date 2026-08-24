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
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
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

  // ADMIN: View user statistics - controller
  @Get('users/stats')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  // ADMIN: Manage users - controller
  @Get('users')
  async getAllUsers(
    @Query() query: QueryUsersDto,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getAllUsers(query, limit, cursor);
  }

  // ADMIN: View user details - controller
  @Get('users/:userId')
  async getUserById(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  // ADMIN: Suspend user - controller
  @Post('users/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Body() dto: SuspendUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.suspendUser(dto.userId, dto.reason, req.user.sub);
  }

  // ADMIN: Activate user - controller
  @Post('users/activate')
  @HttpCode(HttpStatus.OK)
  async activateUser(
    @Body() dto: ActivateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.activateUser(dto.userId, req.user.sub);
  }

  // Deletes a user document from Firestore.
  @Delete('users/:userId')
  async deleteUser(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.deleteUser(userId, req.user.sub);
  }
}
