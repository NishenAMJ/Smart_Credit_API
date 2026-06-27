import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

export function rethrowFirebaseError(
  error: unknown,
  fallbackMessage: string,
): never {
  const firebaseError = error as {
    code?: number | string;
    details?: string;
    message?: string;
  };

  const message = firebaseError?.details || firebaseError?.message || '';
  const code = firebaseError?.code;

  if (
    code === 8 ||
    code === '8' ||
    message.toLowerCase().includes('quota exceeded') ||
    message.toLowerCase().includes('resource_exhausted')
  ) {
    throw new ServiceUnavailableException(
      'Firebase quota exceeded. Please try again later.',
    );
  }

  throw new InternalServerErrorException(fallbackMessage);
}
