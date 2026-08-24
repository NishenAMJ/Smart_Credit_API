import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { RegisterDto } from '../auth/dto/register.dto';
import { CompleteUploadDto } from '../documents/dto/documents.dto';
import { CreateLoanApplicationRequestDto } from './applications/dto/loan-application.dto';

describe('Borrower request validation', () => {
  it('requires explicit versioned terms consent for borrower registration', () => {
    const dto = plainToInstance(RegisterDto, {
      fullName: 'Nimal Perera',
      email: 'nimal@example.test',
      phone: '+94771234567',
      address: {
        line1: '10 Main Street',
        city: 'Colombo',
        district: 'Colombo',
        province: 'Western',
      },
      password: 'Password123!',
      role: 'borrower',
    });

    const messages = validateSync(dto)
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join(' ');

    expect(messages).toContain('accept the registration terms');
  });

  it('rejects non-image payment receipt metadata', () => {
    const dto = plainToInstance(CompleteUploadDto, {
      publicId: 'documents/borrower-1/payment_receipt/receipt-1',
      assetId: 'asset-1',
      resourceType: 'raw',
      deliveryType: 'authenticated',
      bytes: 1024,
      version: 1,
      secureUrl: 'https://example.test/receipt.pdf',
      fileHash: 'receipt-hash',
      originalFilename: 'receipt.pdf',
      mimeType: 'text/plain',
      category: 'payment_receipt',
      documentType: 'bank_transfer_receipt',
      relatedEntityType: 'loan',
      relatedEntityId: 'loan-1',
    });

    expect(validateSync(dto)).not.toHaveLength(0);
  });

  it('rejects invalid structured loan application financial fields', () => {
    const dto = plainToInstance(CreateLoanApplicationRequestDto, {
      adId: 'listing-1',
      amount: 50_000,
      purpose: 'business',
      tenureMonths: 12,
      employmentStatus: 'employed',
      monthlyIncome: Number.NaN,
      preferredInterestRate: -1,
    });

    const invalidProperties = validateSync(dto).map((error) => error.property);
    expect(invalidProperties).toEqual(
      expect.arrayContaining(['monthlyIncome', 'preferredInterestRate']),
    );
  });
});
