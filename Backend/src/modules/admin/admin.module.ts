import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditService } from './admin-audit.service';
import { AdminAdApprovalController } from './admin-ad_approval.controller'; // ← new
import { AdminAdApprovalService } from './admin-ad_approval.service'; // ← new
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { GatewayModule } from '../chat/gateway/gateway.module';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';

@Module({
  // Wire the admin user management and audit endpoints into the app.
  imports: [FirebaseModule, AuthModule, GatewayModule],
  controllers: [
    AdminController,
    AdminAuditController,
    AdminNotificationsController,
    AdminAdApprovalController, // ← new
  ],
  providers: [
    AdminService,
    AdminAuditService,
    AdminNotificationsService,
    AdminAdApprovalService, // ← new
  ],
})
export class AdminModule {}
