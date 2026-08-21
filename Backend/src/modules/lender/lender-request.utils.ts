import { ForbiddenException } from '@nestjs/common';

export function resolveAuthenticatedLenderId(
  authenticatedUserId: string,
  requestedLenderId?: string,
): string {
  const requested = requestedLenderId?.trim();

  if (requested && requested !== authenticatedUserId) {
    throw new ForbiddenException(
      'You can only access your own lender workspace.',
    );
  }

  return authenticatedUserId;
}
