import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { writeAuditLog } from '../../../common/audit/write-audit-log';
import { FirebaseService } from '../../../firebase/firebase.service';
import { LenderNotificationWriterService } from '../lender-notifications/lender-notification-writer.service';
import {
  AdBoostPaymentMethod,
  AdBoostPlan,
  AdBoostResponse,
} from './ad-boosts.types';
import { RoleNotificationService } from '../../../common/notifications/role-notification.service';

type PayHereNotification = {
  merchant_id?: string;
  order_id?: string;
  payment_id?: string;
  payhere_amount?: string;
  payhere_currency?: string;
  status_code?: string;
  md5sig?: string;
};

@Injectable()
export class AdBoostsService {
  private readonly boostsCollection = 'adBoostRequests';
  private readonly ordersCollection = 'adBoostPayHerePayments';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
    private readonly notificationWriter: LenderNotificationWriterService,
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
    return this.sortBoosts(
      snapshot.docs.map((doc) => this.mapBoost(doc.id, doc.data())),
    );
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
    const merchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID');
    if (
      !merchantId ||
      payload.merchant_id !== merchantId ||
      !payload.order_id ||
      !this.validNotification(payload)
    ) {
      throw new BadRequestException('Invalid PayHere notification.');
    }
    const orderRef = this.db
      .collection(this.ordersCollection)
      .doc(payload.order_id);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) {
      throw new BadRequestException('PayHere order not found.');
    }
    const order = orderSnapshot.data() ?? {};
    if (
      this.formatAmount(Number(payload.payhere_amount)) !==
        this.formatAmount(Number(order.amount)) ||
      payload.payhere_currency !== order.currency
    ) {
      throw new BadRequestException(
        'PayHere payment details do not match.',
      );
    }
    if (order.status === 'completed') {
      return { accepted: true, alreadyProcessed: true };
    }
    if (String(payload.status_code) !== '2') {
      const failedStatus = this.mapPayHereStatus(String(payload.status_code));
      await this.db.runTransaction(async (transaction) => {
        const boostRef = this.db
          .collection(this.boostsCollection)
          .doc(String(order.boostId));
        const boostSnapshot = await transaction.get(boostRef);
        const now = Timestamp.now();
        transaction.update(orderRef, {
          status: failedStatus,
          notification: payload,
          updatedAt: now,
        });
        if (boostSnapshot.exists && boostSnapshot.get('status') === 'payment_pending') {
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
        payload.payment_id ?? payload.order_id!,
      );
      transaction.update(orderRef, {
        status: 'completed',
        payherePaymentId: payload.payment_id ?? null,
        notification: payload,
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
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

  private async createCardOrder(
    boost: AdBoostResponse,
    requestBaseUrl: string,
  ) {
    const merchantId = this.configService.get<string>('PAYHERE_MERCHANT_ID');
    const merchantSecret = this.configService.get<string>(
      'PAYHERE_MERCHANT_SECRET',
    );
    if (!merchantId || !merchantSecret) {
      throw new InternalServerErrorException(
        'PayHere is not configured on the server.',
      );
    }
    const user = await this.db.collection('users').doc(boost.lenderId).get();
    const profile = user.data() ?? {};
    const orderId = `PHB-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const amount = this.formatAmount(boost.plan.amountMinor / 100);
    const baseUrl = this.publicBaseUrl(requestBaseUrl);
    const checkoutUrl =
      this.configService.get<string>('PAYHERE_CHECKOUT_URL') ??
      (this.isSandbox()
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout');
    const names = String(profile.fullName ?? 'Smart Credit Lender')
      .trim()
      .split(/\s+/);
    const payment = {
      merchant_id: merchantId,
      return_url: `${baseUrl}/api/lender-ad-boosts/payhere/result/success`,
      cancel_url: `${baseUrl}/api/lender-ad-boosts/payhere/result/cancelled`,
      notify_url: `${baseUrl}/api/lender-ad-boosts/payhere/notify`,
      first_name: names[0] || 'Smart',
      last_name: names.slice(1).join(' ') || 'Lender',
      email: String(profile.email ?? 'lender@smartcredit.local'),
      phone: String(profile.phone ?? '0770000000'),
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
      hash: this.checkoutHash(
        merchantId,
        orderId,
        amount,
        boost.plan.currency,
      ),
    };
    await this.db.collection(this.ordersCollection).doc(orderId).set({
      orderId,
      boostId: boost.boostId,
      listingId: boost.listingId,
      lenderId: boost.lenderId,
      transactionId: boost.transactionId,
      amount: boost.plan.amountMinor / 100,
      currency: boost.plan.currency,
      status: 'initiated',
      checkoutUrl,
      payment,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return {
      orderId,
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
  private md5(value: string) {
    return createHash('md5').update(value).digest('hex');
  }
  private formatAmount(value: number) {
    return Number(value).toFixed(2);
  }
  private checkoutHash(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
  ) {
    const secret =
      this.configService.get<string>('PAYHERE_MERCHANT_SECRET') ?? '';
    return this.md5(
      `${merchantId}${orderId}${amount}${currency}${this.md5(secret).toUpperCase()}`,
    ).toUpperCase();
  }
  private validNotification(payload: PayHereNotification) {
    const secret =
      this.configService.get<string>('PAYHERE_MERCHANT_SECRET') ?? '';
    const expected = this.md5(
      `${payload.merchant_id ?? ''}${payload.order_id ?? ''}${payload.payhere_amount ?? ''}${payload.payhere_currency ?? ''}${payload.status_code ?? ''}${this.md5(secret).toUpperCase()}`,
    ).toUpperCase();
    return expected === String(payload.md5sig ?? '').toUpperCase();
  }
  private isSandbox() {
    return ['true', '1', 'yes', 'sandbox'].includes(
      String(this.configService.get<string>('PAYHERE_SANDBOX') ?? '')
        .trim()
        .toLowerCase(),
    );
  }
  private publicBaseUrl(requestBaseUrl: string) {
    return (
      this.configService.get<string>('PAYHERE_PUBLIC_BASE_URL') ??
      this.configService.get<string>('PUBLIC_API_BASE_URL') ??
      requestBaseUrl
    )
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
  }
  private mapPayHereStatus(code: string) {
    if (code === '0') return 'pending';
    if (code === '-1') return 'cancelled';
    if (code === '-3') return 'charged_back';
    return 'failed';
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
