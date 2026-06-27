import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  // Returns the latest admin-facing activity feed generated from stored records.
  @Get()
  async getAuditLogs(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.adminAuditService.getAuditLogs(limit, cursor);
  }
}
