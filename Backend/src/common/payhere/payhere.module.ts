import { Global, Module } from '@nestjs/common';
import { PayHereService } from './payhere.service';

@Global()
@Module({
  providers: [PayHereService],
  exports: [PayHereService],
})
export class PayHereModule {}
