import { Module } from '@nestjs/common';
import { BorrowerController } from './borrower.controller';
import { BorrowerService } from './borrower.service';
import { FirebaseModule } from '../../firebase/firebase.module';

/**
 * Registers borrower HTTP routes and business services.
 */
@Module({
  imports: [FirebaseModule],
  controllers: [BorrowerController],
  providers: [BorrowerService],
  exports: [BorrowerService],
})
export class BorrowerModule {}
