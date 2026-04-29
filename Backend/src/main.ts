import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // 🔥 REQUEST LOGGER MIDDLEWARE (ADD THIS)
  app.use((req, res, next) => {
    console.log('➡️ Incoming Request:', req.method, req.url);
    next();
  });

  

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

