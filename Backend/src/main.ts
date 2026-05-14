import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // ✅ Allow requests from mobile app
  app.enableCors();

  // Request logger
  app.use((req: any, res: any, next: any) => {
    console.log('➡️ Incoming Request:', req.method, req.url);
    next();
  });

  // ✅ Listen on 0.0.0.0 so physical devices on same WiFi can connect
  // 'localhost' only accepts connections from the same machine
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  console.log(`🚀 Backend running at http://192.168.120.219:3000/api`);
}
bootstrap();