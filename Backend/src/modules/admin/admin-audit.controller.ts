import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from './admin-auth/guards/admin-jwt.guard';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin/audit-logs')
@UseGuards(AdminJwtGuard)
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  // Returns the latest admin-facing activity feed generated from stored records.
  @Get()
  async getAuditLogs(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.adminAuditService.getAuditLogs(limit, cursor);
  }
}
