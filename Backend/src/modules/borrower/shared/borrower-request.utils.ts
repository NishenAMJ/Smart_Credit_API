import { ForbiddenException } from '@nestjs/common';

export function resolveAuthenticatedBorrowerId(
  authenticatedUserId: string,
  requestedBorrowerId?: string,
): string {
  const requested = requestedBorrowerId?.trim();

  if (requested && requested !== authenticatedUserId) {
    throw new ForbiddenException(
      'You can only access your own borrower workspace.',
    );
  }

  return authenticatedUserId;
}
