import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import puppeteer from 'puppeteer';
import {
  type CollectionReference,
  Timestamp,
} from 'firebase-admin/firestore';

import { FirebaseService } from '../../firebase/firebase.service';
import type { UserRole, UserDocument } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import type {
  AcceptLegalDocumentResponseDto,
  LegalDocumentDto,
} from './dto/legal-document.dto';
import type {
  LegalDocument,
  LegalDocumentParty,
  LegalPartySignatureAudit,
} from './legal.types';

type LoanRecord = {
  id: string;
  borrowerId: string;
  lenderId: string;
  amount?: number;
  interestRate?: number;
  durationMonths?: number;
  repaymentSchedule?: string;
  status?: string;
  nextDueDate?: Timestamp;
};

@Injectable()
export class LegalService {
  private readonly legalCollection: CollectionReference<LegalDocument>;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly authService: AuthService,
  ) {
    this.legalCollection = this.firebaseService.db.collection(
      'legalDocuments',
    ) as CollectionReference<LegalDocument>;
  }

  async generateLoanAgreement(
    loanId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<LegalDocumentDto> {
    const loan = await this.getLoanById(loanId);
    await this.assertLoanAccess(loan, userId, userRole);

    const [borrower, lender] = await Promise.all([
      this.authService.getUserById(loan.borrowerId),
      this.authService.getUserById(loan.lenderId),
    ]);

    const existing = await this.getLatestLoanDocumentRecord(loanId);
    const legalRef = existing
      ? this.legalCollection.doc(existing.id)
      : this.legalCollection.doc();
    const now = Timestamp.now();

    const document: LegalDocument = {
      id: legalRef.id,
      loanId,
      title: `Smart Credit+ Loan Agreement - ${loanId}`,
      summary: this.buildSummary(borrower, lender, loan),
      documentType: 'loan_agreement',
      status: existing
        ? this.resolveExistingStatus(existing)
        : 'generated',
      generatedByUserId: userId,
      generatedByRole: userRole,
      generatedAt: existing?.generatedAt ?? now,
      updatedAt: now,
      borrower: this.toPartyDto(borrower, 'borrower'),
      lender: this.toPartyDto(lender, 'lender'),
      loanSnapshot: {
        loanId,
        amount: this.readNumber(loan.amount),
        interestRate: this.readNumber(loan.interestRate),
        durationMonths: this.readNumber(loan.durationMonths),
        repaymentSchedule:
          this.readString(loan.repaymentSchedule) || 'Monthly repayment',
        status: this.readString(loan.status) || 'pending',
        ...(loan.nextDueDate ? { nextDueDate: loan.nextDueDate } : {}),
      },
      htmlContent: '',
      borrowerAccepted: existing?.borrowerAccepted ?? false,
      lenderAccepted: existing?.lenderAccepted ?? false,
      ...(existing?.borrowerAcceptedAt
        ? { borrowerAcceptedAt: existing.borrowerAcceptedAt }
        : {}),
      ...(existing?.lenderAcceptedAt
        ? { lenderAcceptedAt: existing.lenderAcceptedAt }
        : {}),
      pdfDownloadPath: `/api/legal/documents/${legalRef.id}/download`,
    };

    document.status = this.resolveDocumentStatus(document);
    document.htmlContent = this.buildAgreementHtml(document);
    await legalRef.set(document);

    return this.toDto(document);
  }

  async getDocumentById(
    documentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<LegalDocumentDto> {
    const doc = await this.legalCollection.doc(documentId).get();

    if (!doc.exists) {
      throw new NotFoundException('Legal document not found.');
    }

    const document = doc.data() as LegalDocument;
    this.assertDocumentAccess(document, userId, userRole);
    return this.toDto(document);
  }

  async getLatestLoanDocument(
    loanId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<LegalDocumentDto | null> {
    const loan = await this.getLoanById(loanId);
    await this.assertLoanAccess(loan, userId, userRole);
    const document = await this.getLatestLoanDocumentRecord(loanId);
    return document ? this.toDto(document) : null;
  }

  async acceptDocument(
    documentId: string,
    userId: string,
    userRole: UserRole,
    signatureAudit: LegalPartySignatureAudit,
  ): Promise<AcceptLegalDocumentResponseDto> {
    const docRef = this.legalCollection.doc(documentId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new NotFoundException('Legal document not found.');
    }

    const document = snapshot.data() as LegalDocument;
    this.assertDocumentAccess(document, userId, userRole);

    if (userRole === 'admin') {
      throw new ForbiddenException(
        'Admin users can review legal documents but cannot accept them on behalf of parties.',
      );
    }

    const now = Timestamp.now();
    const signedName = this.readString(signatureAudit.signedName).trim();

    if (!signedName) {
      throw new BadRequestException('Signed name is required.');
    }

    const updateData: Partial<LegalDocument> = {
      updatedAt: now,
    };

    if (userRole === 'borrower') {
      if (document.borrower.userId !== userId) {
        throw new ForbiddenException(
          'Only the borrower on this loan can accept as borrower.',
        );
      }
      updateData.borrowerAccepted = true;
      updateData.borrowerAcceptedAt = now;
      updateData.borrowerSignatureAudit = {
        signedName,
        ipAddress: this.readString(signatureAudit.ipAddress).trim() || undefined,
        userAgent: this.readString(signatureAudit.userAgent).trim() || undefined,
      };
    }

    if (userRole === 'lender') {
      if (document.lender.userId !== userId) {
        throw new ForbiddenException(
          'Only the lender on this loan can accept as lender.',
        );
      }
      updateData.lenderAccepted = true;
      updateData.lenderAcceptedAt = now;
      updateData.lenderSignatureAudit = {
        signedName,
        ipAddress: this.readString(signatureAudit.ipAddress).trim() || undefined,
        userAgent: this.readString(signatureAudit.userAgent).trim() || undefined,
      };
    }

    const merged: LegalDocument = {
      ...document,
      ...updateData,
    };
    merged.status = this.resolveDocumentStatus(merged);
    merged.htmlContent = this.buildAgreementHtml(merged);

    if (merged.status === 'fully_accepted') {
      const storagePath = await this.persistSignedPdf(merged);
      merged.signedPdfStoragePath = storagePath;
      merged.signedPdfGeneratedAt = now;
    }

    await docRef.update({
      ...updateData,
      status: merged.status,
      htmlContent: merged.htmlContent,
      ...(merged.signedPdfStoragePath
        ? {
            signedPdfStoragePath: merged.signedPdfStoragePath,
            signedPdfGeneratedAt: merged.signedPdfGeneratedAt,
          }
        : {}),
    });

    return {
      message: 'Legal document acceptance recorded successfully.',
      document: this.toDto(merged),
    };
  }

  private async getLoanById(loanId: string): Promise<LoanRecord> {
    const doc = await this.firebaseService.db.collection('loans').doc(loanId).get();

    if (!doc.exists) {
      throw new NotFoundException('Loan not found. Create or seed a loan first.');
    }

    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      borrowerId: this.readString(data.borrowerId),
      lenderId: this.readString(data.lenderId),
      amount: this.readNumber(data.amount ?? data.principalAmount),
      interestRate: this.readNumber(data.interestRate),
      durationMonths: this.readNumber(data.durationMonths ?? data.tenureMonths),
      repaymentSchedule: this.readString(data.repaymentSchedule),
      status: this.readString(data.status),
      nextDueDate: this.readTimestamp(data.nextDueDate),
    };
  }

  private async getLatestLoanDocumentRecord(
    loanId: string,
  ): Promise<LegalDocument | null> {
    const snapshot = await this.legalCollection
      .where('loanId', '==', loanId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const documents = snapshot.docs.map((doc) => doc.data() as LegalDocument);
    documents.sort(
      (left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis(),
    );

    return documents[0];
  }

  private async assertLoanAccess(
    loan: LoanRecord,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    if (userRole === 'admin') {
      return;
    }

    if (userRole === 'borrower' && loan.borrowerId === userId) {
      return;
    }

    if (userRole === 'lender' && loan.lenderId === userId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have access to generate or view legal documents for this loan.',
    );
  }

  private assertDocumentAccess(
    document: LegalDocument,
    userId: string,
    userRole: UserRole,
  ): void {
    if (userRole === 'admin') {
      return;
    }

    if (userRole === 'borrower' && document.borrower.userId === userId) {
      return;
    }

    if (userRole === 'lender' && document.lender.userId === userId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have access to this legal document.',
    );
  }

  private toPartyDto(
    user: UserDocument,
    role: 'borrower' | 'lender',
  ): LegalDocumentParty {
    return {
      userId: user.uid,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role,
    };
  }

  private buildSummary(
    borrower: UserDocument,
    lender: UserDocument,
    loan: LoanRecord,
  ): string {
    return `${borrower.fullName} and ${lender.fullName} entered a loan agreement for LKR ${this.readNumber(loan.amount).toLocaleString('en-LK')} over ${this.readNumber(loan.durationMonths)} months at ${this.readNumber(loan.interestRate)}% interest.`;
  }

  async downloadDocumentPdf(
    documentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const doc = await this.legalCollection.doc(documentId).get();

    if (!doc.exists) {
      throw new NotFoundException('Legal document not found.');
    }

    const document = doc.data() as LegalDocument;
    this.assertDocumentAccess(document, userId, userRole);

    if (document.signedPdfStoragePath) {
      const file = this.firebaseService.bucket.file(document.signedPdfStoragePath);
      const [exists] = await file.exists();

      if (exists) {
        const [buffer] = await file.download();

        return {
          buffer,
          fileName: this.buildPdfFileName(document),
        };
      }
    }

    return {
      buffer: await this.buildAgreementPdf(document),
      fileName: this.buildPdfFileName(document),
    };
  }

  private buildAgreementHtml(document: LegalDocument): string {
    const amount = this.formatCurrency(document.loanSnapshot.amount);
    const interestRate = document.loanSnapshot.interestRate;
    const durationMonths = document.loanSnapshot.durationMonths;
    const repaymentSchedule =
      this.readString(document.loanSnapshot.repaymentSchedule) ||
      'Monthly repayment';
    const nextDueDate = document.loanSnapshot.nextDueDate
      ? this.formatDate(document.loanSnapshot.nextDueDate)
      : 'To be scheduled';
    const generatedDate = this.formatDate(document.generatedAt);
    const borrowerSigned = document.borrowerAcceptedAt
      ? this.formatDate(document.borrowerAcceptedAt)
      : 'Pending signature';
    const lenderSigned = document.lenderAcceptedAt
      ? this.formatDate(document.lenderAcceptedAt)
      : 'Pending signature';
    const borrowerSignedName =
      document.borrowerSignatureAudit?.signedName || 'Pending signer name';
    const lenderSignedName =
      document.lenderSignatureAudit?.signedName || 'Pending signer name';

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Smart Credit+ Loan Agreement</title>
    <style>
      body { font-family: Georgia, serif; color: #1f2937; margin: 40px; line-height: 1.6; }
      h1, h2 { color: #0f172a; margin-bottom: 8px; }
      .meta, .parties, .terms { margin-bottom: 24px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .card { border: 1px solid #dbe4f0; border-radius: 12px; padding: 16px; background: #f8fafc; }
      .signature { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
      .line { border-top: 1px solid #94a3b8; margin-top: 48px; padding-top: 8px; }
      ul { margin: 8px 0 0 20px; }
    </style>
  </head>
  <body>
    <h1>Smart Credit+ Loan Agreement</h1>
    <p>This agreement was generated automatically by Smart Credit+ on ${this.escapeHtml(generatedDate)}.</p>

    <section class="meta">
      <div class="card">
        <strong>Agreement Reference:</strong> ${this.escapeHtml(document.loanId)}<br />
        <strong>Loan Status:</strong> ${this.escapeHtml(this.readString(document.loanSnapshot.status) || 'pending')}<br />
        <strong>Agreement Status:</strong> ${this.escapeHtml(document.status.replace(/_/g, ' '))}<br />
        <strong>Next Due Date:</strong> ${this.escapeHtml(nextDueDate)}
      </div>
    </section>

    <section class="parties">
      <h2>Parties</h2>
      <div class="grid">
        <div class="card">
          <strong>Borrower</strong><br />
          ${this.escapeHtml(document.borrower.fullName)}<br />
          ${this.escapeHtml(document.borrower.email)}<br />
          ${this.escapeHtml(document.borrower.phone)}
        </div>
        <div class="card">
          <strong>Lender</strong><br />
          ${this.escapeHtml(document.lender.fullName)}<br />
          ${this.escapeHtml(document.lender.email)}<br />
          ${this.escapeHtml(document.lender.phone)}
        </div>
      </div>
    </section>

    <section class="terms">
      <h2>Loan Terms</h2>
      <div class="card">
        <strong>Principal Amount:</strong> ${this.escapeHtml(amount)}<br />
        <strong>Interest Rate:</strong> ${this.escapeHtml(String(interestRate))}% per annum<br />
        <strong>Tenure:</strong> ${this.escapeHtml(String(durationMonths))} months<br />
        <strong>Repayment Schedule:</strong> ${this.escapeHtml(repaymentSchedule)}
      </div>
    </section>

    <section>
      <h2>Core Conditions</h2>
      <ul>
        <li>The lender agrees to provide the borrower the principal amount described above.</li>
        <li>The borrower agrees to repay the loan according to the stated schedule and interest rate.</li>
        <li>Both parties acknowledge that Smart Credit+ stores the current agreement state and acceptance history.</li>
        <li>This PDF may be downloaded by either party after agreement review and acceptance.</li>
        <li>Changes to principal, tenure, repayment timing, or interest should trigger a regenerated agreement.</li>
      </ul>
    </section>

    <section class="signature">
      <div class="line">
        Borrower Signature<br />
        ${this.escapeHtml(borrowerSignedName)}<br />
        <small>${this.escapeHtml(borrowerSigned)}</small>
      </div>
      <div class="line">
        Lender Signature<br />
        ${this.escapeHtml(lenderSignedName)}<br />
        <small>${this.escapeHtml(lenderSigned)}</small>
      </div>
    </section>
  </body>
</html>`;
  }

  private async buildAgreementPdf(document: LegalDocument): Promise<Buffer> {
    if (process.env.JEST_WORKER_ID) {
      return this.buildFallbackPdf(document);
    }

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(document.htmlContent, {
          waitUntil: 'networkidle0',
        });

        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '24px',
            right: '24px',
            bottom: '24px',
            left: '24px',
          },
        });

        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch {
      return this.buildFallbackPdf(document);
    }
  }

  private buildFallbackPdf(document: LegalDocument): Buffer {
    const lines = [
      'Smart Credit+ Loan Agreement',
      '',
      `Agreement Reference: ${document.loanId}`,
      `Agreement Status: ${document.status.replace(/_/g, ' ')}`,
      `Generated On: ${this.formatDate(document.generatedAt)}`,
      '',
      'Parties',
      `Borrower: ${document.borrower.fullName}`,
      `Borrower Email: ${document.borrower.email}`,
      `Borrower Phone: ${document.borrower.phone}`,
      `Lender: ${document.lender.fullName}`,
      `Lender Email: ${document.lender.email}`,
      `Lender Phone: ${document.lender.phone}`,
      '',
      'Loan Terms',
      `Principal Amount: ${this.formatCurrency(document.loanSnapshot.amount)}`,
      `Interest Rate: ${document.loanSnapshot.interestRate}% per annum`,
      `Tenure: ${document.loanSnapshot.durationMonths} months`,
      `Repayment Schedule: ${document.loanSnapshot.repaymentSchedule}`,
      `Loan Status: ${document.loanSnapshot.status}`,
      '',
      'Acceptance',
      `Borrower Accepted: ${document.borrowerAccepted ? 'Yes' : 'No'}`,
      `Borrower Signed Name: ${document.borrowerSignatureAudit?.signedName ?? 'Pending signer name'}`,
      `Borrower Signed At: ${document.borrowerAcceptedAt ? this.formatDate(document.borrowerAcceptedAt) : 'Pending signature'}`,
      `Borrower Audit IP: ${document.borrowerSignatureAudit?.ipAddress ?? 'Not recorded'}`,
      `Lender Accepted: ${document.lenderAccepted ? 'Yes' : 'No'}`,
      `Lender Signed Name: ${document.lenderSignatureAudit?.signedName ?? 'Pending signer name'}`,
      `Lender Signed At: ${document.lenderAcceptedAt ? this.formatDate(document.lenderAcceptedAt) : 'Pending signature'}`,
      `Lender Audit IP: ${document.lenderSignatureAudit?.ipAddress ?? 'Not recorded'}`,
      '',
      'This agreement was produced by Smart Credit+ for borrower and lender reference.',
    ];

    return this.createSimplePdfBuffer(lines);
  }

  private toDto(document: LegalDocument): LegalDocumentDto {
    return {
      id: document.id,
      loanId: document.loanId,
      title: document.title,
      summary: document.summary,
      documentType: document.documentType,
      status: document.status,
      generatedByUserId: document.generatedByUserId,
      generatedByRole: document.generatedByRole,
      generatedAt: document.generatedAt.toDate().toISOString(),
      updatedAt: document.updatedAt.toDate().toISOString(),
      borrower: document.borrower,
      lender: document.lender,
      loanSnapshot: {
        loanId: document.loanSnapshot.loanId,
        amount: document.loanSnapshot.amount,
        interestRate: document.loanSnapshot.interestRate,
        durationMonths: document.loanSnapshot.durationMonths,
        repaymentSchedule: document.loanSnapshot.repaymentSchedule,
        status: document.loanSnapshot.status,
        nextDueDate: document.loanSnapshot.nextDueDate
          ?.toDate()
          .toISOString(),
      },
      htmlContent: document.htmlContent,
      borrowerAccepted: document.borrowerAccepted,
      lenderAccepted: document.lenderAccepted,
      borrowerAcceptedAt: document.borrowerAcceptedAt
        ?.toDate()
        .toISOString(),
      lenderAcceptedAt: document.lenderAcceptedAt?.toDate().toISOString(),
      borrowerSignatureAudit: document.borrowerSignatureAudit,
      lenderSignatureAudit: document.lenderSignatureAudit,
      pdfDownloadPath:
        document.pdfDownloadPath ??
        `/api/legal/documents/${document.id}/download`,
      signedPdfStoragePath: document.signedPdfStoragePath,
      signedPdfGeneratedAt: document.signedPdfGeneratedAt
        ?.toDate()
        .toISOString(),
    };
  }

  private resolveExistingStatus(document: LegalDocument): LegalDocument['status'] {
    return this.resolveDocumentStatus(document);
  }

  private resolveDocumentStatus(document: Pick<LegalDocument, 'borrowerAccepted' | 'lenderAccepted'>): LegalDocument['status'] {
    if (document.borrowerAccepted && document.lenderAccepted) {
      return 'fully_accepted';
    }

    if (document.borrowerAccepted || document.lenderAccepted) {
      return 'partially_accepted';
    }

    return 'generated';
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private readNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private readTimestamp(value: unknown): Timestamp | undefined {
    return value instanceof Timestamp ? value : undefined;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatDate(value: Timestamp): string {
    return value.toDate().toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private buildPdfFileName(document: LegalDocument): string {
    return `smart-credit-loan-agreement-${document.loanId}.pdf`;
  }

  private async persistSignedPdf(document: LegalDocument): Promise<string> {
    const fileName = this.buildPdfFileName(document);
    const storagePath = `legal-documents/${document.loanId}/${fileName}`;
    const buffer = await this.buildAgreementPdf(document);
    const file = this.firebaseService.bucket.file(storagePath);

    await file.save(buffer, {
      contentType: 'application/pdf',
      resumable: false,
      metadata: {
        contentType: 'application/pdf',
      },
    });

    return storagePath;
  }

  private createSimplePdfBuffer(lines: string[]): Buffer {
    const sanitizedLines = lines.map((line) => this.escapePdfText(line));
    const contentCommands = [
      'BT',
      '/F1 12 Tf',
      '50 780 Td',
      '14 TL',
      ...sanitizedLines.map((line, index) =>
        index === 0 ? `(${line}) Tj` : `T* (${line}) Tj`,
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
    const offsets: number[] = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  private escapePdfText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
