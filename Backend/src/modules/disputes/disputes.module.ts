import { Module } from '@nestjs/common';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../admin/admin-auth/auth.module';

@Module({
  imports: [FirebaseModule, AuthModule],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
