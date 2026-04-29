import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}

//providers- Registers FirebaseService so NestJS can create and inject it.
//exports- Allows other modules to use FirebaseService.