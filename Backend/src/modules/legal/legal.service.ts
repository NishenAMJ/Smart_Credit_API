import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import { Timestamp, type CollectionReference } from 'firebase-admin/firestore';
import puppeteer from 'puppeteer';

import { installmentIdFor } from '../../common/firestore/schema';
import { FirebaseService } from '../../firebase/firebase.service';
import type { UserRole, UserDocument } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { DocumentsService } from '../documents/documents.service';
import { MediaService } from '../media/media.service';
import type {
  AcceptLegalDocumentResponseDto,
  LegalDocumentDto,
  ListLegalDocumentsResponseDto,
} from './dto/legal-document.dto';
import {
  agreementAcceptanceIdFor,
  buildAgreementHtml,
  buildLoanAgreement,
  disbursementTransactionIdFor,
  loanAgreementIdFor,
} from './loan-agreement.builder';
import type {
  AcceptLoanAgreementInput,
  LoanAgreementAcceptanceDocument,
  LoanAgreementDocument,
  LoanAgreementParty,
  LoanAgreementTerms,
} from './legal.types';

type CanonicalLoanRecord = {
  loanId: string;
  applicationId: string;
  listingId: string;
  borrowerId: string;
  lenderId: string;
  termsVersion: number;
  terms: LoanAgreementTerms;
};

@Injectable()
export class LegalService {
  private readonly agreements: CollectionReference<LoanAgreementDocument>;
  private readonly acceptances: CollectionReference<LoanAgreementAcceptanceDocument>;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly authService: AuthService,
    private readonly mediaService: MediaService,
    private readonly documentsService: DocumentsService,
    private readonly configService: ConfigService,
  ) {
    this.agreements = this.firebaseService.db.collection(
      'loanAgreements',
    ) as CollectionReference<LoanAgreementDocument>;
    this.acceptances = this.firebaseService.db.collection(
      'loanAgreementAcceptances',
    ) as CollectionReference<LoanAgreementAcceptanceDocument>;
  }

  async generateLoanAgreement(
    loanId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<LegalDocumentDto> {
    if (userRole !== 'lender') {
      throw new ForbiddenException(
        'Only the lender on a loan can generate an agreement.',
      );
    }

    const loan = await this.getCanonicalLoan(loanId);
    this.assertLoanAccess(loan, userId, userRole);
    const [borrower, lender, existing] = await Promise.all([
      this.authService.getUserById(loan.borrowerId),
      this.authService.getUserById(loan.lenderId),
      this.getLatestLoanAgreementRecord(loanId),
    ]);
    const nextVersion = existing?.version ?? loan.termsVersion ?? 1;
    const agreementId = loanAgreementIdFor(loanId, nextVersion);
    const candidate = buildLoanAgreement({
      agreementId,
      loanId,
      applicationId: loan.applicationId,
      listingId: loan.listingId,
      version: nextVersion,
      borrower: this.toParty(borrower, 'borrower'),
      lender: this.toParty(lender, 'lender'),
      terms: loan.terms,
      generatedByUserId: userId,
      generatedByRole: userRole,
      now: Timestamp.now(),
    });

    if (existing?.termsHash === candidate.termsHash) {
      return this.toDto(existing);
    }

    const version = existing ? existing.version + 1 : nextVersion;
    const next = buildLoanAgreement({
      ...candidate,
      agreementId: loanAgreementIdFor(loanId, version),
      version,
      now: Timestamp.now(),
    });

    await this.firebaseService.db.runTransaction(async (transaction) => {
      if (existing) {
        transaction.update(this.agreements.doc(existing.agreementId), {
          status: 'superseded',
          updatedAt: Timestamp.now(),
        });
      }
      transaction.set(this.agreements.doc(next.agreementId), next);
      transaction.update(
        this.firebaseService.db.collection('loans').doc(loanId),
        {
          currentAgreementId: next.agreementId,
          agreementStatus: next.status,
          termsVersion: version,
          updatedAt: Timestamp.now(),
        },
      );
    });

    return this.toDto(next);
  }

  async getDocumentById(
    agreementId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<LegalDocumentDto> {
    const agreement = await this.getAgreementRecord(agreementId);
    this.assertAgreementAccess(agreement, userId, userRole);
    return this.toDto(agreement);
  }

  async getLatestLoanDocument(
    loanId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<LegalDocumentDto | null> {
    const loan = await this.getCanonicalLoan(loanId);
    this.assertLoanAccess(loan, userId, userRole);
    const agreement = await this.getLatestLoanAgreementRecord(loanId);
    return agreement ? this.toDto(agreement) : null;
  }

  async listDocuments(
    userId: string,
    userRole: UserRole,
    options: { pageSize?: number; cursor?: string; status?: string } = {},
  ): Promise<ListLegalDocumentsResponseDto> {
    const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 50);
    let query: FirebaseFirestore.Query<LoanAgreementDocument> = this.agreements;

    if (userRole === 'borrower') {
      query = query.where('borrowerId', '==', userId);
    } else if (userRole === 'lender') {
      query = query.where('lenderId', '==', userId);
    }
    if (options.status) {
      query = query.where('status', '==', options.status);
    }
    query = query.orderBy('updatedAt', 'desc');

    if (options.cursor) {
      const cursor = await this.agreements.doc(options.cursor).get();
      if (cursor.exists) {
        query = query.startAfter(cursor);
      }
    }

    const snapshot = await query.limit(pageSize + 1).get();
    const pageDocs = snapshot.docs.slice(0, pageSize);
    return {
      documents: pageDocs.map((doc) => this.toDto(doc.data())),
      pageInfo: {
        hasMore: snapshot.size > pageSize,
        nextCursor:
          snapshot.size > pageSize
            ? (pageDocs[pageDocs.length - 1]?.id ?? null)
            : null,
      },
    };
  }

  async acceptDocument(
    agreementId: string,
    userId: string,
    userRole: UserRole,
    input: AcceptLoanAgreementInput,
  ): Promise<AcceptLegalDocumentResponseDto> {
    if (userRole === 'admin') {
      throw new ForbiddenException(
        'Admins can review agreements but cannot sign for either party.',
      );
    }
    if (userRole !== 'borrower' && userRole !== 'lender') {
      throw new ForbiddenException('Only a borrower or lender can sign.');
    }
    this.validateAcceptanceInput(input);

    const agreementRef = this.agreements.doc(agreementId);
    const acceptanceRef = this.acceptances.doc(
      agreementAcceptanceIdFor(agreementId, userRole),
    );
    const auditSalt = this.getAuditSalt();

    const acceptedAgreement = await this.firebaseService.db.runTransaction(
      async (transaction) => {
        const [agreementSnapshot, acceptanceSnapshot] = await Promise.all([
          transaction.get(agreementRef),
          transaction.get(acceptanceRef),
        ]);
        if (!agreementSnapshot.exists) {
          throw new NotFoundException('Loan agreement not found.');
        }

        const agreement = agreementSnapshot.data() as LoanAgreementDocument;
        this.assertAgreementAccess(agreement, userId, userRole);
        if (agreement.legacyReadOnly) {
          throw new ConflictException('Migrated legacy agreements are read-only.');
        }
        if (['superseded', 'cancelled'].includes(agreement.status)) {
          throw new ConflictException(
            `An agreement in ${agreement.status} state cannot be signed.`,
          );
        }
        if (userRole === 'borrower' && !agreement.lenderAcceptance.accepted) {
          throw new ConflictException(
            'The lender must sign this agreement before the borrower can sign.',
          );
        }
        if (
          input.agreementVersion !== agreement.version ||
          input.termsHash !== agreement.termsHash
        ) {
          throw new ConflictException(
            'The agreement terms changed. Reload the latest version before signing.',
          );
        }

        if (acceptanceSnapshot.exists) {
          const prior =
            acceptanceSnapshot.data() as LoanAgreementAcceptanceDocument;
          if (
            prior.userId !== userId ||
            prior.termsHash !== input.termsHash ||
            prior.agreementVersion !== input.agreementVersion
          ) {
            throw new ConflictException(
              'A different acceptance already exists for this agreement role.',
            );
          }
          return agreement;
        }

        const now = Timestamp.now();
        const acceptance: LoanAgreementAcceptanceDocument = {
          acceptanceId: acceptanceRef.id,
          agreementId,
          loanId: agreement.loanId,
          userId,
          role: userRole,
          agreementVersion: agreement.version,
          termsHash: agreement.termsHash,
          signedName: input.signedName.trim(),
          consentAccepted: true,
          consentTextVersion: agreement.consentTextVersion,
          ipAddressHash: input.ipAddress
            ? createHmac('sha256', auditSalt)
                .update(input.ipAddress)
                .digest('hex')
            : null,
          userAgent: input.userAgent?.slice(0, 500) || null,
          acceptedAt: now,
        };
        const merged: LoanAgreementDocument = {
          ...agreement,
          borrowerAcceptance:
            userRole === 'borrower'
              ? {
                  accepted: true,
                  signedName: acceptance.signedName,
                  acceptedAt: now,
                }
              : agreement.borrowerAcceptance,
          lenderAcceptance:
            userRole === 'lender'
              ? {
                  accepted: true,
                  signedName: acceptance.signedName,
                  acceptedAt: now,
                }
              : agreement.lenderAcceptance,
          updatedAt: now,
          finalizationError: null,
        };
        const bothAccepted =
          merged.borrowerAcceptance.accepted &&
          merged.lenderAcceptance.accepted;
        merged.status = bothAccepted ? 'finalizing' : 'partially_accepted';
        merged.finalizationStartedAt = bothAccepted ? now : null;
        merged.bodyHtml = buildAgreementHtml(merged);

        transaction.create(acceptanceRef, acceptance);
        transaction.update(agreementRef, {
          borrowerAcceptance: merged.borrowerAcceptance,
          lenderAcceptance: merged.lenderAcceptance,
          status: merged.status,
          bodyHtml: merged.bodyHtml,
          updatedAt: now,
          finalizationStartedAt: merged.finalizationStartedAt,
          finalizationError: null,
        });
        return merged;
      },
    );

    const bothAccepted =
      acceptedAgreement.borrowerAcceptance.accepted &&
      acceptedAgreement.lenderAcceptance.accepted;
    if (!bothAccepted || acceptedAgreement.status === 'fully_accepted') {
      return {
        message:
          userRole === 'lender'
            ? 'Lender signature recorded. The agreement is waiting for the borrower.'
            : 'Loan agreement acceptance recorded.',
        document: this.toDto(acceptedAgreement),
      };
    }

    try {
      const finalized = await this.finalizeAgreementRecord(agreementId);
      return {
        message:
          'The lender and borrower signed in sequence. The loan is now active.',
        document: this.toDto(finalized),
      };
    } catch {
      const failed = await this.markFinalizationFailed(agreementId);
      return {
        message:
          'Both signatures were saved, but PDF finalization failed. Retry is available.',
        document: this.toDto(failed),
      };
    }
  }

  async retryFinalization(
    agreementId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<AcceptLegalDocumentResponseDto> {
    const agreement = await this.getAgreementRecord(agreementId);
    this.assertAgreementAccess(agreement, userId, userRole);
    if (userRole === 'admin') {
      throw new ForbiddenException('Admins cannot finalize party agreements.');
    }
    if (
      !agreement.borrowerAcceptance.accepted ||
      !agreement.lenderAcceptance.accepted
    ) {
      throw new ConflictException('Both signatures are required first.');
    }
    const finalized = await this.finalizeAgreementRecord(agreementId);
    return {
      message: 'Agreement finalization completed.',
      document: this.toDto(finalized),
    };
  }

  async downloadDocumentPdf(
    agreementId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const agreement = await this.getAgreementRecord(agreementId);
    this.assertAgreementAccess(agreement, userId, userRole);

    if (agreement.signedPdfDocumentId) {
      const documentRecord = await this.documentsService.getById(
        agreement.signedPdfDocumentId,
      );
      if (documentRecord && documentRecord.status !== 'deleted') {
        const url = this.mediaService.generateSignedDeliveryUrl({
          publicId: documentRecord.cloudinaryPublicId,
          resourceType: documentRecord.cloudinaryResourceType,
          deliveryType: documentRecord.cloudinaryDeliveryType,
          version: documentRecord.cloudinaryVersion,
          format: documentRecord.format,
        });
        const response = await fetch(url);
        if (!response.ok) {
          throw new ServiceUnavailableException(
            'The signed agreement PDF is temporarily unavailable.',
          );
        }
        return {
          buffer: Buffer.from(await response.arrayBuffer()),
          fileName: this.buildPdfFileName(agreement),
        };
      }
    }

    return {
      buffer: await this.buildAgreementPdf(agreement),
      fileName: this.buildPdfFileName(agreement),
    };
  }

  private async finalizeAgreementRecord(
    agreementId: string,
  ): Promise<LoanAgreementDocument> {
    const agreementRef = this.agreements.doc(agreementId);
    let agreement = await this.getAgreementRecord(agreementId);
    if (agreement.status === 'fully_accepted') {
      return agreement;
    }
    if (
      !agreement.borrowerAcceptance.accepted ||
      !agreement.lenderAcceptance.accepted
    ) {
      throw new ConflictException('Both signatures are required first.');
    }

    const startedAt = Timestamp.now();
    agreement = {
      ...agreement,
      status: 'finalizing',
      finalizationStartedAt: startedAt,
      finalizationError: null,
      updatedAt: startedAt,
    };
    agreement.bodyHtml = buildAgreementHtml(agreement);
    await agreementRef.update({
      status: agreement.status,
      finalizationStartedAt: startedAt,
      finalizationError: null,
      bodyHtml: agreement.bodyHtml,
      updatedAt: startedAt,
    });

    const buffer = await this.buildAgreementPdf(agreement);
    const pdfHash = createHash('sha256').update(buffer).digest('hex');
    const pdfDocumentId = `agreement_pdf_${agreementId}`;
    const uploaded = await this.mediaService.uploadBufferAsDocument(buffer, {
      folder: `documents/loan-agreements/${agreement.loanId}/v${String(
        agreement.version,
      ).padStart(3, '0')}`,
      publicId: 'signed-agreement',
      resourceType: 'raw',
      deliveryType: 'authenticated',
      overwrite: true,
    });
    await this.documentsService.createSystemGeneratedRecord({
      id: pdfDocumentId,
      userId: agreement.lenderId,
      category: 'agreement',
      documentType: 'loan_agreement_pdf',
      originalFilename: this.buildPdfFileName(agreement),
      mimeType: 'application/pdf',
      fileHash: pdfHash,
      relatedEntityType: 'loan_agreement',
      relatedEntityId: agreementId,
      displayName: `Signed Loan Agreement - ${agreement.loanId}`,
      uploadedMedia: uploaded,
    });

    const db = this.firebaseService.db;
    const loanRef = db.collection('loans').doc(agreement.loanId);
    const ledgerRef = db
      .collection('transactions')
      .doc(disbursementTransactionIdFor(agreement.loanId));
    await db.runTransaction(async (transaction) => {
      const [currentAgreementSnapshot, loanSnapshot, ledgerSnapshot] =
        await Promise.all([
          transaction.get(agreementRef),
          transaction.get(loanRef),
          transaction.get(ledgerRef),
        ]);
      if (!currentAgreementSnapshot.exists || !loanSnapshot.exists) {
        throw new NotFoundException('Agreement or loan no longer exists.');
      }
      const currentAgreement =
        currentAgreementSnapshot.data() as LoanAgreementDocument;
      const loan = loanSnapshot.data() ?? {};
      if (currentAgreement.status === 'fully_accepted' && ledgerSnapshot.exists) {
        return;
      }
      if (!['pending_disbursement', 'active'].includes(String(loan.status))) {
        throw new ConflictException(
          `Loan in ${String(loan.status)} state cannot be activated.`,
        );
      }

      const activatedAt = Timestamp.now();
      const firstDueDate = this.addMonths(activatedAt.toDate(), 1);
      if (!ledgerSnapshot.exists) {
        for (
          let sequence = 1;
          sequence <= currentAgreement.terms.tenureMonths;
          sequence += 1
        ) {
          const installmentId = installmentIdFor(sequence);
          const amountDueMinor =
            sequence === currentAgreement.terms.tenureMonths
              ? currentAgreement.terms.totalRepayableMinor -
                currentAgreement.terms.monthlyInstallmentMinor *
                  (currentAgreement.terms.tenureMonths - 1)
              : currentAgreement.terms.monthlyInstallmentMinor;
          transaction.create(
            loanRef.collection('installments').doc(installmentId),
            {
              installmentId,
              loanId: agreement.loanId,
              lenderId: agreement.lenderId,
              borrowerId: agreement.borrowerId,
              sequence,
              currency: 'LKR',
              amountDueMinor,
              status: 'scheduled',
              dueAt: Timestamp.fromDate(
                this.addMonths(firstDueDate, sequence - 1),
              ),
              paidTransactionId: null,
              paidAt: null,
              note: null,
              createdAt: activatedAt,
              updatedAt: activatedAt,
            },
          );
        }
        transaction.create(ledgerRef, {
          transactionId: ledgerRef.id,
          type: 'disbursement',
          status: 'completed',
          currency: 'LKR',
          amountMinor: currentAgreement.terms.principalMinor,
          lenderId: agreement.lenderId,
          borrowerId: agreement.borrowerId,
          loanId: agreement.loanId,
          installmentId: null,
          listingId: agreement.listingId,
          paymentMethod: 'system',
          externalReference: null,
          idempotencyKey: ledgerRef.id,
          receiptDocumentId: pdfDocumentId,
          note:
            'Disbursement bookkeeping recorded after lender-first and borrower-second signatures. Smart Credit does not execute or independently verify the external transfer.',
          initiatedByUserId: agreement.lenderId,
          completedAt: activatedAt,
          createdAt: activatedAt,
        });
      }

      transaction.update(loanRef, {
        status: 'active',
        agreementStatus: 'fully_accepted',
        currentAgreementId: agreementId,
        disbursedAt: activatedAt,
        firstPaymentDueAt: Timestamp.fromDate(firstDueDate),
        maturityDate: Timestamp.fromDate(
          this.addMonths(
            firstDueDate,
            currentAgreement.terms.tenureMonths - 1,
          ),
        ),
        signedPdfHash: pdfHash,
        signedPdfAt: activatedAt,
        updatedAt: activatedAt,
      });
      transaction.update(agreementRef, {
        status: 'fully_accepted',
        signedPdfDocumentId: pdfDocumentId,
        signedPdfGeneratedAt: activatedAt,
        pdfSha256Hash: pdfHash,
        finalizedAt: activatedAt,
        finalizationError: null,
        updatedAt: activatedAt,
      });
    });

    return this.getAgreementRecord(agreementId);
  }

  private async markFinalizationFailed(
    agreementId: string,
  ): Promise<LoanAgreementDocument> {
    const now = Timestamp.now();
    await this.agreements.doc(agreementId).update({
      status: 'finalization_failed',
      finalizationError: 'PDF finalization failed. Retry is available.',
      updatedAt: now,
    });
    return this.getAgreementRecord(agreementId);
  }

  private async getAgreementRecord(
    agreementId: string,
  ): Promise<LoanAgreementDocument> {
    const snapshot = await this.agreements.doc(agreementId).get();
    if (!snapshot.exists) {
      throw new NotFoundException('Loan agreement not found.');
    }
    return snapshot.data() as LoanAgreementDocument;
  }

  private async getLatestLoanAgreementRecord(
    loanId: string,
  ): Promise<LoanAgreementDocument | null> {
    const snapshot = await this.agreements
      .where('loanId', '==', loanId)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    return snapshot.empty
      ? null
      : (snapshot.docs[0].data() as LoanAgreementDocument);
  }

  private async getCanonicalLoan(loanId: string): Promise<CanonicalLoanRecord> {
    const snapshot = await this.firebaseService.db
      .collection('loans')
      .doc(loanId)
      .get();
    if (!snapshot.exists) {
      throw new NotFoundException('Loan not found.');
    }
    const data = snapshot.data() ?? {};
    const principalMinor = this.readInteger(
      data.principalMinor,
      Math.round(this.readNumber(data.amount ?? data.principalAmount) * 100),
    );
    const annualInterestRate = this.readNumber(
      data.annualInterestRate ?? data.interestRate,
    );
    const tenureMonths = this.readInteger(
      data.tenureMonths ?? data.durationMonths,
    );
    const interestAmountMinor = this.readInteger(
      data.interestAmountMinor,
      Math.round(
        principalMinor * (annualInterestRate / 100) * (tenureMonths / 12),
      ),
    );
    const totalRepayableMinor = this.readInteger(
      data.totalRepayableMinor,
      principalMinor + interestAmountMinor,
    );
    const monthlyInstallmentMinor = this.readInteger(
      data.monthlyInstallmentMinor,
      tenureMonths > 0 ? Math.floor(totalRepayableMinor / tenureMonths) : 0,
    );
    if (!principalMinor || !tenureMonths) {
      throw new BadRequestException(
        'Loan financial terms are incomplete and cannot generate an agreement.',
      );
    }
    return {
      loanId,
      applicationId: this.readString(data.applicationId),
      listingId: this.readString(data.listingId ?? data.adId),
      borrowerId: this.readString(data.borrowerId),
      lenderId: this.readString(data.lenderId),
      termsVersion: this.readInteger(data.termsVersion, 1),
      terms: {
        currency: 'LKR',
        principalMinor,
        annualInterestRate,
        interestAmountMinor,
        totalRepayableMinor,
        monthlyInstallmentMinor,
        tenureMonths,
        repaymentFrequency: 'monthly',
        repaymentStartRule: 'one_month_after_activation',
      },
    };
  }

  private assertLoanAccess(
    loan: Pick<CanonicalLoanRecord, 'borrowerId' | 'lenderId'>,
    userId: string,
    role: UserRole,
  ): void {
    if (role === 'admin') return;
    if (role === 'borrower' && loan.borrowerId === userId) return;
    if (role === 'lender' && loan.lenderId === userId) return;
    throw new ForbiddenException('You do not have access to this loan.');
  }

  private assertAgreementAccess(
    agreement: LoanAgreementDocument,
    userId: string,
    role: UserRole,
  ): void {
    this.assertLoanAccess(agreement, userId, role);
  }

  private validateAcceptanceInput(input: AcceptLoanAgreementInput): void {
    if (!input.signedName?.trim()) {
      throw new BadRequestException('Signed legal name is required.');
    }
    if (input.signedName.trim().length > 160) {
      throw new BadRequestException('Signed legal name is too long.');
    }
    if (input.consentAccepted !== true) {
      throw new BadRequestException('Explicit agreement consent is required.');
    }
    if (!Number.isInteger(input.agreementVersion) || input.agreementVersion < 1) {
      throw new BadRequestException('A valid agreement version is required.');
    }
    if (!/^[a-f0-9]{64}$/.test(input.termsHash ?? '')) {
      throw new BadRequestException('A valid agreement terms hash is required.');
    }
  }

  private getAuditSalt(): string {
    const salt = this.configService.get<string>('LEGAL_AUDIT_HASH_SALT')?.trim();
    if (!salt || salt.length < 32) {
      throw new ServiceUnavailableException(
        'Agreement audit hashing is not configured.',
      );
    }
    return salt;
  }

  private toParty(
    user: UserDocument,
    role: 'borrower' | 'lender',
  ): LoanAgreementParty {
    return {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role,
    };
  }

  private toDto(agreement: LoanAgreementDocument): LegalDocumentDto {
    return {
      id: agreement.agreementId,
      loanId: agreement.loanId,
      applicationId: agreement.applicationId,
      listingId: agreement.listingId,
      version: agreement.version,
      title: agreement.title,
      summary: agreement.summary,
      documentType: 'loan_agreement',
      status: agreement.status,
      generatedByUserId: agreement.generatedByUserId,
      generatedByRole: agreement.generatedByRole,
      generatedAt: agreement.generatedAt.toDate().toISOString(),
      updatedAt: agreement.updatedAt.toDate().toISOString(),
      borrower: agreement.borrower,
      lender: agreement.lender,
      terms: agreement.terms,
      htmlContent: agreement.bodyHtml,
      termsHash: agreement.termsHash,
      consentTextVersion: agreement.consentTextVersion,
      borrowerAcceptance: this.toAcceptanceDto(agreement.borrowerAcceptance),
      lenderAcceptance: this.toAcceptanceDto(agreement.lenderAcceptance),
      pdfDownloadPath: `/api/legal/documents/${agreement.agreementId}/download`,
      pdfAvailable: Boolean(agreement.signedPdfDocumentId),
      signedPdfGeneratedAt:
        agreement.signedPdfGeneratedAt?.toDate().toISOString() ?? null,
      pdfSha256Hash: agreement.pdfSha256Hash,
      legacyReadOnly: Boolean(agreement.legacyReadOnly),
    };
  }

  private toAcceptanceDto(
    acceptance: LoanAgreementDocument['borrowerAcceptance'],
  ) {
    return {
      accepted: acceptance.accepted,
      signedName: acceptance.signedName,
      acceptedAt: acceptance.acceptedAt?.toDate().toISOString() ?? null,
    };
  }

  private async buildAgreementPdf(
    agreement: LoanAgreementDocument,
  ): Promise<Buffer> {
    if (process.env.JEST_WORKER_ID) {
      return this.buildFallbackPdf(agreement);
    }
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(agreement.bodyHtml, {
          waitUntil: 'domcontentloaded',
        });
        return Buffer.from(
          await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
          }),
        );
      } finally {
        await browser.close();
      }
    } catch {
      return this.buildFallbackPdf(agreement);
    }
  }

  private buildFallbackPdf(agreement: LoanAgreementDocument): Buffer {
    return this.createSimplePdfBuffer([
      'Smart Credit Loan Agreement',
      `Agreement: ${agreement.agreementId}`,
      `Version: ${agreement.version}`,
      `Borrower: ${agreement.borrower.fullName}`,
      `Lender: ${agreement.lender.fullName}`,
      `Principal minor units: ${agreement.terms.principalMinor}`,
      `Annual interest: ${agreement.terms.annualInterestRate}%`,
      `Total repayable minor units: ${agreement.terms.totalRepayableMinor}`,
      `Tenure: ${agreement.terms.tenureMonths} months`,
      `Borrower signature: ${agreement.borrowerAcceptance.signedName ?? 'Pending'}`,
      `Lender signature: ${agreement.lenderAcceptance.signedName ?? 'Pending'}`,
      `Terms hash: ${agreement.termsHash}`,
    ]);
  }

  private buildPdfFileName(agreement: LoanAgreementDocument): string {
    return `smart-credit-loan-agreement-${agreement.loanId}-v${agreement.version}.pdf`;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private readNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  private readInteger(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isSafeInteger(value)
      ? value
      : fallback;
  }

  private createSimplePdfBuffer(lines: string[]): Buffer {
    const contentCommands = [
      'BT',
      '/F1 11 Tf',
      '42 790 Td',
      '14 TL',
      ...lines.map((line, index) =>
        index === 0
          ? `(${this.escapePdfText(line)}) Tj`
          : `T* (${this.escapePdfText(line)}) Tj`,
      ),
      'ET',
    ].join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      `4 0 obj << /Length ${Buffer.byteLength(contentCommands, 'utf8')} >> stream\n${contentCommands}\nendstream endobj`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private escapePdfText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }
}
