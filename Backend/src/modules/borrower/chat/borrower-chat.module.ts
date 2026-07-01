import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../../firebase/firebase.module';
import { BorrowerChatController } from './borrower-chat.controller';
import { BorrowerChatService } from './borrower-chat.service';

@Module({
  imports: [FirebaseModule],
  controllers: [BorrowerChatController],
  providers: [BorrowerChatService],
  exports: [BorrowerChatService],
})
export class BorrowerChatModule {}
