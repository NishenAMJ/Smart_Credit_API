'use strict';

const crypto = require('crypto');
const { geohashForLocation } = require('geofire-common');

const pad = (value, size = 6) => String(value).padStart(size, '0');
const addMonths = (date, months) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

function hashSeed(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFactory(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Kasun',
  'Nadeesha',
  'Tharindu',
  'Ishara',
  'Dinithi',
  'Ravindu',
  'Sanduni',
  'Malith',
  'Harini',
  'Sajith',
  'Dilshan',
  'Heshani',
];
const LAST_NAMES = [
  'Perera',
  'Fernando',
  'Silva',
  'Rathnayake',
  'Jayasinghe',
  'Senanayake',
  'Dias',
  'Wickramasinghe',
];
const OCCUPATIONS = [
  'Accountant',
  'Teacher',
  'Engineer',
  'Nurse',
  'Technician',
  'Shop owner',
  'Driver',
  'Designer',
];
const PURPOSES = [
  'personal',
  'education',
  'business',
  'medical',
  'home_improvement',
];
const LOCATIONS = [
  ['Colombo', 'Colombo', 6.9271, 79.8612],
  ['Kandy', 'Kandy', 7.2906, 80.6337],
  ['Galle', 'Galle', 6.0535, 80.221],
  ['Jaffna', 'Jaffna', 9.6615, 80.0255],
  ['Kurunegala', 'Kurunegala', 7.4863, 80.3623],
];

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function distribute(total, count) {
  const regular = Math.floor(total / count);
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? total - regular * (count - 1) : regular,
  );
}

function addBulkFixtures(fixtures, config, referenceDate, passwordHash) {
  const random = randomFactory(config.randomSeed);
  const prefix = `seed_${config.batchId}`;
  const adminId = 'admin_001';
  const lenderIds = [];
  const borrowerIds = [];

  for (let index = 1; index <= config.lenderCount; index += 1) {
    const suffix = pad(index);
    const userId = `${prefix}_lender_${suffix}`;
    lenderIds.push(userId);
    const fullName = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
    const createdAt = addMonths(
      referenceDate,
      -(1 + Math.floor(random() * 24)),
    );
    fixtures.users.push({
      userId,
      email: `lender.${config.batchId}.${suffix}@seed.smartcredit.lk`,
      phone: `+9472${String(index).padStart(7, '0').slice(-7)}`,
      fullName,
      photoUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(userId)}`,
      roles: ['lender'],
      accountStatus: 'active',
      kycStatus: 'approved',
      borrowerProfile: null,
      lenderProfile: {
        businessName: `${fullName} Finance`,
        registrationNumber: `SC-${config.batchId}-${suffix}`,
        description:
          'Seeded lender profile for development and performance testing.',
        rating: Number((3.5 + random() * 1.5).toFixed(1)),
      },
      createdAt,
      updatedAt: referenceDate,
      lastLoginAt: addMonths(referenceDate, -Math.floor(random() * 2)),
    });
  }

  for (let index = 1; index <= config.borrowerCount; index += 1) {
    const suffix = pad(index);
    const userId = `${prefix}_borrower_${suffix}`;
    borrowerIds.push(userId);
    const fullName = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
    const createdAt = addMonths(
      referenceDate,
      -(1 + Math.floor(random() * 24)),
    );
    fixtures.users.push({
      userId,
      email: `borrower.${config.batchId}.${suffix}@seed.smartcredit.lk`,
      phone: `+9473${String(index).padStart(7, '0').slice(-7)}`,
      fullName,
      photoUrl: `https://i.pravatar.cc/300?u=${encodeURIComponent(userId)}`,
      roles: ['borrower'],
      accountStatus: 'active',
      kycStatus: 'approved',
      borrowerProfile: {
        dateOfBirth: new Date(
          `${1970 + Math.floor(random() * 30)}-06-15T00:00:00Z`,
        ),
        occupation: pick(random, OCCUPATIONS),
        monthlyIncomeMinor: (60000 + Math.floor(random() * 440000)) * 100,
        creditScore: 520 + Math.floor(random() * 280),
      },
      lenderProfile: null,
      createdAt,
      updatedAt: referenceDate,
      lastLoginAt: addMonths(referenceDate, -Math.floor(random() * 2)),
    });
  }

  for (const userId of [...lenderIds, ...borrowerIds]) {
    const user = fixtures.users.find((item) => item.userId === userId);
    fixtures.authCredentials.push({
      userId,
      passwordHash,
      passwordChangedAt: referenceDate,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: user.createdAt,
      updatedAt: referenceDate,
    });
  }

  borrowerIds.forEach((userId, index) => {
    const suffix = pad(index + 1);
    const documentId = `${prefix}_kyc_doc_${suffix}`;
    fixtures.documents.push({
      documentId,
      ownerUserId: userId,
      category: 'kyc_identity',
      storagePath: `seed/${config.batchId}/${userId}/identity.pdf`,
      fileName: 'identity.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100000 + index,
      checksum: null,
      status: 'verified',
      uploadedAt: addMonths(referenceDate, -6),
      verifiedAt: addMonths(referenceDate, -6),
      verifiedByUserId: adminId,
    });
    fixtures.kycSubmissions.push({
      submissionId: `${prefix}_kyc_${suffix}`,
      userId,
      role: 'borrower',
      status: 'approved',
      documentIds: [documentId],
      submittedAt: addMonths(referenceDate, -6),
      reviewedAt: addMonths(referenceDate, -6),
      reviewedByAdminId: adminId,
      rejectionReason: null,
      createdAt: addMonths(referenceDate, -6),
      updatedAt: addMonths(referenceDate, -6),
    });
  });

  for (let index = 1; index <= config.listingCount; index += 1) {
    const suffix = pad(index);
    const lenderId = lenderIds[(index - 1) % lenderIds.length];
    const purpose = PURPOSES[(index - 1) % PURPOSES.length];
    const createdAt = addMonths(referenceDate, -(1 + (index % 12)));
    fixtures.loanListings.push({
      listingId: `${prefix}_listing_${suffix}`,
      lenderId,
      title: `${purpose.replace('_', ' ')} financing ${suffix}`,
      description: 'Schema-v2 compliant seeded monthly financing offer.',
      purposeCategories: [purpose],
      minAmountMinor: 5000000,
      maxAmountMinor: 50000000,
      minInterestRateAnnual: 8,
      maxInterestRateAnnual: 20,
      minTenureMonths: 3,
      maxTenureMonths: 24,
      availableCapitalMinor: 100000000,
      currency: 'LKR',
      repaymentFrequency: 'monthly',
      status: 'active',
      adminReview: {
        reviewedBy: adminId,
        reviewedAt: createdAt,
        rejectionReason: null,
      },
      publishedAt: createdAt,
      expiresAt: addMonths(referenceDate, 12),
      createdAt,
      updatedAt: referenceDate,
    });
  }

  for (let index = 1; index <= config.applicationCount; index += 1) {
    const suffix = pad(index);
    const listing =
      fixtures.loanListings[2 + ((index - 1) % config.listingCount)];
    const borrowerId = borrowerIds[(index - 1) % borrowerIds.length];
    const converted = index <= config.loanCount;
    const principalMinor = (50000 + (index % 40) * 10000) * 100;
    const tenureMonths = [3, 6, 9, 12, 18, 24][index % 6];
    const createdAt = addMonths(referenceDate, -(1 + (index % 12)));
    fixtures.loanApplications.push({
      applicationId: `${prefix}_application_${suffix}`,
      listingId: listing.listingId,
      lenderId: listing.lenderId,
      borrowerId,
      requestedPrincipalMinor: principalMinor,
      requestedTenureMonths: tenureMonths,
      requestedPurpose: listing.purposeCategories[0],
      purposeDescription: 'Seeded application for realistic development data.',
      status: converted
        ? 'converted'
        : ['submitted', 'under_review', 'rejected', 'withdrawn'][index % 4],
      lenderDecision: converted
        ? {
            approvedPrincipalMinor: principalMinor,
            annualInterestRate: 8 + (index % 13),
            approvedTenureMonths: tenureMonths,
            decisionNote: 'Approved by bulk seed.',
            decidedAt: createdAt,
          }
        : {
            approvedPrincipalMinor: null,
            annualInterestRate: null,
            approvedTenureMonths: null,
            decisionNote: null,
            decidedAt: null,
          },
      convertedLoanId: converted ? `${prefix}_loan_${suffix}` : null,
      submittedAt: createdAt,
      createdAt,
      updatedAt: referenceDate,
    });
  }

  for (let index = 1; index <= config.loanCount; index += 1) {
    const suffix = pad(index);
    const application = fixtures.loanApplications[2 + index - 1];
    const loanId = `${prefix}_loan_${suffix}`;
    const tenureMonths = application.lenderDecision.approvedTenureMonths;
    const principalMinor = application.lenderDecision.approvedPrincipalMinor;
    const annualInterestRate = application.lenderDecision.annualInterestRate;
    const interestAmountMinor = Math.round(
      (principalMinor * annualInterestRate * tenureMonths) / 1200,
    );
    const totalRepayableMinor = principalMinor + interestAmountMinor;
    const amounts = distribute(totalRepayableMinor, tenureMonths);
    const lifecycle = index % 10;
    const paidCount =
      lifecycle === 0
        ? tenureMonths
        : lifecycle < 3
          ? 0
          : Math.min(tenureMonths - 1, index % tenureMonths);
    const status =
      lifecycle === 0
        ? 'completed'
        : lifecycle === 1
          ? 'pending_disbursement'
          : lifecycle === 2
            ? 'overdue'
            : 'active';
    const approvedAt = application.createdAt;
    const amountPaidMinor = amounts
      .slice(0, paidCount)
      .reduce((sum, amount) => sum + amount, 0);
    fixtures.loans.push({
      loanId,
      applicationId: application.applicationId,
      listingId: application.listingId,
      lenderId: application.lenderId,
      borrowerId: application.borrowerId,
      currency: 'LKR',
      principalMinor,
      annualInterestRate,
      interestAmountMinor,
      totalRepayableMinor,
      monthlyInstallmentMinor: Math.floor(totalRepayableMinor / tenureMonths),
      tenureMonths,
      amountPaidMinor,
      remainingBalanceMinor: totalRepayableMinor - amountPaidMinor,
      status,
      approvedAt,
      disbursedAt: status === 'pending_disbursement' ? null : approvedAt,
      firstPaymentDueAt:
        status === 'pending_disbursement' ? null : addMonths(approvedAt, 1),
      maturityDate:
        status === 'pending_disbursement'
          ? null
          : addMonths(approvedAt, tenureMonths),
      completedAt: status === 'completed' ? referenceDate : null,
      termsVersion: 1,
      createdAt: approvedAt,
      updatedAt: referenceDate,
    });
    if (status !== 'pending_disbursement')
      fixtures.transactions.push({
        transactionId: `disbursement_${loanId}`,
        type: 'disbursement',
        status: 'completed',
        currency: 'LKR',
        amountMinor: principalMinor,
        lenderId: application.lenderId,
        borrowerId: application.borrowerId,
        loanId,
        installmentId: null,
        listingId: application.listingId,
        paymentMethod: 'bank_transfer',
        externalReference: `SEED-D-${suffix}`,
        idempotencyKey: `disbursement_${loanId}`,
        receiptDocumentId: null,
        note: 'Seeded loan disbursement.',
        initiatedByUserId: application.lenderId,
        completedAt: approvedAt,
        createdAt: approvedAt,
      });
    if (status !== 'pending_disbursement')
      amounts.forEach((amountDueMinor, installmentIndex) => {
      const sequence = installmentIndex + 1;
      const installmentId = `month_${String(sequence).padStart(3, '0')}`;
      const paid = sequence <= paidCount;
      const dueAt = addMonths(approvedAt, sequence);
      const repaymentId = `repayment_${loanId}_${installmentId}`;
      const installmentStatus = paid
        ? 'paid'
        : status === 'overdue' && sequence === paidCount + 1
          ? 'overdue'
          : 'scheduled';
      fixtures.installments.push({
        installmentId,
        loanId,
        lenderId: application.lenderId,
        borrowerId: application.borrowerId,
        sequence,
        currency: 'LKR',
        amountDueMinor,
        status: installmentStatus,
        dueAt,
        paidTransactionId: paid ? repaymentId : null,
        paidAt: paid ? dueAt : null,
        note: paid ? 'Seeded full monthly settlement.' : null,
        createdAt: approvedAt,
        updatedAt: referenceDate,
      });
      if (paid)
        fixtures.transactions.push({
          transactionId: repaymentId,
          type: 'repayment',
          status: 'completed',
          currency: 'LKR',
          amountMinor: amountDueMinor,
          lenderId: application.lenderId,
          borrowerId: application.borrowerId,
          loanId,
          installmentId,
          listingId: application.listingId,
          paymentMethod: ['bank_transfer', 'qr', 'cash', 'card'][sequence % 4],
          externalReference: `SEED-R-${suffix}-${sequence}`,
          idempotencyKey: repaymentId,
          receiptDocumentId: null,
          note: 'Seeded full installment repayment.',
          initiatedByUserId: application.borrowerId,
          completedAt: dueAt,
          createdAt: dueAt,
        });
      });
  }

  fixtures.loanApplications.slice(2).forEach((application, index) => {
    const suffix = pad(index + 1);
    fixtures.notifications.push({
      notificationId: `${prefix}_notification_${suffix}`,
      userId: application.lenderId,
      category: 'application',
      title: 'Seeded loan application',
      body: `Application ${application.applicationId} is ${application.status}.`,
      entityType: 'application',
      entityId: application.applicationId,
      isRead: index % 3 === 0,
      readAt: index % 3 === 0 ? referenceDate : null,
      createdAt: application.createdAt,
    });
  });

  fixtures.loans
    .filter((loan) => loan.status === 'pending_disbursement')
    .forEach((loan, index) => {
      const agreementId = `agreement_${loan.loanId}_v001`;
      const borrower = fixtures.users.find(
        (user) => user.userId === loan.borrowerId,
      );
      const lender = fixtures.users.find((user) => user.userId === loan.lenderId);
      const partiallyAccepted = index % 2 === 1;
      const terms = {
        currency: 'LKR',
        principalMinor: loan.principalMinor,
        annualInterestRate: loan.annualInterestRate,
        interestAmountMinor: loan.interestAmountMinor,
        totalRepayableMinor: loan.totalRepayableMinor,
        monthlyInstallmentMinor: loan.monthlyInstallmentMinor,
        tenureMonths: loan.tenureMonths,
        repaymentFrequency: 'monthly',
        repaymentStartRule: 'one_month_after_activation',
      };
      const termsHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            applicationId: loan.applicationId,
            borrowerId: loan.borrowerId,
            lenderId: loan.lenderId,
            listingId: loan.listingId,
            loanId: loan.loanId,
            terms,
            version: 1,
          }),
        )
        .digest('hex');
      const lenderAcceptance = partiallyAccepted
        ? {
            accepted: true,
            signedName: lender?.fullName ?? 'Seed lender',
            acceptedAt: referenceDate,
          }
        : { accepted: false, signedName: null, acceptedAt: null };
      fixtures.loanAgreements.push({
        agreementId,
        loanId: loan.loanId,
        applicationId: loan.applicationId,
        listingId: loan.listingId,
        version: 1,
        status: partiallyAccepted
          ? 'partially_accepted'
          : 'awaiting_signatures',
        title: `Smart Credit Loan Agreement - ${loan.loanId}`,
        summary: 'Seeded unsigned loan agreement for development.',
        borrowerId: loan.borrowerId,
        lenderId: loan.lenderId,
        borrower: {
          userId: loan.borrowerId,
          fullName: borrower?.fullName ?? 'Seed borrower',
          email: borrower?.email ?? '',
          phone: borrower?.phone ?? '',
          role: 'borrower',
        },
        lender: {
          userId: loan.lenderId,
          fullName: lender?.fullName ?? 'Seed lender',
          email: lender?.email ?? '',
          phone: lender?.phone ?? '',
          role: 'lender',
        },
        terms,
        bodyHtml: `<h1>Smart Credit Loan Agreement</h1><p>Seed agreement ${agreementId}</p>`,
        termsHash,
        consentTextVersion: 'loan_agreement_consent_v1',
        borrowerAcceptance: { accepted: false, signedName: null, acceptedAt: null },
        lenderAcceptance,
        generatedByUserId: loan.lenderId,
        generatedByRole: 'lender',
        generatedAt: loan.approvedAt,
        updatedAt: referenceDate,
        finalizedAt: null,
        finalizationStartedAt: null,
        finalizationError: null,
        signedPdfDocumentId: null,
        signedPdfGeneratedAt: null,
        pdfSha256Hash: null,
      });
      loan.currentAgreementId = agreementId;
      loan.agreementStatus = partiallyAccepted
        ? 'partially_accepted'
        : 'awaiting_signatures';
      if (partiallyAccepted) {
        fixtures.loanAgreementAcceptances.push({
          acceptanceId: `${agreementId}_lender`,
          agreementId,
          loanId: loan.loanId,
          userId: loan.lenderId,
          role: 'lender',
          agreementVersion: 1,
          termsHash,
          signedName: lender?.fullName ?? 'Seed lender',
          consentAccepted: true,
          consentTextVersion: 'loan_agreement_consent_v1',
          ipAddressHash: null,
          userAgent: 'bulk-seed',
          acceptedAt: referenceDate,
        });
      }
    });

  fixtures.loans
    .slice(1, Math.min(fixtures.loans.length, 301))
    .forEach((loan, index) => {
      const suffix = pad(index + 1);
      const conversationId = `${prefix}_conversation_${suffix}`;
      const messageId = `${prefix}_message_${suffix}`;
      const text = 'Seeded conversation about the monthly repayment schedule.';
      fixtures.conversations.push({
        conversationId,
        participantIds: [loan.lenderId, loan.borrowerId],
        contextType: 'loan',
        contextId: loan.loanId,
        lastMessage: {
          messageId,
          senderId: loan.borrowerId,
          preview: text,
          sentAt: referenceDate,
        },
        createdAt: loan.createdAt,
        updatedAt: referenceDate,
      });
      fixtures.messages.push({
        conversationId,
        messageId,
        senderId: loan.borrowerId,
        type: 'text',
        text,
        documentId: null,
        readByUserIds: [loan.borrowerId, loan.lenderId],
        sentAt: referenceDate,
        editedAt: null,
        deletedAt: null,
      });
    });

  fixtures.loans.slice(1).forEach((loan, index) => {
    if (index % 25 !== 0) return;
    const suffix = pad(index + 1);
    const installment = fixtures.installments.find(
      (item) => item.loanId === loan.loanId && item.status === 'paid',
    );
    fixtures.disputes.push({
      disputeId: `${prefix}_dispute_${suffix}`,
      disputeCode: `DSP-${suffix}`,
      openedByUserId: loan.borrowerId,
      complainantId: loan.borrowerId,
      complainantRole: 'borrower',
      respondentId: loan.lenderId,
      respondentRole: 'lender',
      borrowerId: loan.borrowerId,
      lenderId: loan.lenderId,
      borrowerName: '',
      lenderName: '',
      assignedAdminId: adminId,
      loanId: loan.loanId,
      installmentId: installment?.installmentId ?? null,
      transactionId: installment?.paidTransactionId ?? null,
      category: installment ? 'payment' : 'loan_terms',
      subject: 'Seeded account review request',
      description:
        'Development fixture for the administrative dispute workflow.',
      desiredOutcome: 'Review the loan record and provide a written decision.',
      disputedAmountMinor: null,
      currency: 'LKR',
      evidenceDocumentIds: [],
      status: 'under_review',
      priority: installment ? 'high' : 'medium',
      resolution: null,
      acknowledgements: {},
      reopenCount: 0,
      resolvedAt: null,
      closedAt: null,
      createdAt: referenceDate,
      updatedAt: referenceDate,
    });
    fixtures.disputeEvents.push({
      disputeId: `${prefix}_dispute_${suffix}`,
      eventId: 'event_001',
      actorUserId: loan.borrowerId,
      actorRole: 'borrower',
      type: 'created',
      message: 'Seeded dispute opened.',
      previousStatus: null,
      nextStatus: 'under_review',
      documentIds: [],
      visibility: 'shared',
      createdAt: referenceDate,
    });
  });

  [...lenderIds, ...borrowerIds].forEach((userId, index) => {
    fixtures.legalAcceptances.push({
      acceptanceId: `${prefix}_acceptance_${pad(index + 1)}`,
      userId,
      legalDocumentId: 'terms_001',
      documentVersion: 1,
      acceptedAt: addMonths(referenceDate, -1),
      ipAddressHash: null,
      userAgent: 'bulk-seed',
    });
  });

  fixtures.loanListings.slice(2).forEach((listing, index) => {
    if (index % 10 !== 0) return;
    fixtures.auditLogs.push({
      auditLogId: `${prefix}_audit_${pad(index + 1)}`,
      actorUserId: adminId,
      actorRole: 'admin',
      action: 'listing.approved',
      entityType: 'loanListing',
      entityId: listing.listingId,
      before: { status: 'pending_review' },
      after: { status: 'active' },
      metadata: { source: 'bulk-seed', batchId: config.batchId },
      createdAt: listing.createdAt,
    });
  });

  lenderIds.forEach((userId, index) => {
    const [city, district, latitude, longitude] =
      LOCATIONS[index % LOCATIONS.length];
    const jittered = [latitude + random() / 100, longitude + random() / 100];
    fixtures.userLocations.push({
      userId,
      role: 'lender',
      latitude: jittered[0],
      longitude: jittered[1],
      geohash: geohashForLocation(jittered),
      city,
      district,
      visibility: 'exact',
      updatedAt: referenceDate,
    });
  });

  return fixtures;
}

module.exports = { addBulkFixtures, randomFactory };
