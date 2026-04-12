import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from './admin-auth/guards/admin-jwt.guard';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin/audit-logs')
@UseGuards(AdminJwtGuard)
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get()
  async getAuditLogs() {
    return this.adminAuditService.getAuditLogs();
  }
}
