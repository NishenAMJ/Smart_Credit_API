import { Global, Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { RoleNotificationService } from './role-notification.service';

@Global()
@Module({
  imports: [FirebaseModule],
  providers: [RoleNotificationService],
  exports: [RoleNotificationService],
})
export class RoleNotificationModule {}
