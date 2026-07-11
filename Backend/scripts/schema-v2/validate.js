'use strict';

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
  fixtures.loanListings.forEach((record) => {
    assert(
      userIds.has(record.lenderId),
      `listing lender ${record.lenderId} is missing`,
    );
    assert(
      record.minAmountMinor <= record.maxAmountMinor,
      `listing ${record.listingId} amount range is invalid`,
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
    assert(
      schedule.length === loan.tenureMonths,
      `loan ${loan.loanId} installment count differs from tenure`,
    );
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
  });

  return {
    users: fixtures.users.length,
    authCredentials: fixtures.authCredentials.length,
    documents: fixtures.documents.length,
    kycSubmissions: fixtures.kycSubmissions.length,
    loanListings: fixtures.loanListings.length,
    loanApplications: fixtures.loanApplications.length,
    loans: fixtures.loans.length,
    installments: fixtures.installments.length,
    transactions: fixtures.transactions.length,
    disputes: fixtures.disputes.length,
    notifications: fixtures.notifications.length,
    conversations: fixtures.conversations.length,
    messages: fixtures.messages.length,
  };
}

module.exports = { validateFixtures };
