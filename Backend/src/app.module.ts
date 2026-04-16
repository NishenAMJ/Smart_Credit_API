import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Load .env file globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // make sure .env is in backend root
    }),
    // Our Firebase connection
    FirebaseModule,
    // Dashboard feature
    DashboardModule,
  ],
  controllers: [], // We can remove AppController if not needed
  providers: [], // We can remove AppService if not needed
})
export class AppModule {}
