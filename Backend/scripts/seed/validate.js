'use strict';

const collections = require('./collections');

function assert(condition, message) {
  if (!condition) throw new Error(`Schema v2 validation failed: ${message}`);
}

function validateFixtures(fixtures) {
  const ids = (records, key) => new Set(records.map((record) => record[key]));
  const userIds = ids(fixtures.users, 'userId');
  const listingIds = ids(fixtures.loanListings, 'listingId');
  const applicationIds = ids(fixtures.loanApplications, 'applicationId');
  const loanIds = ids(fixtures.loans, 'loanId');
  const transactionIds = ids(fixtures.transactions, 'transactionId');
  const documentIds = ids(fixtures.documents, 'documentId');
  const agreementIds = ids(fixtures.loanAgreements, 'agreementId');

  const assertUnique = (records, key, label) => {
    const values = records.map((record) => record[key]);
    assert(
      new Set(values).size === values.length,
      `${label} contains duplicate ${key} values`,
    );
  };
  assertUnique(fixtures.users, 'userId', 'users');
  assertUnique(fixtures.users, 'email', 'users');
  assertUnique(fixtures.users, 'phone', 'users');
  assertUnique(fixtures.documents, 'documentId', 'documents');
  assertUnique(fixtures.kycSubmissions, 'submissionId', 'KYC submissions');
  assertUnique(fixtures.loanListings, 'listingId', 'loan listings');
  assertUnique(fixtures.loanApplications, 'applicationId', 'loan applications');
  assertUnique(fixtures.loans, 'loanId', 'loans');
  assertUnique(fixtures.transactions, 'transactionId', 'transactions');
  assertUnique(fixtures.loanAgreements, 'agreementId', 'loan agreements');
  assertUnique(
    fixtures.loanAgreementAcceptances,
    'acceptanceId',
    'loan agreement acceptances',
  );

  fixtures.authCredentials.forEach((record) => {
    assert(
      userIds.has(record.userId),
      `credential user ${record.userId} is missing`,
    );
    assert(
      record.passwordHash.startsWith('$2'),
      `credential ${record.userId} is not bcrypt hashed`,
    );
  });
  fixtures.kycSubmissions.forEach((submission) => {
    const user = fixtures.users.find(
      (record) => record.userId === submission.userId,
    );
    assert(Boolean(user), `KYC user ${submission.userId} is missing`);
    assert(
      user.kycStatus === submission.status,
      `KYC status for ${submission.userId} differs from canonical user status`,
    );
    submission.documentIds.forEach((documentId) =>
      assert(
        documentIds.has(documentId),
        `KYC document ${documentId} is missing`,
      ),
    );
  });
  fixtures.loanListings.forEach((record) => {
    assert(
      userIds.has(record.lenderId),
      `listing lender ${record.lenderId} is missing`,
    );
    assert(
      record.minAmountMinor <= record.maxAmountMinor,
      `listing ${record.listingId} amount range is invalid`,
    );
    assert(
      record.minAmountMinor >= 10000 * 100 &&
        record.maxAmountMinor <= 5000000 * 100,
      `listing ${record.listingId} amount is outside platform limits`,
    );
    assert(
      Number.isInteger(record.minTenureMonths) &&
        Number.isInteger(record.maxTenureMonths) &&
        record.minTenureMonths >= 3 &&
        record.maxTenureMonths <= 60 &&
        record.minTenureMonths <= record.maxTenureMonths,
      `listing ${record.listingId} tenure range is invalid`,
    );
  });
  fixtures.loanApplications.forEach((record) => {
    assert(
      listingIds.has(record.listingId),
      `application listing ${record.listingId} is missing`,
    );
    assert(
      userIds.has(record.lenderId) && userIds.has(record.borrowerId),
      `application ${record.applicationId} participant is missing`,
    );
    const listing = fixtures.loanListings.find(
      (item) => item.listingId === record.listingId,
    );
    assert(
      listing.lenderId === record.lenderId,
      `application ${record.applicationId} lender differs from listing`,
    );
    assert(
      record.requestedPrincipalMinor >= listing.minAmountMinor &&
        record.requestedPrincipalMinor <= listing.maxAmountMinor,
      `application ${record.applicationId} amount is outside listing terms`,
    );
    assert(
      record.requestedTenureMonths >= listing.minTenureMonths &&
        record.requestedTenureMonths <= listing.maxTenureMonths,
      `application ${record.applicationId} tenure is outside listing terms`,
    );
    if (record.convertedLoanId)
      assert(
        loanIds.has(record.convertedLoanId),
        `converted loan ${record.convertedLoanId} is missing`,
      );
  });
  fixtures.loans.forEach((loan) => {
    assert(
      applicationIds.has(loan.applicationId),
      `loan application ${loan.applicationId} is missing`,
    );
    const schedule = fixtures.installments.filter(
      (item) => item.loanId === loan.loanId,
    );
    const expectedScheduleLength =
      loan.status === 'pending_disbursement' ? 0 : loan.tenureMonths;
    assert(
      schedule.length === expectedScheduleLength,
      `loan ${loan.loanId} installment count differs from lifecycle`,
    );
    if (loan.status === 'pending_disbursement') {
      assert(
        loan.amountPaidMinor === 0 &&
          loan.remainingBalanceMinor === loan.totalRepayableMinor,
        `pending loan ${loan.loanId} balance is invalid`,
      );
      return;
    }
    const scheduledTotal = schedule.reduce(
      (sum, item) => sum + item.amountDueMinor,
      0,
    );
    assert(
      scheduledTotal === loan.totalRepayableMinor,
      `loan ${loan.loanId} schedule total is incorrect`,
    );
    const paidTotal = schedule
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + item.amountDueMinor, 0);
    assert(
      paidTotal === loan.amountPaidMinor,
      `loan ${loan.loanId} paid total is incorrect`,
    );
    assert(
      loan.remainingBalanceMinor === loan.totalRepayableMinor - paidTotal,
      `loan ${loan.loanId} remaining balance is incorrect`,
    );
  });
  fixtures.installments.forEach((item) => {
    assert(
      loanIds.has(item.loanId),
      `installment loan ${item.loanId} is missing`,
    );
    if (item.status === 'paid') {
      assert(
        Boolean(item.paidTransactionId),
        `paid installment ${item.installmentId} has no transaction`,
      );
      assert(
        transactionIds.has(item.paidTransactionId),
        `repayment ${item.paidTransactionId} is missing`,
      );
    }
  });
  fixtures.transactions.forEach((record) => {
    assert(
      record.amountMinor > 0,
      `transaction ${record.transactionId} has invalid amount`,
    );
    if (record.loanId)
      assert(
        loanIds.has(record.loanId),
        `transaction loan ${record.loanId} is missing`,
      );
    if (record.receiptDocumentId)
      assert(
        documentIds.has(record.receiptDocumentId),
        `receipt ${record.receiptDocumentId} is missing`,
      );
    if (record.type === 'repayment') {
      const installment = fixtures.installments.find(
        (item) =>
          item.loanId === record.loanId &&
          item.installmentId === record.installmentId,
      );
      assert(
        Boolean(installment),
        `repayment ${record.transactionId} installment is missing`,
      );
      assert(
        installment.amountDueMinor === record.amountMinor,
        `repayment ${record.transactionId} amount differs from installment`,
      );
      assert(
        installment.paidTransactionId === record.transactionId,
        `repayment ${record.transactionId} is not linked from installment`,
      );
    }
  });

  fixtures.loanAgreements.forEach((agreement) => {
    assert(loanIds.has(agreement.loanId), `agreement loan ${agreement.loanId} is missing`);
    assert(userIds.has(agreement.borrowerId), `agreement borrower ${agreement.borrowerId} is missing`);
    assert(userIds.has(agreement.lenderId), `agreement lender ${agreement.lenderId} is missing`);
    assert(/^[a-f0-9]{64}$/.test(agreement.termsHash), `agreement ${agreement.agreementId} hash is invalid`);
    if (['awaiting_disbursement', 'partially_accepted'].includes(agreement.status)) {
      assert(
        agreement.lenderAcceptance.accepted &&
          !agreement.borrowerAcceptance.accepted,
        `agreement ${agreement.agreementId} must be lender-signed first`,
      );
    }
    if (agreement.status === 'awaiting_borrower_signature') {
      assert(
        agreement.lenderAcceptance.accepted &&
          agreement.disbursementConfirmation.confirmed &&
          !agreement.borrowerAcceptance.accepted,
        `agreement ${agreement.agreementId} must be transfer-confirmed`,
      );
    }
    if (agreement.status === 'finalization_failed') {
      assert(
        agreement.lenderAcceptance.accepted &&
          agreement.disbursementConfirmation.confirmed &&
          agreement.borrowerAcceptance.accepted,
        `agreement ${agreement.agreementId} must retain both signatures`,
      );
    }
  });
  fixtures.loanAgreementAcceptances.forEach((acceptance) => {
    assert(agreementIds.has(acceptance.agreementId), `acceptance agreement ${acceptance.agreementId} is missing`);
    assert(userIds.has(acceptance.userId), `acceptance user ${acceptance.userId} is missing`);
  });

  fixtures.conversations.forEach((record) => {
    record.participantIds.forEach((userId) =>
      assert(
        userIds.has(userId),
        `conversation ${record.conversationId} participant ${userId} is missing`,
      ),
    );
  });
  fixtures.messages.forEach((record) => {
    const conversation = fixtures.conversations.find(
      (item) => item.conversationId === record.conversationId,
    );
    assert(
      Boolean(conversation),
      `message ${record.messageId} conversation is missing`,
    );
    assert(
      conversation.participantIds.includes(record.senderId),
      `message ${record.messageId} sender is not a participant`,
    );
  });

  const counts = Object.fromEntries(
    collections.map((collection) => [
      collection.fixtureKey,
      collection.records(fixtures).length,
    ]),
  );

  return {
    ...counts,
    totalDocuments: Object.values(counts).reduce(
      (total, count) => total + count,
      0,
    ),
  };
}

module.exports = { validateFixtures };
