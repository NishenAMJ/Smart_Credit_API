import { BadRequestException } from '@nestjs/common';

export function resolveBorrowerId(borrowerId?: string): string {
  const trimmed = borrowerId?.trim();

  if (!trimmed) {
    throw new BadRequestException(
      'Borrower identification is required for this operation.',
    );
  }

  return trimmed;
}
