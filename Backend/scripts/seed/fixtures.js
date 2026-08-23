'use strict';

const bcrypt = require('bcrypt');
const { addBulkFixtures } = require('./bulk-fixtures');
const { getSeedConfig } = require('./config');

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const installmentIdFor = (sequence) =>
  `month_${String(sequence).padStart(3, '0')}`;

async function buildSchemaV2Fixtures(referenceDate = new Date()) {
  const config = getSeedConfig();
  const passwordHash = await bcrypt.hash(config.defaultPassword, 10);
  const users = [
    {
      userId: 'admin_001',
      email: 'admin@smartcredit.lk',
      phone: '+94710000001',
      fullName: 'Platform Administrator',
      photoUrl: null,
      roles: ['admin'],
      accountStatus: 'active',
      kycStatus: 'approved',
      borrowerProfile: null,
      lenderProfile: null,
      createdAt: addMonths(referenceDate, -12),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
    {
      userId: 'lender_001',
      email: 'kamal@smartcredit.lk',
      phone: '+94710000002',
      fullName: 'Kamal Rathnayake',
      photoUrl: null,
      roles: ['lender'],
      accountStatus: 'active',
      kycStatus: 'approved',
      borrowerProfile: null,
      lenderProfile: {
        businessName: 'Kamal Finance',
        registrationNumber: 'LF-001',
        description: 'Personal and small-business lending.',
        rating: 4.8,
      },
      createdAt: addMonths(referenceDate, -10),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
    {
      userId: 'borrower_001',
      email: 'amal@gmail.com',
      phone: '+94710000003',
      fullName: 'Amal Perera',
      photoUrl: null,
      roles: ['borrower'],
      accountStatus: 'active',
      kycStatus: 'approved',
      borrowerProfile: {
        dateOfBirth: new Date('1992-04-12T00:00:00Z'),
        occupation: 'Accountant',
        monthlyIncomeMinor: 18000000,
        creditScore: 701,
      },
      lenderProfile: null,
      createdAt: addMonths(referenceDate, -8),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
    {
      userId: 'multi_role_001',
      email: 'nimal@gmail.com',
      phone: '+94710000004',
      fullName: 'Nimal Fernando',
      photoUrl: null,
      roles: ['borrower', 'lender'],
      accountStatus: 'active',
      kycStatus: 'approved',
      borrowerProfile: {
        dateOfBirth: new Date('1988-09-20T00:00:00Z'),
        occupation: 'Business owner',
        monthlyIncomeMinor: 26000000,
        creditScore: 742,
      },
      lenderProfile: {
        businessName: 'Nimal Capital',
        registrationNumber: 'LF-002',
        description: 'Education lending.',
        rating: 4.6,
      },
      createdAt: addMonths(referenceDate, -7),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
    {
      userId: 'borrower_pending_001',
      email: 'borrower.pending@smartcredit.test',
      phone: '+94710000005',
      fullName: 'Pending Borrower',
      photoUrl: null,
      roles: ['borrower'],
      accountStatus: 'active',
      kycStatus: 'pending',
      borrowerProfile: {
        dateOfBirth: new Date('1995-02-10T00:00:00Z'),
        occupation: 'Teacher',
        monthlyIncomeMinor: 12000000,
        creditScore: null,
      },
      lenderProfile: null,
      createdAt: addMonths(referenceDate, -1),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
    {
      userId: 'borrower_rejected_001',
      email: 'borrower.rejected@smartcredit.test',
      phone: '+94710000006',
      fullName: 'Rejected Borrower',
      photoUrl: null,
      roles: ['borrower'],
      accountStatus: 'active',
      kycStatus: 'rejected',
      rejectionReason: 'Identity image is unreadable.',
      borrowerProfile: {
        dateOfBirth: new Date('1990-06-18T00:00:00Z'),
        occupation: 'Designer',
        monthlyIncomeMinor: 15000000,
        creditScore: null,
      },
      lenderProfile: null,
      createdAt: addMonths(referenceDate, -1),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
    {
      userId: 'lender_pending_001',
      email: 'lender.pending@smartcredit.test',
      phone: '+94710000007',
      fullName: 'Pending Lender',
      photoUrl: null,
      roles: ['lender'],
      accountStatus: 'active',
      kycStatus: 'pending',
      borrowerProfile: null,
      lenderProfile: {
        businessName: 'Pending Capital',
        registrationNumber: 'LF-PENDING',
        description: 'Pending verification fixture.',
        rating: 0,
      },
      createdAt: addMonths(referenceDate, -1),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
    {
      userId: 'lender_rejected_001',
      email: 'lender.rejected@smartcredit.test',
      phone: '+94710000008',
      fullName: 'Rejected Lender',
      photoUrl: null,
      roles: ['lender'],
      accountStatus: 'active',
      kycStatus: 'rejected',
      rejectionReason: 'Business document does not match the account.',
      borrowerProfile: null,
      lenderProfile: {
        businessName: 'Rejected Capital',
        registrationNumber: 'LF-REJECTED',
        description: 'Rejected verification fixture.',
        rating: 0,
      },
      createdAt: addMonths(referenceDate, -1),
      updatedAt: referenceDate,
      lastLoginAt: null,
    },
  ];

  const authCredentials = users.map((user) => ({
    userId: user.userId,
    passwordHash,
    passwordChangedAt: referenceDate,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: user.createdAt,
    updatedAt: referenceDate,
  }));

  const buildKycDocuments = (userId, status, uploadedAt) =>
    ['nic_front', 'nic_back', 'selfie'].map((documentType) => {
      const documentId = `doc_kyc_${userId}_${documentType}`;
      return {
        id: documentId,
        documentId,
        userId,
        ownerUserId: userId,
        category: 'kyc',
        documentType,
        originalFilename: `${documentType}.jpg`,
        fileName: `${documentType}.jpg`,
        mimeType: 'image/jpeg',
        contentType: 'image/jpeg',
        fileHash: `${userId}-${documentType}-hash`,
        cloudinaryAssetId: `seed-${documentId}`,
        cloudinaryPublicId: `seed/kyc/${userId}/${documentType}`,
        cloudinaryResourceType: 'image',
        cloudinaryDeliveryType: 'authenticated',
        fileSize: 120000,
        sizeBytes: 120000,
        uploadStatus: 'uploaded',
        status,
        source: 'user_upload',
        uploadedAt,
        createdAt: uploadedAt,
        updatedAt: uploadedAt,
        ...(status === 'approved'
          ? {
              reviewerId: 'admin_001',
              reviewTimestamp: uploadedAt,
              review: {
                reviewedAt: uploadedAt,
                reviewedBy: 'admin_001',
                notes: 'Approved seed fixture.',
                rejectionReason: '',
              },
            }
          : {}),
        ...(status === 'rejected'
          ? {
              reviewerId: 'admin_001',
              reviewTimestamp: uploadedAt,
              review: {
                reviewedAt: uploadedAt,
                reviewedBy: 'admin_001',
                notes: 'Please upload clearer documents.',
                rejectionReason: 'Identity image is unreadable.',
              },
            }
          : {}),
      };
    });

  const documents = [
    ...buildKycDocuments(
      'borrower_001',
      'approved',
      addMonths(referenceDate, -7),
    ),
    ...buildKycDocuments(
      'borrower_pending_001',
      'pending_review',
      addMonths(referenceDate, -1),
    ),
    ...buildKycDocuments(
      'borrower_rejected_001',
      'rejected',
      addMonths(referenceDate, -1),
    ),
    ...buildKycDocuments(
      'lender_pending_001',
      'pending_review',
      addMonths(referenceDate, -1),
    ),
    ...buildKycDocuments(
      'lender_rejected_001',
      'rejected',
      addMonths(referenceDate, -1),
    ),
    {
      documentId: 'doc_receipt_001',
      id: 'doc_receipt_001',
      userId: 'borrower_001',
      ownerUserId: 'borrower_001',
      category: 'payment_receipt',
      documentType: 'payment_receipt',
      storagePath: 'mock/borrower_001/receipt.pdf',
      originalFilename: 'receipt.pdf',
      fileName: 'receipt.pdf',
      mimeType: 'application/pdf',
      contentType: 'application/pdf',
      fileHash: 'doc-receipt-001-hash',
      cloudinaryAssetId: 'seed-doc-receipt-001',
      cloudinaryPublicId: 'seed/receipts/doc-receipt-001',
      cloudinaryResourceType: 'raw',
      cloudinaryDeliveryType: 'authenticated',
      fileSize: 84000,
      sizeBytes: 84000,
      checksum: null,
      uploadStatus: 'uploaded',
      status: 'approved',
      source: 'user_upload',
      uploadedAt: addMonths(referenceDate, -1),
      createdAt: addMonths(referenceDate, -1),
      updatedAt: addMonths(referenceDate, -1),
      verifiedAt: addMonths(referenceDate, -1),
      verifiedByUserId: 'lender_001',
    },
  ];

  const kycSubmissions = [
    {
      submissionId: 'kyc_001',
      userId: 'borrower_001',
      role: 'borrower',
      status: 'approved',
      documentIds: documents
        .filter((document) => document.userId === 'borrower_001')
        .map((document) => document.documentId),
      submittedAt: addMonths(referenceDate, -7),
      reviewedAt: addMonths(referenceDate, -7),
      reviewedByAdminId: 'admin_001',
      rejectionReason: null,
      createdAt: addMonths(referenceDate, -7),
      updatedAt: addMonths(referenceDate, -7),
    },
    ...[
      ['borrower_pending_001', 'borrower', 'pending', null],
      [
        'borrower_rejected_001',
        'borrower',
        'rejected',
        'Identity image is unreadable.',
      ],
      ['lender_pending_001', 'lender', 'pending', null],
      [
        'lender_rejected_001',
        'lender',
        'rejected',
        'Business document does not match the account.',
      ],
    ].map(([userId, role, status, rejectionReason]) => ({
      submissionId: `kyc_${userId}`,
      userId,
      role,
      status,
      documentIds: documents
        .filter((document) => document.userId === userId)
        .map((document) => document.documentId),
      submittedAt: addMonths(referenceDate, -1),
      reviewedAt: status === 'rejected' ? referenceDate : null,
      reviewedByAdminId: status === 'rejected' ? 'admin_001' : null,
      rejectionReason,
      createdAt: addMonths(referenceDate, -1),
      updatedAt: referenceDate,
    })),
  ];

  const loanListings = [
    {
      listingId: 'listing_001',
      lenderId: 'lender_001',
      title: 'Flexible personal financing',
      description: 'Monthly personal loans for verified borrowers.',
      purposeCategories: ['personal', 'education'],
      minAmountMinor: 5000000,
      maxAmountMinor: 25000000,
      minInterestRateAnnual: 10,
      maxInterestRateAnnual: 16,
      minTenureMonths: 3,
      maxTenureMonths: 18,
      availableCapitalMinor: 50000000,
      currency: 'LKR',
      repaymentFrequency: 'monthly',
      status: 'active',
      adminReview: {
        reviewedBy: 'admin_001',
        reviewedAt: addMonths(referenceDate, -6),
        rejectionReason: null,
      },
      publishedAt: addMonths(referenceDate, -6),
      expiresAt: addMonths(referenceDate, 6),
      createdAt: addMonths(referenceDate, -6),
      updatedAt: referenceDate,
    },
    {
      listingId: 'listing_002',
      lenderId: 'multi_role_001',
      title: 'Education loan programme',
      description: 'Fixed-term education financing.',
      purposeCategories: ['education'],
      minAmountMinor: 10000000,
      maxAmountMinor: 40000000,
      minInterestRateAnnual: 9,
      maxInterestRateAnnual: 13,
      minTenureMonths: 6,
      maxTenureMonths: 24,
      availableCapitalMinor: 80000000,
      currency: 'LKR',
      repaymentFrequency: 'monthly',
      status: 'pending_review',
      adminReview: {
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      },
      publishedAt: null,
      expiresAt: null,
      createdAt: referenceDate,
      updatedAt: referenceDate,
    },
  ];

  const loanApplications = [
    {
      applicationId: 'application_001',
      listingId: 'listing_001',
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      requestedPrincipalMinor: 12000000,
      requestedTenureMonths: 6,
      requestedPurpose: 'personal',
      purposeDescription: 'Household expense consolidation.',
      status: 'converted',
      lenderDecision: {
        approvedPrincipalMinor: 12000000,
        annualInterestRate: 12,
        approvedTenureMonths: 6,
        decisionNote: 'Approved after income review.',
        decidedAt: addMonths(referenceDate, -5),
      },
      convertedLoanId: 'loan_001',
      submittedAt: addMonths(referenceDate, -5),
      createdAt: addMonths(referenceDate, -5),
      updatedAt: addMonths(referenceDate, -5),
    },
    {
      applicationId: 'application_002',
      listingId: 'listing_001',
      lenderId: 'lender_001',
      borrowerId: 'multi_role_001',
      requestedPrincipalMinor: 8000000,
      requestedTenureMonths: 6,
      requestedPurpose: 'education',
      purposeDescription: 'Professional certification.',
      status: 'under_review',
      lenderDecision: {
        approvedPrincipalMinor: null,
        annualInterestRate: null,
        approvedTenureMonths: null,
        decisionNote: null,
        decidedAt: null,
      },
      convertedLoanId: null,
      submittedAt: referenceDate,
      createdAt: referenceDate,
      updatedAt: referenceDate,
    },
    {
      applicationId: 'application_003',
      listingId: 'listing_001',
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      requestedPrincipalMinor: 8000000,
      requestedTenureMonths: 4,
      requestedPurpose: 'business',
      purposeDescription:
        'Short-term working capital for a small inventory purchase.',
      status: 'converted',
      lenderDecision: {
        approvedPrincipalMinor: 8000000,
        annualInterestRate: 9,
        approvedTenureMonths: 4,
        decisionNote:
          'Approved for a short-term top-up after reviewing repayment history.',
        decidedAt: referenceDate,
      },
      convertedLoanId: 'loan_002',
      submittedAt: referenceDate,
      createdAt: referenceDate,
      updatedAt: referenceDate,
    },
  ];

  const principalMinor = 12000000;
  const interestAmountMinor = 720000;
  const totalRepayableMinor = principalMinor + interestAmountMinor;
  const monthlyInstallmentMinor = totalRepayableMinor / 6;
  const paidCount = 2;
  const newLoanPrincipalMinor = 8000000;
  const newLoanInterestAmountMinor = 240000;
  const newLoanTotalRepayableMinor =
    newLoanPrincipalMinor + newLoanInterestAmountMinor;
  const newLoanTenureMonths = 4;
  const newLoanMonthlyInstallmentMinor =
    newLoanTotalRepayableMinor / newLoanTenureMonths;
  const loans = [
    {
      loanId: 'loan_001',
      applicationId: 'application_001',
      listingId: 'listing_001',
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      currency: 'LKR',
      principalMinor,
      principalAmount: principalMinor / 100,
      annualInterestRate: 12,
      interestRate: 12,
      interestAmountMinor,
      totalInterest: interestAmountMinor / 100,
      totalRepayableMinor,
      totalRepayable: totalRepayableMinor / 100,
      monthlyInstallmentMinor,
      monthlyInstallment: monthlyInstallmentMinor / 100,
      tenureMonths: 6,
      amountPaidMinor: monthlyInstallmentMinor * paidCount,
      remainingBalanceMinor: monthlyInstallmentMinor * (6 - paidCount),
      outstandingBalance: (monthlyInstallmentMinor * (6 - paidCount)) / 100,
      status: 'active',
      approvedAt: addMonths(referenceDate, -5),
      disbursedAt: addMonths(referenceDate, -5),
      firstPaymentDueAt: addMonths(referenceDate, -4),
      startDate: addMonths(referenceDate, -5),
      nextDueDate: addMonths(referenceDate, -2),
      maturityDate: addMonths(referenceDate, 1),
      endDate: addMonths(referenceDate, 1),
      completedAt: null,
      termsVersion: 1,
      repaymentsMade: paidCount,
      createdAt: addMonths(referenceDate, -5),
      updatedAt: referenceDate,
    },
    {
      loanId: 'loan_002',
      applicationId: 'application_003',
      listingId: 'listing_001',
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      currency: 'LKR',
      principalMinor: newLoanPrincipalMinor,
      principalAmount: newLoanPrincipalMinor / 100,
      annualInterestRate: 9,
      interestRate: 9,
      interestAmountMinor: newLoanInterestAmountMinor,
      totalInterest: newLoanInterestAmountMinor / 100,
      totalRepayableMinor: newLoanTotalRepayableMinor,
      totalRepayable: newLoanTotalRepayableMinor / 100,
      monthlyInstallmentMinor: newLoanMonthlyInstallmentMinor,
      monthlyInstallment: newLoanMonthlyInstallmentMinor / 100,
      tenureMonths: newLoanTenureMonths,
      amountPaidMinor: 0,
      remainingBalanceMinor: newLoanTotalRepayableMinor,
      outstandingBalance: newLoanTotalRepayableMinor / 100,
      status: 'active',
      approvedAt: referenceDate,
      disbursedAt: referenceDate,
      firstPaymentDueAt: addMonths(referenceDate, 1),
      startDate: referenceDate,
      nextDueDate: addMonths(referenceDate, 1),
      maturityDate: addMonths(referenceDate, newLoanTenureMonths),
      endDate: addMonths(referenceDate, newLoanTenureMonths),
      completedAt: null,
      termsVersion: 1,
      repaymentsMade: 0,
      createdAt: referenceDate,
      updatedAt: referenceDate,
    },
  ];

  const installments = Array.from({ length: 6 }, (_, index) => {
    const sequence = index + 1;
    const installmentId = installmentIdFor(sequence);
    const paid = sequence <= paidCount;
    return {
      loanId: 'loan_001',
      installmentId,
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      sequence,
      currency: 'LKR',
      amountDueMinor: monthlyInstallmentMinor,
      status: paid ? 'paid' : 'scheduled',
      dueAt: addMonths(referenceDate, sequence - 5),
      paidTransactionId: paid ? `repayment_loan_001_${installmentId}` : null,
      paidAt: paid ? addMonths(referenceDate, sequence - 5) : null,
      note: paid ? 'Seeded full monthly settlement.' : null,
      createdAt: addMonths(referenceDate, -5),
      updatedAt: referenceDate,
    };
  }).concat(
    Array.from({ length: newLoanTenureMonths }, (_, index) => {
      const sequence = index + 1;
      return {
        loanId: 'loan_002',
        installmentId: installmentIdFor(sequence),
        lenderId: 'lender_001',
        borrowerId: 'borrower_001',
        sequence,
        currency: 'LKR',
        amountDueMinor: newLoanMonthlyInstallmentMinor,
        status: 'scheduled',
        dueAt: addMonths(referenceDate, sequence),
        paidTransactionId: null,
        paidAt: null,
        note: 'Seeded new loan installment awaiting repayment.',
        createdAt: referenceDate,
        updatedAt: referenceDate,
      };
    }),
  );

  const transactions = [
    {
      transactionId: 'disbursement_loan_001',
      type: 'disbursement',
      status: 'completed',
      currency: 'LKR',
      amountMinor: principalMinor,
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      loanId: 'loan_001',
      installmentId: null,
      listingId: 'listing_001',
      paymentMethod: 'bank_transfer',
      externalReference: 'MOCK-DISBURSE-001',
      idempotencyKey: 'disbursement_loan_001',
      receiptDocumentId: null,
      note: 'Initial loan disbursement.',
      initiatedByUserId: 'lender_001',
      completedAt: addMonths(referenceDate, -5),
      createdAt: addMonths(referenceDate, -5),
    },
    {
      transactionId: 'disbursement_loan_002',
      type: 'disbursement',
      status: 'completed',
      currency: 'LKR',
      amountMinor: newLoanPrincipalMinor,
      lenderId: 'lender_001',
      borrowerId: 'borrower_001',
      loanId: 'loan_002',
      installmentId: null,
      listingId: 'listing_001',
      paymentMethod: 'bank_transfer',
      externalReference: 'MOCK-DISBURSE-002',
      idempotencyKey: 'disbursement_loan_002',
      receiptDocumentId: null,
      note: 'New seeded loan disbursement.',
      initiatedByUserId: 'lender_001',
      completedAt: referenceDate,
      createdAt: referenceDate,
    },
    ...installments
      .filter((item) => item.status === 'paid')
      .map((item) => ({
        transactionId: item.paidTransactionId,
        type: 'repayment',
        status: 'completed',
        currency: 'LKR',
        amountMinor: item.amountDueMinor,
        lenderId: item.lenderId,
        borrowerId: item.borrowerId,
        loanId: item.loanId,
        installmentId: item.installmentId,
        listingId: 'listing_001',
        paymentMethod: 'bank_transfer',
        externalReference: `MOCK-${item.installmentId}`,
        idempotencyKey: item.paidTransactionId,
        receiptDocumentId: item.sequence === 1 ? 'doc_receipt_001' : null,
        note: 'Full monthly installment repayment.',
        initiatedByUserId: item.borrowerId,
        completedAt: item.paidAt,
        createdAt: item.paidAt,
      })),
  ];

  const disputes = [
    {
      disputeId: 'dispute_001',
      disputeCode: 'DSP-000001',
      openedByUserId: 'borrower_001',
      complainantId: 'borrower_001',
      complainantRole: 'borrower',
      respondentId: 'lender_001',
      respondentRole: 'lender',
      borrowerId: 'borrower_001',
      lenderId: 'lender_001',
      borrowerName: 'Amal Perera',
      lenderName: 'Kamal Rathnayake',
      assignedAdminId: 'admin_001',
      loanId: 'loan_001',
      installmentId: 'month_002',
      transactionId: 'repayment_loan_001_month_002',
      category: 'payment',
      subject: 'Repayment verification request',
      description: 'Please confirm the recorded repayment date.',
      desiredOutcome: 'Verify the receipt and correct the repayment date.',
      disputedAmountMinor: null,
      currency: 'LKR',
      evidenceDocumentIds: ['doc_receipt_001'],
      status: 'under_review',
      priority: 'high',
      resolution: null,
      acknowledgements: {},
      reopenCount: 0,
      resolvedAt: null,
      closedAt: null,
      createdAt: referenceDate,
      updatedAt: referenceDate,
    },
  ];
  const disputeEvents = [
    {
      disputeId: 'dispute_001',
      eventId: 'event_001',
      actorUserId: 'borrower_001',
      actorRole: 'borrower',
      type: 'created',
      message: 'Dispute opened with receipt evidence.',
      previousStatus: null,
      nextStatus: 'open',
      documentIds: ['doc_receipt_001'],
      visibility: 'shared',
      createdAt: referenceDate,
    },
  ];
  const notifications = [
    {
      notificationId: 'notification_001',
      userId: 'lender_001',
      category: 'application',
      title: 'Application awaiting review',
      body: 'A borrower submitted a new loan application.',
      entityType: 'application',
      entityId: 'application_002',
      isRead: false,
      readAt: null,
      createdAt: referenceDate,
    },
  ];
  const conversations = [
    {
      conversationId: 'conversation_001',
      participantIds: ['lender_001', 'borrower_001'],
      contextType: 'loan',
      contextId: 'loan_001',
      lastMessage: {
        messageId: 'message_001',
        senderId: 'borrower_001',
        preview: 'Thank you for confirming.',
        sentAt: referenceDate,
      },
      createdAt: addMonths(referenceDate, -5),
      updatedAt: referenceDate,
    },
  ];
  const messages = [
    {
      conversationId: 'conversation_001',
      messageId: 'message_001',
      senderId: 'borrower_001',
      type: 'text',
      text: 'Thank you for confirming.',
      documentId: null,
      readByUserIds: ['borrower_001'],
      sentAt: referenceDate,
      editedAt: null,
      deletedAt: null,
    },
  ];
  const legalDocuments = [
    {
      legalDocumentId: 'terms_001',
      type: 'terms',
      version: 1,
      title: 'Smart Credit Terms',
      content: 'Mock platform terms for development.',
      status: 'published',
      publishedAt: addMonths(referenceDate, -12),
      createdByAdminId: 'admin_001',
      createdAt: addMonths(referenceDate, -12),
      updatedAt: addMonths(referenceDate, -12),
    },
  ];
  const legalAcceptances = [
    {
      acceptanceId: 'acceptance_001',
      userId: 'borrower_001',
      legalDocumentId: 'terms_001',
      documentVersion: 1,
      acceptedAt: addMonths(referenceDate, -8),
      ipAddressHash: null,
      userAgent: 'mock-seed',
    },
  ];
  const userLocations = [
    {
      userId: 'lender_001',
      role: 'lender',
      latitude: 6.9271,
      longitude: 79.8612,
      geohash: 'tcnu',
      city: 'Colombo',
      district: 'Colombo',
      visibility: 'exact',
      updatedAt: referenceDate,
    },
  ];
  const auditLogs = [
    {
      auditLogId: 'audit_001',
      actorUserId: 'admin_001',
      actorRole: 'admin',
      action: 'listing.approved',
      entityType: 'loanListing',
      entityId: 'listing_001',
      before: { status: 'pending_review' },
      after: { status: 'active' },
      metadata: { source: 'mock-seed' },
      createdAt: addMonths(referenceDate, -6),
    },
  ];

  const fixtures = {
    users,
    authCredentials,
    documents,
    kycSubmissions,
    loanListings,
    loanApplications,
    loans,
    installments,
    transactions,
    disputes,
    disputeEvents,
    notifications,
    conversations,
    messages,
    legalDocuments,
    legalAcceptances,
    loanAgreements: [],
    loanAgreementAcceptances: [],
    userLocations,
    auditLogs,
  };

  const complete = addBulkFixtures(
    fixtures,
    config,
    referenceDate,
    passwordHash,
  );
  const searchTokens = (values) =>
    [
      ...new Set(
        values.filter(Boolean).flatMap((value) => {
          const normalized = String(value).trim().toLowerCase();
          return [
            normalized,
            ...normalized.split(/[^a-z0-9@+._-]+/).filter(Boolean),
          ];
        }),
      ),
    ].slice(0, 100);
  complete.users.forEach((user) => {
    user.primaryRole =
      user.roles?.[0] ?? user.role?.[0] ?? user.role ?? 'borrower';
    user.roles =
      user.roles ??
      (Array.isArray(user.role) ? user.role : [user.role ?? user.primaryRole]);
    user.searchTokens = searchTokens([
      user.userId,
      user.fullName,
      user.email,
      user.phone,
      ...user.roles,
    ]);
  });
  complete.loanListings.forEach((listing) => {
    listing.adminStatus = ['pending_review', 'pending', 'draft'].includes(
      listing.status,
    )
      ? 'pending'
      : ['active', 'approved', 'rejected'].includes(listing.status)
        ? listing.status
        : 'closed';
    listing.searchTokens = searchTokens([
      listing.listingId,
      listing.title,
      listing.lenderId,
      listing.lenderName,
    ]);
  });
  complete.disputes.forEach((dispute) => {
    dispute.searchTokens = searchTokens([
      dispute.disputeId,
      dispute.disputeCode,
      dispute.loanId,
      dispute.subject,
      dispute.borrowerName,
      dispute.lenderName,
    ]);
  });
  complete.transactions.forEach((transaction) => {
    transaction.platformFeeMinor =
      transaction.platformFeeMinor ??
      Math.round(Number(transaction.amountMinor ?? 0) * 0.02);
  });
  return complete;
}

module.exports = { buildSchemaV2Fixtures, installmentIdFor };
