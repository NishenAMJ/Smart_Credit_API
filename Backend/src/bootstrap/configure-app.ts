import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { json, urlencoded } from 'express';
import { corsOriginDelegate } from './cors-origins';

function collectFieldErrors(
  errors: ValidationError[],
  parent = '',
): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((result, error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    if (messages.length) result[path] = messages;
    Object.assign(result, collectFieldErrors(error.children ?? [], path));
    return result;
  }, {});
}

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
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
      stopAtFirstError: false,
      exceptionFactory: (errors) => {
        const fieldErrors = collectFieldErrors(errors);
        return new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: Object.values(fieldErrors).flat(),
          fieldErrors,
        });
      },
    }),
  );
  app.setGlobalPrefix('api');
}
