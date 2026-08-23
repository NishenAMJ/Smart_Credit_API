import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { PayHereService } from '../../../common/payhere/payhere.service';
import type { PayHereNotification } from '../../../common/payhere/payhere.types';
import { writeAuditLog } from '../../../common/audit/write-audit-log';
import { FirebaseService } from '../../../firebase/firebase.service';
import { LenderNotificationWriterService } from '../lender-notifications/lender-notification-writer.service';
import {
  AdBoostPaymentMethod,
  AdBoostPlan,
  AdBoostResponse,
} from './ad-boosts.types';
import { RoleNotificationService } from '../../../common/notifications/role-notification.service';

@Injectable()
export class AdBoostsService implements OnModuleInit, OnModuleDestroy {
  private readonly boostsCollection = 'adBoostRequests';
  private readonly ordersCollection = 'adBoostPayHerePayments';
  private reconciliationTimer?: NodeJS.Timeout;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
    private readonly notificationWriter: LenderNotificationWriterService,
    private readonly payHere: PayHereService,
    @Optional() private readonly roleNotifications?: RoleNotificationService,
  ) {}

  private get db() {
    return this.firebaseService.getDb();
  }

  getPlans() {
    const bankAccount = {
      bankName: this.configService.get<string>('BOOST_BANK_NAME') ?? '',
      accountName:
        this.configService.get<string>('BOOST_BANK_ACCOUNT_NAME') ?? '',
      accountNumber:
        this.configService.get<string>('BOOST_BANK_ACCOUNT_NUMBER') ?? '',
      branch: this.configService.get<string>('BOOST_BANK_BRANCH') ?? '',
    };
    return {
      plans: [
        this.plan('boost_7_days', '7 days', 7, 1500),
        this.plan('boost_14_days', '14 days', 14, 2500),
        this.plan('boost_30_days', '30 days', 30, 4500),
      ],
      bankAccount,
      paymentMethods: {
        card:
          Boolean(this.configService.get<string>('PAYHERE_MERCHANT_ID')) &&
          Boolean(this.configService.get<string>('PAYHERE_MERCHANT_SECRET')),
        bankTransfer: Object.values(bankAccount).every(
          (value) => value.trim().length > 0,
        ),
      },
    };
  }

  async createBoost(
    lenderId: string,
    input: {
      listingId: string;
      planId: string;
      paymentMethod: AdBoostPaymentMethod;
      requestBaseUrl: string;
    },
  ) {
    if (!['bank_transfer', 'card'].includes(input.paymentMethod)) {
      throw new BadRequestException('Choose bank_transfer or card payment.');
    }
    const plan = this.getPlans().plans.find((item) => item.id === input.planId);
    if (!plan) {
      throw new BadRequestException('The selected boost plan is invalid.');
    }
    if (
      input.paymentMethod === 'card' &&
      (!this.configService.get<string>('PAYHERE_MERCHANT_ID') ||
        !this.configService.get<string>('PAYHERE_MERCHANT_SECRET'))
    ) {
      throw new ServiceUnavailableException(
        'Card boost payments are temporarily unavailable. Choose another configured payment method.',
      );
    }
    if (
      input.paymentMethod === 'bank_transfer' &&
      !this.getPlans().paymentMethods.bankTransfer
    ) {
      throw new ServiceUnavailableException(
        'Bank-transfer boost payments are temporarily unavailable because the platform bank account is not configured.',
      );
    }
    if (input.paymentMethod === 'card') {
      const profile = (
        await this.db.collection('users').doc(lenderId).get()
      ).data();
      if (
        !String(profile?.email ?? '').trim() ||
        !String(profile?.phone ?? '').trim()
      ) {
        throw new BadRequestException(
          'A verified email address and phone number are required for card payments.',
        );
      }
    }

    const listingRef = this.db.collection('loanListings').doc(input.listingId);
    const boostRef = this.db.collection(this.boostsCollection).doc();
    const transactionId = `boost_${boostRef.id}`;
    const transactionRef = this.db.collection('transactions').doc(transactionId);
    const now = Timestamp.now();

    await this.db.runTransaction(async (transaction) => {
      const listingSnapshot = await transaction.get(listingRef);
      if (!listingSnapshot.exists) {
        throw new NotFoundException('Advertisement not found.');
      }
      const listing = listingSnapshot.data() ?? {};
      if (listing.lenderId !== lenderId) {
        throw new ForbiddenException(
          'You can only boost your own advertisement.',
        );
      }
      if (listing.status !== 'active') {
        throw new BadRequestException(
          'Only active, admin-approved advertisements can be boosted.',
        );
      }
      const activeUntil = this.toDate(listing.boostEndsAt);
      const hasLiveBoost =
        activeUntil !== null && activeUntil.getTime() > Date.now();
      const boostStatus = String(listing.boostStatus ?? '');
      const paymentExpiresAt = this.toDate(listing.boostPaymentExpiresAt);
      const hasPendingPayment =
        ['payment_pending', 'pending_verification'].includes(boostStatus) &&
        (boostStatus === 'pending_verification' ||
          (paymentExpiresAt?.getTime() ?? 0) > Date.now());
      if (
        hasLiveBoost ||
        hasPendingPayment
      ) {
        throw new BadRequestException(
          'This advertisement already has a pending or active boost.',
        );
      }

      transaction.set(boostRef, {
        boostId: boostRef.id,
        listingId: input.listingId,
        lenderId,
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        amountMinor: plan.amountMinor,
        currency: plan.currency,
        paymentMethod: input.paymentMethod,
        status: 'payment_pending',
        transactionId,
        receiptDocumentId: null,
        bankReference: null,
        rejectionReason: null,
        startsAt: null,
        endsAt: null,
        submittedAt: null,
        reviewedAt: null,
        reviewedByAdminId: null,
        paymentExpiresAt: Timestamp.fromMillis(
          now.toMillis() + 30 * 60_000,
        ),
        createdAt: now,
        updatedAt: now,
      });
      transaction.set(transactionRef, {
        transactionId,
        type: 'listing_boost',
        status: 'pending',
        currency: plan.currency,
        amountMinor: plan.amountMinor,
        platformFeeMinor: plan.amountMinor,
        lenderId,
        borrowerId: null,
        loanId: null,
        installmentId: null,
        listingId: input.listingId,
        paymentMethod: input.paymentMethod,
        externalReference: null,
        idempotencyKey: transactionId,
        receiptDocumentId: null,
        note: `${plan.name} advertisement boost`,
        initiatedByUserId: lenderId,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      transaction.update(listingRef, {
        boostStatus: 'payment_pending',
        activeBoostId: boostRef.id,
        isBoosted: false,
        boostPaymentExpiresAt: Timestamp.fromMillis(
          now.toMillis() + 30 * 60_000,
        ),
        updatedAt: now,
      });
    });

    const response = this.mapBoost(
      boostRef.id,
      (await boostRef.get()).data() ?? {},
    );
    if (input.paymentMethod === 'card') {
      return {
        ...response,
        checkout: await this.createCardOrder(response, input.requestBaseUrl),
      };
    }
    return { ...response, bankAccount: this.getPlans().bankAccount };
  }

  async submitBankReceipt(
    lenderId: string,
    boostId: string,
    input: { receiptDocumentId: string; bankReference: string },
  ) {
    const receiptDocumentId = input.receiptDocumentId?.trim();
    const bankReference = input.bankReference?.trim();
    if (!receiptDocumentId || !bankReference) {
      throw new BadRequestException(
        'Receipt and bank reference are required.',
      );
    }
    const duplicate = await this.db
      .collection(this.boostsCollection)
      .where('bankReference', '==', bankReference)
      .limit(1)
      .get();
    if (!duplicate.empty && duplicate.docs[0].id !== boostId) {
      throw new BadRequestException(
        'This bank reference has already been submitted.',
      );
    }

    const boostRef = this.db.collection(this.boostsCollection).doc(boostId);
    const receiptRef = this.db.collection('documents').doc(receiptDocumentId);
    await this.db.runTransaction(async (transaction) => {
      const boostSnapshot = await transaction.get(boostRef);
      const receiptSnapshot = await transaction.get(receiptRef);
      if (!boostSnapshot.exists) {
        throw new NotFoundException('Boost request not found.');
      }
      const boost = boostSnapshot.data() ?? {};
      if (boost.lenderId !== lenderId) {
        throw new ForbiddenException('This boost belongs to another lender.');
      }
      if (
        boost.paymentMethod !== 'bank_transfer' ||
        boost.status !== 'payment_pending'
      ) {
        throw new BadRequestException(
          'This boost is not waiting for a bank receipt.',
        );
      }
      const receipt = receiptSnapshot.data() ?? {};
      if (
        !receiptSnapshot.exists ||
        receipt.userId !== lenderId ||
        receipt.category !== 'payment_receipt' ||
        receipt.relatedEntityType !== 'ad_boost' ||
        receipt.relatedEntityId !== boostId
      ) {
        throw new BadRequestException(
          'The receipt is not a valid payment proof for this boost.',
        );
      }
      const submittedAt = Timestamp.now();
      transaction.update(boostRef, {
        status: 'pending_verification',
        receiptDocumentId,
        bankReference,
        submittedAt,
        updatedAt: submittedAt,
      });
      transaction.update(
        this.db.collection('transactions').doc(String(boost.transactionId)),
        {
          status: 'pending_verification',
          receiptDocumentId,
          externalReference: bankReference,
          updatedAt: submittedAt,
        },
      );
      transaction.update(
        this.db.collection('loanListings').doc(String(boost.listingId)),
        { boostStatus: 'pending_verification', updatedAt: submittedAt },
      );
    });
    await this.roleNotifications?.createAdmin({
      eventType: 'boost_payment_submitted',
      eventId: boostId,
      category: 'boost_payment',
      title: 'Boost payment awaiting verification',
      message: 'A lender submitted a bank receipt for an advertisement boost.',
      severity: 'warning',
      entityType: 'adBoost',
      entityId: boostId,
      actionLabel: 'Verify payment',
      actionTarget: '/admin/boost-payments',
      metadata: { status: 'pending_verification' },
    }).catch(() => undefined);
    return this.getBoost(lenderId, boostId);
  }

  async listForLender(lenderId: string) {
    const snapshot = await this.db
      .collection(this.boostsCollection)
      .where('lenderId', '==', lenderId)
      .get();
    return this.sortBoosts(
      snapshot.docs.map((doc) => this.mapBoost(doc.id, doc.data())),
    );
  }

  async getBoost(lenderId: string, boostId: string) {
    const snapshot = await this.db
      .collection(this.boostsCollection)
      .doc(boostId)
      .get();
    if (!snapshot.exists) {
      throw new NotFoundException('Boost request not found.');
    }
    if (snapshot.get('lenderId') !== lenderId) {
      throw new ForbiddenException('This boost belongs to another lender.');
    }
    return this.mapBoost(snapshot.id, snapshot.data() ?? {});
  }

  async listForAdmin(status?: string) {
    let query: FirebaseFirestore.Query = this.db.collection(
      this.boostsCollection,
    );
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    const snapshot = await query.get();
    const boosts = this.sortBoosts(
      snapshot.docs.map((doc) => this.mapBoost(doc.id, doc.data())),
    );
    const userIds = [
      ...new Set(
        boosts
          .flatMap((boost) => [boost.lenderId, boost.reviewedByAdminId])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const listingIds = [
      ...new Set(boosts.map((boost) => boost.listingId).filter(Boolean)),
    ];
    const [userDocs, listingDocs] = await Promise.all([
      userIds.length
        ? this.db.getAll(
            ...userIds.map((id) => this.db.collection('users').doc(id)),
          )
        : Promise.resolve([]),
      listingIds.length
        ? this.db.getAll(
            ...listingIds.map((id) =>
              this.db.collection('loanListings').doc(id),
            ),
          )
        : Promise.resolve([]),
    ]);
    const names = new Map(
      userDocs.map((doc) => {
        const user = doc.data() ?? {};
        const name =
          String(user.fullName ?? '').trim() ||
          [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
          doc.id;
        return [doc.id, name];
      }),
    );
    const listingTitles = new Map(
      listingDocs.map((doc) => [
        doc.id,
        String(doc.get('title') ?? doc.get('purpose') ?? 'Advertisement'),
      ]),
    );
    return boosts.map((boost) => ({
      ...boost,
      lenderName: names.get(boost.lenderId) ?? boost.lenderId,
      reviewedByAdminName: boost.reviewedByAdminId
        ? names.get(boost.reviewedByAdminId) ?? boost.reviewedByAdminId
        : undefined,
      listingTitle:
        listingTitles.get(boost.listingId) ?? 'Advertisement',
    }));
  }

  async decideBankPayment(
    adminId: string,
    boostId: string,
    approved: boolean,
    reason?: string,
  ) {
    if (!approved && !reason?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }
    const boostRef = this.db.collection(this.boostsCollection).doc(boostId);
    let lenderId = '';
    let listingId = '';
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(boostRef);
      if (!snapshot.exists) {
        throw new NotFoundException('Boost request not found.');
      }
      const boost = snapshot.data() ?? {};
      if (
        boost.status !== 'pending_verification' ||
        boost.paymentMethod !== 'bank_transfer'
      ) {
        throw new BadRequestException(
          'Only pending bank-transfer boosts can be reviewed.',
        );
      }
      lenderId = String(boost.lenderId);
      listingId = String(boost.listingId);
      if (approved) {
        this.activate(transaction, boostRef, boost, adminId, null);
      } else {
        const reviewedAt = Timestamp.now();
        transaction.update(boostRef, {
          status: 'rejected',
          rejectionReason: reason!.trim(),
          reviewedAt,
          reviewedByAdminId: adminId,
          updatedAt: reviewedAt,
        });
        transaction.update(
          this.db.collection('transactions').doc(String(boost.transactionId)),
          {
            status: 'rejected',
            note: reason!.trim(),
            updatedAt: reviewedAt,
          },
        );
        transaction.update(
          this.db.collection('loanListings').doc(listingId),
          {
            boostStatus: 'rejected',
            activeBoostId: null,
            isBoosted: false,
            updatedAt: reviewedAt,
          },
        );
      }
    });
    await writeAuditLog(this.db, {
      actorUserId: adminId,
      action: approved ? 'ad_boost.approved' : 'ad_boost.rejected',
      entityType: 'ad_boost',
      entityId: boostId,
      metadata: { listingId, reason: reason?.trim() ?? '' },
    });
    await this.notify(lenderId, boostId, approved, reason);
    const updated = await boostRef.get();
    return this.mapBoost(updated.id, updated.data() ?? {});
  }

  async handlePayHereNotification(payload: PayHereNotification) {
    const notification = this.payHere.verifyNotification(payload);
    const orderRef = this.db
      .collection(this.ordersCollection)
      .doc(notification.orderId);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) {
      throw new BadRequestException('PayHere order not found.');
    }
    const order = orderSnapshot.data() ?? {};
    if (
      notification.amountMinor !==
        Number(order.amountMinor ?? this.payHere.toMinor(Number(order.amount))) ||
      notification.currency !== order.currency
    ) {
      throw new BadRequestException(
        'PayHere payment details do not match.',
      );
    }
    const eventRef = this.db
      .collection('payherePaymentEvents')
      .doc(`${notification.orderId}_${notification.eventId}`);
    if ((await eventRef.get()).exists) {
      return { accepted: true, alreadyProcessed: true };
    }
    if (notification.status === 'charged_back') {
      await this.freezeBoostChargeback(orderRef, order, notification.sanitized);
      await eventRef.set({
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
      return { accepted: true, completed: false, status: 'charged_back' };
    }
    if (order.status === 'completed') {
      await eventRef.set({
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
      return { accepted: true, alreadyProcessed: true };
    }
    if (notification.status !== 'completed') {
      const failedStatus = notification.status;
      await this.db.runTransaction(async (transaction) => {
        const boostRef = this.db
          .collection(this.boostsCollection)
          .doc(String(order.boostId));
        const boostSnapshot = await transaction.get(boostRef);
        const now = Timestamp.now();
        transaction.update(orderRef, {
          status: failedStatus,
          payherePaymentId: notification.paymentId,
          lastNotification: notification.sanitized,
          ...(failedStatus === 'pending'
            ? {}
            : { payment: FieldValue.delete() }),
          updatedAt: now,
        });
        if (
          failedStatus !== 'pending' &&
          boostSnapshot.exists &&
          boostSnapshot.get('status') === 'payment_pending'
        ) {
          transaction.update(boostRef, {
            status: failedStatus === 'cancelled' ? 'cancelled' : 'rejected',
            rejectionReason:
              failedStatus === 'cancelled'
                ? 'Card payment was cancelled.'
                : 'Card payment was not completed.',
            reviewedAt: now,
            updatedAt: now,
          });
          transaction.update(
            this.db.collection('transactions').doc(String(order.transactionId)),
            { status: 'failed', updatedAt: now },
          );
          transaction.update(
            this.db.collection('loanListings').doc(String(order.listingId)),
            {
              boostStatus:
                failedStatus === 'cancelled' ? 'cancelled' : 'rejected',
              activeBoostId: null,
              isBoosted: false,
              boostPaymentExpiresAt: null,
              updatedAt: now,
            },
          );
        }
      });
      await eventRef.set({
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
      return { accepted: true, completed: false };
    }

    const boostRef = this.db
      .collection(this.boostsCollection)
      .doc(String(order.boostId));
    await this.db.runTransaction(async (transaction) => {
      const boostSnapshot = await transaction.get(boostRef);
      if (!boostSnapshot.exists) {
        throw new NotFoundException('Boost request not found.');
      }
      const boost = boostSnapshot.data() ?? {};
      if (boost.status === 'approved') return;
      if (
        boost.status !== 'payment_pending' ||
        boost.paymentMethod !== 'card'
      ) {
        throw new BadRequestException(
          'Boost is not awaiting card payment.',
        );
      }
      this.activate(
        transaction,
        boostRef,
        boost,
        null,
        notification.paymentId ?? notification.orderId,
      );
      transaction.update(orderRef, {
        status: 'completed',
        payherePaymentId: notification.paymentId,
        lastNotification: notification.sanitized,
        payment: FieldValue.delete(),
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      transaction.set(eventRef, {
        ...notification.sanitized,
        eventId: notification.eventId,
        source: 'callback',
        receivedAt: Timestamp.now(),
      });
    });
    await this.notify(String(order.lenderId), String(order.boostId), true);
    return { accepted: true, completed: true };
  }

  async renderCheckout(orderId: string) {
    const snapshot = await this.db
      .collection(this.ordersCollection)
      .doc(orderId)
      .get();
    if (!snapshot.exists) {
      throw new NotFoundException('PayHere order not found.');
    }
    const data = snapshot.data() ?? {};
    if (
      !['initiated', 'pending'].includes(String(data.status)) ||
      (this.toDate(data.expiresAt)?.getTime() ?? 0) <= Date.now()
    ) {
      if (['initiated', 'pending'].includes(String(data.status))) {
        await snapshot.ref.update({
          status: 'expired',
          expiredAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
      throw new BadRequestException(
        'This PayHere checkout has expired or is no longer active.',
      );
    }
    const payment = data.payment as Record<string, string>;
    const inputs = Object.entries(payment)
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${this.escape(key)}" value="${this.escape(String(value))}" />`,
      )
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Pay for boost</title></head><body><main><p>Redirecting to secure card payment...</p><form id="pay" method="post" action="${this.escape(String(data.checkoutUrl))}">${inputs}<button type="submit">Continue</button></form></main><script>document.getElementById('pay').submit()</script></body></html>`;
  }

  renderResult(success: boolean) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Boost payment</title></head><body><main><h1>${success ? 'Payment submitted' : 'Payment cancelled'}</h1><p>${success ? 'Your boost will appear after PayHere confirms the payment.' : 'Your advertisement remains active without a boost.'}</p></main></body></html>`;
  }

  onModuleInit() {
    if (!this.payHere.reconciliationEnabled()) return;
    this.reconciliationTimer = setInterval(
      () =>
        void this.reconcilePendingOrders().catch((error) =>
          this.payHere.logReconciliationError('scheduled-boost-scan', error),
        ),
      5 * 60_000,
    );
    this.reconciliationTimer.unref();
  }

  onModuleDestroy() {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
  }

  private async freezeBoostChargeback(
    orderRef: FirebaseFirestore.DocumentReference,
    order: FirebaseFirestore.DocumentData,
    notification: Record<string, string | null>,
  ) {
    const now = Timestamp.now();
    const disputeId = `payhere_boost_chargeback_${String(order.orderId)}`;
    // Firestore expects a promise-returning callback; this phase only queues
    // atomic writes, so it has no asynchronous read to await.
    // eslint-disable-next-line @typescript-eslint/require-await
    await this.db.runTransaction(async (transaction) => {
      transaction.update(orderRef, {
        status: 'charged_back',
        lastNotification: notification,
        chargedBackAt: now,
        payment: FieldValue.delete(),
        updatedAt: now,
      });
      transaction.set(
        this.db.collection(this.boostsCollection).doc(String(order.boostId)),
        {
          status: 'chargeback_review',
          rejectionReason: 'PayHere reported a chargeback. Administrative review is required.',
          updatedAt: now,
        },
        { merge: true },
      );
      transaction.set(
        this.db.collection('loanListings').doc(String(order.listingId)),
        {
          boostStatus: 'chargeback_review',
          activeBoostId: null,
          isBoosted: false,
          boostEndsAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      transaction.set(
        this.db.collection('transactions').doc(String(order.transactionId)),
        { providerStatus: 'charged_back', riskStatus: 'under_review', updatedAt: now },
        { merge: true },
      );
      transaction.set(
        this.db.collection('disputes').doc(disputeId),
        {
          id: disputeId,
          disputeId,
          disputeCode: `PHB-${String(order.orderId)}`,
          loanId: null,
          transactionId: String(order.transactionId),
          installmentId: null,
          complainantId: 'system',
          complainantRole: 'lender',
          respondentId: '',
          respondentRole: 'borrower',
          borrowerId: '',
          lenderId: String(order.lenderId),
          borrowerName: '',
          lenderName: '',
          category: 'payment',
          subject: 'Advertisement boost chargeback requires review',
          description: `PayHere reported a chargeback for boost ${String(order.boostId)}.`,
          desiredOutcome: 'An administrator must review the provider payment before any financial adjustment.',
          disputedAmountMinor: Number(order.amountMinor),
          currency: String(order.currency),
          evidenceDocumentIds: [],
          status: 'under_review',
          priority: 'critical',
          assignedAdminId: null,
          resolution: null,
          acknowledgements: {},
          reopenCount: 0,
          responseRequestedFrom: null,
          source: 'payhere',
          createdAt: now,
          updatedAt: now,
          resolvedAt: null,
          closedAt: null,
        },
        { merge: true },
      );
    });
    await this.roleNotifications?.createAdmin({
      eventType: 'payhere_boost_chargeback',
      eventId: String(order.orderId),
      category: 'boost_payment',
      title: 'PayHere boost chargeback requires review',
      message: 'A paid advertisement boost was stopped after a PayHere chargeback.',
      severity: 'critical',
      entityType: 'adBoost',
      entityId: String(order.boostId),
      actionLabel: 'Review dispute',
      actionTarget: '/admin/disputes',
      metadata: { disputeId },
    }).catch(() => undefined);
  }

  private async reconcilePendingOrders() {
    const snapshot = await this.db
      .collection(this.ordersCollection)
      .where('status', 'in', ['initiated', 'pending', 'processing_failed'])
      .limit(100)
      .get();
    for (const document of snapshot.docs) {
      const order = document.data() ?? {};
      const lastChecked = this.toDate(order.lastReconciledAt)?.getTime() ?? 0;
      if (Date.now() - lastChecked < 2 * 60_000) continue;
      await document.ref.set({ lastReconciledAt: Timestamp.now() }, { merge: true });
      try {
        const payment = await this.payHere.retrievePayment(document.id);
        if (!payment) {
          if ((this.toDate(order.expiresAt)?.getTime() ?? 0) <= Date.now()) {
            const boostRef = this.db
              .collection(this.boostsCollection)
              .doc(String(order.boostId));
            await this.db.runTransaction(async (transaction) => {
              const boostSnapshot = await transaction.get(boostRef);
              const now = Timestamp.now();
              transaction.update(document.ref, {
                status: 'expired',
                payment: FieldValue.delete(),
                expiredAt: now,
                updatedAt: now,
              });
              if (
                boostSnapshot.exists &&
                boostSnapshot.get('status') === 'payment_pending'
              ) {
                transaction.update(boostRef, {
                  status: 'expired',
                  rejectionReason: 'Card payment checkout expired.',
                  updatedAt: now,
                });
                transaction.update(
                  this.db
                    .collection('transactions')
                    .doc(String(order.transactionId)),
                  { status: 'failed', updatedAt: now },
                );
                transaction.update(
                  this.db
                    .collection('loanListings')
                    .doc(String(order.listingId)),
                  {
                    boostStatus: 'expired',
                    activeBoostId: null,
                    isBoosted: false,
                    boostPaymentExpiresAt: null,
                    updatedAt: now,
                  },
                );
              }
            });
          }
          continue;
        }
        if (
          payment.amountMinor !== Number(order.amountMinor) ||
          payment.currency !== order.currency
        ) {
          throw new Error('Retrieved PayHere payment details do not match the boost order.');
        }
        if (payment.status === 'CHARGEBACKED' || payment.status.startsWith('REFUND')) {
          await this.freezeBoostChargeback(document.ref, order, {
            orderId: document.id,
            paymentId: payment.paymentId,
            amount: this.payHere.formatMinor(payment.amountMinor),
            currency: payment.currency,
            statusCode: payment.status,
          });
          continue;
        }
        if (payment.status !== 'RECEIVED' || order.status === 'completed') continue;
        const boostRef = this.db.collection(this.boostsCollection).doc(String(order.boostId));
        await this.db.runTransaction(async (transaction) => {
          const boostSnapshot = await transaction.get(boostRef);
          if (!boostSnapshot.exists) throw new Error('Boost request not found.');
          const boost = boostSnapshot.data() ?? {};
          if (boost.status !== 'approved') {
            this.activate(transaction, boostRef, boost, null, payment.paymentId);
          }
          transaction.update(document.ref, {
            status: 'completed',
            payherePaymentId: payment.paymentId,
            reconciledAt: Timestamp.now(),
            completedAt: Timestamp.now(),
            payment: FieldValue.delete(),
            updatedAt: Timestamp.now(),
          });
        });
        await this.notify(String(order.lenderId), String(order.boostId), true);
      } catch (error) {
        this.payHere.logReconciliationError(document.id, error);
      }
    }
  }

  private async createCardOrder(
    boost: AdBoostResponse,
    requestBaseUrl: string,
  ) {
    const user = await this.db.collection('users').doc(boost.lenderId).get();
    const profile = user.data() ?? {};
    if (!String(profile.email ?? '').trim() || !String(profile.phone ?? '').trim()) {
      throw new BadRequestException(
        'A verified email address and phone number are required for card payments.',
      );
    }
    const orderId = `PHB-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const amount = this.payHere.formatMinor(boost.plan.amountMinor);
    const baseUrl = this.payHere.publicBaseUrl(requestBaseUrl);
    const checkoutUrl = this.payHere.checkoutUrl();
    const urls = this.payHere.urls('lender-ad-boosts', requestBaseUrl);
    const names = String(profile.fullName ?? 'Smart Credit Lender')
      .trim()
      .split(/\s+/);
    const payment = {
      merchant_id: this.payHere.merchantId(),
      return_url: urls.returnUrl,
      cancel_url: urls.cancelUrl,
      notify_url: urls.notifyUrl,
      first_name: names[0] || 'Smart',
      last_name: names.slice(1).join(' ') || 'Lender',
      email: String(profile.email).trim(),
      phone: String(profile.phone).trim(),
      address: 'N/A',
      city: String(profile.city ?? 'Colombo'),
      country:
        this.configService.get<string>('PAYHERE_COUNTRY') ?? 'Sri Lanka',
      order_id: orderId,
      items: `Smart Credit ad boost - ${boost.plan.name}`,
      currency: boost.plan.currency,
      amount,
      custom_1: boost.lenderId,
      custom_2: boost.boostId,
      hash: this.payHere.checkoutHash(orderId, amount, boost.plan.currency),
    };
    await this.db.collection(this.ordersCollection).doc(orderId).set({
      orderId,
      boostId: boost.boostId,
      listingId: boost.listingId,
      lenderId: boost.lenderId,
      transactionId: boost.transactionId,
      amount: boost.plan.amountMinor / 100,
      amountMinor: boost.plan.amountMinor,
      currency: boost.plan.currency,
      status: 'initiated',
      checkoutUrl,
      payment,
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60_000),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return {
      orderId,
      status: 'initiated',
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      paymentPageUrl: `${baseUrl}/api/lender-ad-boosts/payhere/checkout/${orderId}`,
    };
  }

  private activate(
    transaction: FirebaseFirestore.Transaction,
    boostRef: FirebaseFirestore.DocumentReference,
    boost: FirebaseFirestore.DocumentData,
    adminId: string | null,
    externalReference: string | null,
  ) {
    const now = Timestamp.now();
    const endsAt = Timestamp.fromMillis(
      now.toMillis() + Number(boost.durationDays) * 86_400_000,
    );
    transaction.update(boostRef, {
      status: 'approved',
      startsAt: now,
      endsAt,
      reviewedAt: now,
      reviewedByAdminId: adminId,
      updatedAt: now,
    });
    transaction.update(
      this.db.collection('transactions').doc(String(boost.transactionId)),
      {
        status: 'completed',
        externalReference:
          externalReference ?? boost.bankReference ?? null,
        completedAt: now,
        updatedAt: now,
      },
    );
    transaction.update(
      this.db.collection('loanListings').doc(String(boost.listingId)),
      {
        boostStatus: 'active',
        activeBoostId: boost.boostId,
        isBoosted: true,
        boostStartsAt: now,
        boostEndsAt: endsAt,
        boostPaymentExpiresAt: null,
        updatedAt: now,
      },
    );
  }

  private async notify(
    lenderId: string,
    boostId: string,
    approved: boolean,
    reason?: string,
  ) {
    await this.notificationWriter.create({
      id: `ad-boost-${approved ? 'approved' : 'rejected'}-${boostId}`,
      lenderId,
      category: 'ad',
      eventType: approved ? 'ad_boost_approved' : 'ad_boost_rejected',
      title: approved
        ? 'Advertisement boost active'
        : 'Boost payment rejected',
      message: approved
        ? 'Your paid advertisement boost is now active.'
        : `Your boost payment was rejected. ${reason ?? ''}`.trim(),
      severity: approved ? 'success' : 'warning',
      createdAt: new Date(),
      relatedEntityType: 'ad',
      relatedEntityId: boostId,
      actionLabel: 'Open ad page',
      actionTarget: 'create-ad',
      metadata: { boostId },
    });
  }

  private plan(
    id: string,
    name: string,
    durationDays: number,
    fallbackLkr: number,
  ): AdBoostPlan {
    const configured = Number(
      this.configService.get<string>(
        `BOOST_PLAN_${durationDays}_DAYS_FEE_LKR`,
      ),
    );
    const amountLkr =
      Number.isFinite(configured) && configured > 0
        ? configured
        : fallbackLkr;
    return {
      id,
      name,
      durationDays,
      amountMinor: Math.round(amountLkr * 100),
      currency: 'LKR',
    };
  }

  private mapBoost(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): AdBoostResponse {
    return {
      boostId: String(data.boostId ?? id),
      listingId: String(data.listingId ?? ''),
      lenderId: String(data.lenderId ?? ''),
      plan: {
        id: String(data.planId),
        name: String(data.planName),
        durationDays: Number(data.durationDays),
        amountMinor: Number(data.amountMinor),
        currency: 'LKR',
      },
      paymentMethod: data.paymentMethod,
      status: data.status,
      transactionId: String(data.transactionId),
      receiptDocumentId: data.receiptDocumentId ?? null,
      bankReference: data.bankReference ?? null,
      rejectionReason: data.rejectionReason ?? null,
      startsAt: this.iso(data.startsAt),
      endsAt: this.iso(data.endsAt),
      createdAt: this.iso(data.createdAt),
      submittedAt: this.iso(data.submittedAt),
      reviewedAt: this.iso(data.reviewedAt),
      reviewedByAdminId: data.reviewedByAdminId
        ? String(data.reviewedByAdminId)
        : null,
    };
  }

  private sortBoosts(items: AdBoostResponse[]) {
    return items.sort((left, right) =>
      String(right.submittedAt ?? right.createdAt).localeCompare(
        String(left.submittedAt ?? left.createdAt),
      ),
    );
  }
  private toDate(value: unknown): Date | null {
    if (value instanceof Timestamp) return value.toDate();
    if (value && typeof value === 'object' && 'toDate' in value) {
      return (value as { toDate(): Date }).toDate();
    }
    return null;
  }
  private iso(value: unknown) {
    return this.toDate(value)?.toISOString() ?? null;
  }
  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
