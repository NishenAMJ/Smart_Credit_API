import { Module } from '@nestjs/common';
import { BorrowerCoreModule } from '../core/borrower-core.module';
import { BorrowerProfileController } from './borrower-profile.controller';
import { BorrowerProfileService } from './borrower-profile.service';

@Module({
  imports: [BorrowerCoreModule],
  controllers: [BorrowerProfileController],
  providers: [BorrowerProfileService],
  exports: [BorrowerProfileService],
})
export class BorrowerProfileModule {}

