import { Module } from '@nestjs/common';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthModule } from '../auth/auth.module';
import { GatewayModule } from '../chat/gateway/gateway.module';
import { ParticipantDisputesController } from './participant-disputes.controller';

@Module({
  imports: [FirebaseModule, AuthModule, GatewayModule],
  controllers: [DisputesController, ParticipantDisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
