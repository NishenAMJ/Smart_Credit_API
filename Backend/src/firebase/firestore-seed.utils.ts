// Dummy implementation for firestore-seed.utils
export const getAdStatus = (data: any): string => data?.status || 'active';
export const computeLoanRemainingAmount = (db: any, loanId: string, data: any) => {
  if (typeof data?.amount === 'number') {
    return data.amount - (typeof data?.paid === 'number' ? data.paid : 0);
  }
  return 0;
};
export const getLoanAmount = (loan: any) => (typeof loan?.amount === 'number' ? loan.amount : 0);
export const getLoanCreatedAt = (loan: any) => loan?.createdAt ?? null;
export const getPaymentAmount = (payment: any) => (typeof payment?.amount === 'number' ? payment.amount : 0);
export const getPaymentCreatedAt = (payment: any) => payment?.createdAt ?? null;
export const isActiveAd = (data: any, now: any) => data?.status === 'active';
export const getNormalizedInstallment = (installment: any) => installment;
export const getInstallmentAmount = (installment: any) => (typeof installment?.amount === 'number' ? installment.amount : 0);
export const getPaymentAncestorData = (payment: any) => payment?.ancestorData || {};