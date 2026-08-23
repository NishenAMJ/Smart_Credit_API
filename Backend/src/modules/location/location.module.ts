import { Module } from '@nestjs/common';

import { FirebaseModule } from '../../firebase/firebase.module';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

@Module({
  imports: [FirebaseModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
