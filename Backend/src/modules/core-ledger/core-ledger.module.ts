import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { CoreLedgerService } from './core-ledger.service';
import { CoreLedgerController } from './core-ledger.controller';
import { GatewayModule } from '../chat/gateway/gateway.module';

@Module({
  imports: [FirebaseModule, GatewayModule],
  providers: [CoreLedgerService],
  controllers: [CoreLedgerController],
  exports: [CoreLedgerService],
})
export class CoreLedgerModule {}
