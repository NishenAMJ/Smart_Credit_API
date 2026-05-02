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
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ActivateUserDto } from './dto/activate-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('users/stats')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('users')
  async getUsers(
    @Query() query: QueryUsersDto,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getUsers({ ...query, limit, cursor });
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

  @Get('kyc/pending')
  async getPendingKyc(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminService.getPendingKyc({ limit, cursor });
  }

  @Post('kyc/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveKyc(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateKycStatus(id, { status: 'approved', reviewNotes: body.notes }, req.user.sub);
  }

  @Post('kyc/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectKyc(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateKycStatus(id, { status: 'rejected', reviewNotes: body.reason }, req.user.sub);
  }
}
