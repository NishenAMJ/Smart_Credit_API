import { BadRequestException } from '@nestjs/common';

import type { CreateLenderAdInput } from './lender-ads.types';

export function validateCreateLenderAdInput(input: CreateLenderAdInput): void {
  if (input.headline.trim().length < 12) {
    throw new BadRequestException('headline must be at least 12 characters.');
  }

  if (
    !Number.isFinite(input.minAmount) ||
    !Number.isFinite(input.maxAmount) ||
    input.minAmount < 10_000 ||
    input.maxAmount < 10_000 ||
    input.minAmount > 5_000_000 ||
    input.maxAmount > 5_000_000
  ) {
    throw new BadRequestException(
      'Loan amounts must be between LKR 10,000 and LKR 5,000,000.',
    );
  }

  if (input.maxAmount < input.minAmount) {
    throw new BadRequestException(
      'maxAmount must be greater than or equal to minAmount.',
    );
  }

  if (
    !Number.isFinite(input.interestRate) ||
    input.interestRate <= 0 ||
    input.interestRate > 100
  ) {
    throw new BadRequestException(
      'interestRate must be greater than zero and no more than 100.',
    );
  }

  if (
    !Number.isInteger(input.tenureMonths) ||
    input.tenureMonths < 3 ||
    input.tenureMonths > 60
  ) {
    throw new BadRequestException(
      'tenureMonths must be a whole number between 3 and 60.',
    );
  }

  const minTenureMonths =
    input.minTenureMonths ?? Math.min(6, input.tenureMonths);
  if (
    !Number.isInteger(minTenureMonths) ||
    minTenureMonths < 3 ||
    minTenureMonths > input.tenureMonths
  ) {
    throw new BadRequestException(
      'minTenureMonths must be between 3 and the maximum tenure.',
    );
  }

  if (
    input.responseTimeHours !== undefined &&
    (!Number.isInteger(input.responseTimeHours) ||
      input.responseTimeHours < 1 ||
      input.responseTimeHours > 168)
  ) {
    throw new BadRequestException(
      'responseTimeHours must be a whole number between 1 and 168.',
    );
  }

  const requiredText: Array<[keyof CreateLenderAdInput, string, number]> = [
    ['borrowerFocus', input.borrowerFocus, 8],
    ['processingTime', input.processingTime, 6],
    ['repaymentStyle', input.repaymentStyle, 6],
    ['requirements', input.requirements, 12],
    ['supportNote', input.supportNote, 12],
  ];

  for (const [field, value, minimum] of requiredText) {
    if (value.trim().length < minimum) {
      throw new BadRequestException(
        `${String(field)} must be at least ${minimum} characters.`,
      );
    }
  }
}
