import { BadRequestException } from '@nestjs/common';

export type LenderDateRange = {
  value: string;
  start: Date;
  end: Date;
};

function parseCalendarDate(value: string, label: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new BadRequestException(`${label} must use the YYYY-MM-DD format.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${label} must be a valid calendar date.`);
  }

  return new Date(`${value}T00:00:00+05:30`);
}

export function parseOptionalSriLankaDayRange(
  value: string | null | undefined,
): LenderDateRange | null {
  if (!value) return null;
  return parseSriLankaDateRange(value, value);
}

export function parseSriLankaDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): LenderDateRange {
  if (!startDate || !endDate) {
    throw new BadRequestException('Start date and end date are required.');
  }

  const start = parseCalendarDate(startDate, 'Start date');
  const finalDayStart = parseCalendarDate(endDate, 'End date');

  if (start.getTime() > finalDayStart.getTime()) {
    throw new BadRequestException('Start date cannot be after end date.');
  }

  return {
    value: `${startDate}:${endDate}`,
    start,
    end: new Date(finalDayStart.getTime() + 24 * 60 * 60 * 1000),
  };
}

export function isWithinLenderDateRange(
  date: Date | null,
  range: LenderDateRange | null,
): boolean {
  if (!range) return true;
  const timestamp = date?.getTime();
  return (
    typeof timestamp === 'number' &&
    timestamp >= range.start.getTime() &&
    timestamp < range.end.getTime()
  );
}
