import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

export function configureApp(app: INestApplication): void {
  app.use(json({ limit: '60mb' }));
  app.use(urlencoded({ limit: '60mb', extended: true }));
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: false,
      stopAtFirstError: false,
    }),
  );
  app.setGlobalPrefix('api');
}
