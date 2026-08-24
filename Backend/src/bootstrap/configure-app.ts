import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { corsOriginDelegate } from './cors-origins';

export function configureApp(app: INestApplication): void {
  app.use(
    '/api/borrower/payments/payhere/notify',
    urlencoded({ limit: '32kb', extended: false }),
  );
  app.use(
    '/api/lender-ad-boosts/payhere/notify',
    urlencoded({ limit: '32kb', extended: false }),
  );
  app.use(json({ limit: '60mb' }));
  app.use(urlencoded({ limit: '60mb', extended: true }));
  app.enableCors({
    origin: corsOriginDelegate,
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
