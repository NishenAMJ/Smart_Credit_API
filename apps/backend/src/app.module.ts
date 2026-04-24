import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';

import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), 'apps/backend/.env'),
        resolve(process.cwd(), '.env'),
      ],
    }),
    FirebaseModule,
    AuthModule,
  ],
})
export class AppModule {}
