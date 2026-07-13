export function isCollectedRepayment(type: string, status: string): boolean {
  const normalizedType = type.trim().toLowerCase();
  const normalizedStatus = status.trim().toLowerCase();
  const uncollectedStatuses = new Set([
    'pending',
    'pending_verification',
    'verification_pending',
    'receipt_required',
  ]);

  if (uncollectedStatuses.has(normalizedStatus)) return false;

  if (
    normalizedType.includes('repay') ||
    normalizedType.includes('payment') ||
    normalizedType === 'paid'
  ) {
    return true;
  }

  return ['paid', 'completed', 'success', 'successful'].includes(
    normalizedStatus,
  );
}
