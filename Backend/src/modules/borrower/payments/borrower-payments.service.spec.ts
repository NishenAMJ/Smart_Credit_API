import { BorrowerPaymentsService } from './borrower-payments.service';
import { RepaymentMethod } from '../applications/dto/loan-application.dto';
import { BorrowerService } from '../core/borrower.service';

type BorrowerPaymentsServiceMock = jest.Mocked<
  Pick<BorrowerService, 'makeRepayment' | 'generateQrToken' | 'verifyQrToken'>
>;

describe('BorrowerPaymentsService', () => {
  let borrowerService: BorrowerPaymentsServiceMock;
  let service: BorrowerPaymentsService;

  beforeEach(() => {
    borrowerService = {
      makeRepayment: jest.fn(),
      generateQrToken: jest.fn(),
      verifyQrToken: jest.fn(),
    };
    service = new BorrowerPaymentsService(
      borrowerService as unknown as BorrowerService,
    );
  });

  it('should delegate payment creation with default QR method', () => {
    borrowerService.makeRepayment.mockReturnValueOnce({ repaymentId: 'r1' });

    expect(
      service.makePayment({
        loanId: 'loan-1',
        borrowerId: 'borrower-1',
        amount: 1000,
      }),
    ).toEqual({ repaymentId: 'r1' });
    expect(borrowerService.makeRepayment).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan-1',
        borrowerId: 'borrower-1',
        amount: 1000,
        paymentMethod: RepaymentMethod.QR_PAYMENT,
      }),
    );
  });

  it('delegates the private receipt document reference for bank transfers', () => {
    borrowerService.makeRepayment.mockReturnValueOnce({ repaymentId: 'r2' });

    service.makePayment({
      loanId: 'loan-1',
      borrowerId: 'borrower-1',
      amount: 1000,
      paymentMethod: RepaymentMethod.BANK_TRANSFER,
      receiptDocumentId: 'receipt-1',
    });

    expect(borrowerService.makeRepayment).toHaveBeenCalledWith(
      expect.objectContaining({ receiptDocumentId: 'receipt-1' }),
    );
  });
});
