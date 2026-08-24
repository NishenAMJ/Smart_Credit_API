import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Timestamp } from 'firebase-admin/firestore';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { FirebaseService } from '../src/firebase/firebase.service';

describe('Identity and KYC workflows (e2e)', () => {
  const testAddress = {
    line1: '10 Main Street',
    city: 'Colombo',
    district: 'Colombo',
    province: 'Western',
  };
  let app: INestApplication<App>;
  let firebase: FirebaseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    firebase = app.get(FirebaseService);
  });

  beforeEach(async () => {
    const projectId = process.env.GCLOUD_PROJECT || 'smart-credit-test';
    const response = await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );

    if (!response.ok) {
      throw new Error(`Could not clear Firestore emulator: ${response.status}`);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAdminToken() {
    const now = Timestamp.now();
    const password = 'AdminPassword123!';
    await Promise.all([
      firebase.db
        .collection('users')
        .doc('admin-e2e')
        .set({
          userId: 'admin-e2e',
          uid: 'admin-e2e',
          fullName: 'Workflow Admin',
          email: 'admin@example.test',
          phone: '+94770000999',
          roles: ['admin'],
          primaryRole: 'admin',
          kycStatus: 'approved',
          accountStatus: 'active',
          createdAt: now,
          updatedAt: now,
        }),
      firebase.db
        .collection('authCredentials')
        .doc('admin-e2e')
        .set({
          userId: 'admin-e2e',
          passwordHash: await bcrypt.hash(password, 4),
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
          createdAt: now,
          updatedAt: now,
        }),
    ]);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'admin@example.test', password, role: 'admin' })
      .expect(200);
    return login.body.accessToken as string;
  }

  function imageData(label: string) {
    return `data:image/jpeg;base64,${Buffer.from(label).toString('base64')}`;
  }

  it('uses the same /api prefix and validation as production', async () => {
    await request(app.getHttpServer()).get('/api').expect(200);

    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: '',
        email: 'not-an-email',
        phone: '12',
        password: 'short',
        role: 'admin',
      })
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Full name is required.',
        'Please provide a valid email address.',
        'Password must be at least 8 characters long.',
        'Role must be either borrower or lender.',
      ]),
    );
  });

  it('registers, restores a session, enforces roles, and blocks suspended users', async () => {
    const account = {
      fullName: 'Test Borrower',
      email: 'borrower@example.test',
      phone: '+94771234567',
      address: testAddress,
      password: 'Password123!',
      role: 'borrower',
    };

    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(account)
      .expect(201);
    const userId = registration.body.user.uid as string;

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(account)
      .expect(409);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: account.email,
        password: account.password,
        role: 'borrower',
      })
      .expect(200);
    const token = login.body.accessToken as string;

    const session = await request(app.getHttpServer())
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(session.body).toMatchObject({
      activeRole: 'borrower',
      accountStatus: 'active',
    });

    await request(app.getHttpServer())
      .get('/api/auth/lender/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/borrower/profile/another-user')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/borrower/profile/another-user')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/borrower/profile/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'WrongPassword123!',
        password: 'UpdatedPassword123!',
      })
      .expect(401);
    await request(app.getHttpServer())
      .put(`/api/borrower/profile/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: account.password,
        password: 'UpdatedPassword123!',
      })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: account.email, password: account.password })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: account.email,
        password: 'UpdatedPassword123!',
      })
      .expect(200);

    await firebase.db.collection('users').doc(userId).update({
      accountStatus: 'suspended',
      updatedAt: Timestamp.now(),
    });
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: account.email, password: account.password })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/session')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('returns one canonical KYC submission for mobile session restoration', async () => {
    const account = {
      fullName: 'KYC Borrower',
      email: 'kyc@example.test',
      phone: '+94770000001',
      address: testAddress,
      password: 'Password123!',
      role: 'borrower',
    };
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(account)
      .expect(201);
    const userId = registration.body.user.uid as string;
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: account.email, password: account.password })
      .expect(200);
    const token = login.body.accessToken as string;

    const empty = await request(app.getHttpServer())
      .get('/api/kyc/my-submission')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(empty.body).toEqual({ submission: null });

    const submittedAt = Timestamp.now();
    await Promise.all([
      firebase.db.collection('users').doc(userId).update({
        nic: '200012345678',
        kycStatus: 'pending',
        kycFiles: { submittedAt },
        updatedAt: submittedAt,
      }),
      firebase.db.collection('documents').doc('nic-front').set({
        id: 'nic-front',
        userId,
        fullName: account.fullName,
        category: 'kyc',
        documentType: 'nic_front',
        originalFilename: 'nic-front.jpg',
        mimeType: 'image/jpeg',
        fileHash: 'front-hash',
        cloudinaryAssetId: 'test-front',
        cloudinaryPublicId: 'test/front',
        cloudinaryResourceType: 'image',
        cloudinaryDeliveryType: 'authenticated',
        fileSize: 100,
        uploadStatus: 'uploaded',
        status: 'pending_review',
        source: 'user_upload',
        uploadedAt: submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt,
      }),
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/kyc/my-submission')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.submission).toMatchObject({
      id: 'nic-front',
      userId,
      status: 'pending',
      documentType: 'national_identity_card',
      documentNumber: '200012345678',
      fullName: account.fullName,
    });
    expect(response.body.submission.submittedAt).toEqual(expect.any(String));
  });

  it('approves the complete grouped KYC submission and synchronizes the borrower', async () => {
    const account = {
      fullName: 'Approval Borrower',
      email: 'approval@example.test',
      phone: '+94770000011',
      address: testAddress,
      password: 'Password123!',
      role: 'borrower',
    };
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(account)
      .expect(201);
    const userId = registration.body.user.uid as string;
    const borrowerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: account.email, password: account.password })
      .expect(200);
    const borrowerToken = borrowerLogin.body.accessToken as string;
    const adminToken = await createAdminToken();

    await request(app.getHttpServer())
      .patch('/api/location/me')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        latitude: 6.9271,
        longitude: 79.8612,
        city: testAddress.city,
        district: testAddress.district,
        visibility: 'approximate',
      })
      .expect(200);

    const submission = await request(app.getHttpServer())
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        documentType: 'national_id',
        documentNumber: '200011111111',
        fullName: 'Approval Borrower Identity',
        issuingCountry: 'Sri Lanka',
        expiryDate: '2030-12-31',
        documentFrontUrl: imageData('approval-front'),
        documentBackUrl: imageData('approval-back'),
        selfieUrl: imageData('approval-selfie'),
      })
      .expect(201);
    expect(submission.body.submission.status).toBe('pending');
    expect(submission.body.documentIds).toHaveLength(3);

    const queue = await request(app.getHttpServer())
      .get('/api/admin/kyc/pending?limit=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(queue.body.documents).toHaveLength(3);
    expect(
      new Set(
        queue.body.documents.map(
          (document: { userId: string }) => document.userId,
        ),
      ),
    ).toEqual(new Set([userId]));
    expect(queue.body.documents[0]).toMatchObject({
      applicant: {
        fullName: account.fullName,
        email: account.email,
        phone: account.phone,
        role: 'borrower',
        address: testAddress,
      },
      identityDetails: {
        documentType: 'national_id',
        documentNumber: '200011111111',
        fullName: 'Approval Borrower Identity',
        issuingCountry: 'Sri Lanka',
        expiryDate: '2030-12-31',
      },
      location: {
        latitude: 6.9271,
        longitude: 79.8612,
        city: 'Colombo',
        district: 'Colombo',
        visibility: 'approximate',
      },
    });

    await request(app.getHttpServer())
      .post(`/api/admin/kyc/${submission.body.documentIds[0]}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Identity confirmed in E2E.' })
      .expect(200);

    const [user, documents, notification, mobileStatus] = await Promise.all([
      firebase.db.collection('users').doc(userId).get(),
      firebase.db.collection('documents').where('userId', '==', userId).get(),
      firebase.db
        .collection('borrowerNotifications')
        .doc(`kyc-approved-${userId}`)
        .get(),
      request(app.getHttpServer())
        .get('/api/kyc/my-submission')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .expect(200),
    ]);
    expect(user.get('kycStatus')).toBe('approved');
    expect(user.get('fullName')).toBe(account.fullName);
    expect(user.get('kycDetails')).toMatchObject({
      fullName: 'Approval Borrower Identity',
      documentNumber: '200011111111',
    });
    expect(documents.docs.map((document) => document.get('status'))).toEqual([
      'approved',
      'approved',
      'approved',
    ]);
    expect(notification.exists).toBe(true);
    expect(mobileStatus.body.submission.status).toBe('approved');
  });

  it('notifies rejection and resubmits new files with the existing session', async () => {
    const account = {
      fullName: 'Resubmit Borrower',
      email: 'resubmit@example.test',
      phone: '+94770000012',
      address: testAddress,
      password: 'Password123!',
      role: 'borrower',
    };
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(account)
      .expect(201);
    const userId = registration.body.user.uid as string;
    const borrowerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: account.email, password: account.password })
      .expect(200);
    const borrowerToken = borrowerLogin.body.accessToken as string;
    const adminToken = await createAdminToken();
    const submission = await request(app.getHttpServer())
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        documentType: 'national_identity_card',
        documentNumber: '200022222222',
        fullName: account.fullName,
        documentFrontUrl: imageData('rejected-front'),
        documentBackUrl: imageData('rejected-back'),
        selfieUrl: imageData('rejected-selfie'),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/admin/kyc/${submission.body.documentIds[0]}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Images are blurred; upload clear replacements.' })
      .expect(200);

    const rejectionNotice = await firebase.db
      .collection('borrowerNotifications')
      .doc(`kyc-rejected-${userId}`)
      .get();
    expect(rejectionNotice.exists).toBe(true);
    expect(rejectionNotice.get('actionTarget')).toBe('kyc-resubmit');

    await request(app.getHttpServer())
      .post('/api/kyc/resubmit')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        documentFrontUrl: imageData('replacement-front'),
        documentBackUrl: imageData('replacement-back'),
        selfieUrl: imageData('replacement-selfie'),
      })
      .expect(201);

    const mobileStatus = await request(app.getHttpServer())
      .get('/api/kyc/my-submission')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .expect(200);
    expect(mobileStatus.body.submission.status).toBe('pending');

    const documents = await firebase.db
      .collection('documents')
      .where('userId', '==', userId)
      .get();
    expect(
      documents.docs.filter(
        (document) => document.get('status') === 'rejected',
      ),
    ).toHaveLength(3);
    expect(
      documents.docs.filter(
        (document) => document.get('status') === 'pending_review',
      ),
    ).toHaveLength(3);
  });

  it('converts one application, activates its agreement, settles once, and opens one dispute', async () => {
    const borrower = {
      fullName: 'Lifecycle Borrower',
      email: 'lifecycle-borrower@example.test',
      phone: '+94770000021',
      address: testAddress,
      password: 'Password123!',
      role: 'borrower',
    };
    const lender = {
      fullName: 'Lifecycle Lender',
      email: 'lifecycle-lender@example.test',
      phone: '+94770000022',
      address: testAddress,
      password: 'Password123!',
      role: 'lender',
    };
    const [borrowerRegistration, lenderRegistration] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/register')
        .send(borrower)
        .expect(201),
      request(app.getHttpServer())
        .post('/api/auth/register')
        .send(lender)
        .expect(201),
    ]);
    const borrowerId = borrowerRegistration.body.user.uid as string;
    const lenderId = lenderRegistration.body.user.uid as string;
    await Promise.all([
      firebase.db.collection('users').doc(borrowerId).update({
        kycStatus: 'approved',
        updatedAt: Timestamp.now(),
      }),
      firebase.db.collection('users').doc(lenderId).update({
        kycStatus: 'approved',
        updatedAt: Timestamp.now(),
      }),
    ]);
    const [borrowerLogin, lenderLogin] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: borrower.email, password: borrower.password })
        .expect(200),
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: lender.email, password: lender.password })
        .expect(200),
    ]);
    const borrowerToken = borrowerLogin.body.accessToken as string;
    const lenderToken = lenderLogin.body.accessToken as string;
    const adminToken = await createAdminToken();
    const now = Timestamp.now();
    await firebase.db.collection('loanListings').doc('listing-e2e').set({
      listingId: 'listing-e2e',
      lenderId,
      title: 'Lifecycle loan',
      status: 'active',
      currency: 'LKR',
      minAmountMinor: 1_000_000,
      maxAmountMinor: 50_000_000,
      minInterestRateAnnual: 10,
      maxInterestRateAnnual: 20,
      minTenureMonths: 3,
      maxTenureMonths: 24,
      createdAt: now,
      updatedAt: now,
    });

    const applicationPayload = {
      adId: 'listing-e2e',
      amount: 120_000,
      purpose: 'business',
      description: 'Inventory for an existing retail business.',
      tenureMonths: 12,
      preferredRepaymentMethod: 'card',
    };
    const firstApplication = await request(app.getHttpServer())
      .post('/api/borrower/applications')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send(applicationPayload)
      .expect(201);
    const repeatedApplication = await request(app.getHttpServer())
      .post('/api/borrower/applications')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send(applicationPayload)
      .expect(201);
    const applicationId = firstApplication.body.data.applicationId as string;
    expect(repeatedApplication.body.data.applicationId).toBe(applicationId);

    const conversion = await request(app.getHttpServer())
      .post(`/api/loan-requests/${applicationId}/decision`)
      .set('Authorization', `Bearer ${lenderToken}`)
      .send({ decision: 'approve', note: 'Terms verified.' })
      .expect(201);
    const repeatedConversion = await request(app.getHttpServer())
      .post(`/api/loan-requests/${applicationId}/decision`)
      .set('Authorization', `Bearer ${lenderToken}`)
      .send({ decision: 'approve', note: 'Terms verified.' })
      .expect(201);
    expect(repeatedConversion.body).toMatchObject({
      loanId: conversion.body.loanId,
      agreementId: conversion.body.agreementId,
    });

    const agreementSnapshot = await firebase.db
      .collection('loanAgreements')
      .doc(conversion.body.agreementId)
      .get();
    const agreement = agreementSnapshot.data()!;
    await request(app.getHttpServer())
      .post(`/api/legal/documents/${conversion.body.agreementId}/accept`)
      .set('Authorization', `Bearer ${lenderToken}`)
      .send({
        signedName: lender.fullName,
        consentAccepted: true,
        agreementVersion: agreement.version,
        termsHash: agreement.termsHash,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(
        `/api/legal/documents/${conversion.body.agreementId}/disbursement-confirmation`,
      )
      .set('Authorization', `Bearer ${lenderToken}`)
      .send({
        confirmationAccepted: true,
        externalReference: 'BANK-E2E-0001',
      })
      .expect(201);
    const borrowerAcceptance = await request(app.getHttpServer())
      .post(`/api/legal/documents/${conversion.body.agreementId}/accept`)
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({
        signedName: borrower.fullName,
        consentAccepted: true,
        fundsReceivedConfirmed: true,
        agreementVersion: agreement.version,
        termsHash: agreement.termsHash,
      })
      .expect(201);
    expect(borrowerAcceptance.body.document.status).toBe('fully_accepted');

    const installments = await firebase.db
      .collection('loans')
      .doc(conversion.body.loanId)
      .collection('installments')
      .orderBy('sequence', 'asc')
      .get();
    expect(installments.docs).toHaveLength(12);
    const installmentId = installments.docs[0].id;
    const firstSettlement = await request(app.getHttpServer())
      .post(
        `/api/ledger/loans/${conversion.body.loanId}/installments/${installmentId}/settle`,
      )
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({ paymentMethod: 'card', externalReference: 'CARD-E2E-0001' })
      .expect(201);
    const repeatedSettlement = await request(app.getHttpServer())
      .post(
        `/api/ledger/loans/${conversion.body.loanId}/installments/${installmentId}/settle`,
      )
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send({ paymentMethod: 'card', externalReference: 'CARD-E2E-0001' })
      .expect(201);
    expect(repeatedSettlement.body.transactionId).toBe(
      firstSettlement.body.transactionId,
    );

    const disputePayload = {
      loanId: conversion.body.loanId,
      transactionId: firstSettlement.body.transactionId,
      installmentId,
      category: 'payment',
      subject: 'Payment confirmation review',
      description: 'Please verify the completed payment ledger entry.',
      desiredOutcome: 'Confirm that the installment is fully settled.',
      evidenceDocumentIds: [],
    };
    const dispute = await request(app.getHttpServer())
      .post('/api/disputes')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send(disputePayload)
      .expect(201);
    expect(dispute.body.dispute).toMatchObject({
      status: 'open',
      borrowerId,
      lenderId,
    });
    await request(app.getHttpServer())
      .post('/api/disputes')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .send(disputePayload)
      .expect(409);

    const stats = await request(app.getHttpServer())
      .get('/api/admin/disputes/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(stats.body.stats).toMatchObject({ all: 1, open: 1 });
  }, 30_000);
});
