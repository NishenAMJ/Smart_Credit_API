import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DocumentData, Timestamp } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { ChatGateway } from '../chat/gateway/chat.gateway';
import { AdminQueryCacheService } from '../../common/cache/admin-query-cache.service';
import { buildSearchTokens } from '../../common/firestore/search-tokens';
import { writeAuditLog } from '../../common/audit/write-audit-log';
import type { UserRole } from '../auth/auth.types';
import type {
  AddDisputeCommentDto,
  AdminDisputeQuery,
  ResolveCanonicalDisputeDto,
} from './dto/dispute.dto';
import type {
  CreateDisputeInput,
  Dispute,
  DisputeCategory,
  DisputeEvent,
  DisputePriority,
  DisputeRole,
  DisputeStatus,
  ParticipantDisputeScope,
} from './interfaces/dispute.interface';

const OPEN_CASE_STATUSES: DisputeStatus[] = [
  'open',
  'under_review',
  'awaiting_response',
  'escalated',
];
const DUPLICATE_BLOCKING_STATUSES: DisputeStatus[] = [
  ...OPEN_CASE_STATUSES,
  'resolved',
];
const HISTORY_STATUSES: DisputeStatus[] = ['resolved', 'closed'];
const CATEGORIES: DisputeCategory[] = [
  'payment',
  'loan_terms',
  'fraud',
  'conduct',
  'other',
];
const PRIORITIES: DisputePriority[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: DisputeStatus[] = [...OPEN_CASE_STATUSES, ...HISTORY_STATUSES];
const REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class DisputesService implements OnModuleInit, OnModuleDestroy {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 50;
  private closeTimer?: NodeJS.Timeout;
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly gateway: ChatGateway,
    private readonly cache: AdminQueryCacheService = new AdminQueryCacheService(),
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.closeTimer = setInterval(
      () => void this.runScheduledClosure(),
      60 * 60 * 1000,
    );
    this.closeTimer.unref();
    void this.runScheduledClosure();
  }

  private async runScheduledClosure() {
    try {
      await this.closeExpiredResolvedCases();
    } catch (error) {
      this.logger.error('Automatic dispute closure failed.', error);
    }
  }

  onModuleDestroy() {
    if (this.closeTimer) clearInterval(this.closeTimer);
  }

  private get db() {
    return this.firebaseService.db;
  }

  private parseLimit(limit?: string) {
    const parsed = Number(limit ?? DisputesService.DEFAULT_PAGE_SIZE);
    return Number.isFinite(parsed)
      ? Math.min(Math.max(Math.trunc(parsed), 1), DisputesService.MAX_PAGE_SIZE)
      : DisputesService.DEFAULT_PAGE_SIZE;
  }

  private text(value: unknown, field: string, min = 1, max = 2000): string {
    if (
      typeof value !== 'string' ||
      value.trim().length < min ||
      value.trim().length > max
    ) {
      throw new BadRequestException(
        `${field} must contain ${min}-${max} characters.`,
      );
    }
    return value.trim();
  }

  private status(value: unknown): DisputeStatus {
    if (value === 'in-progress' || value === 'under_review')
      return 'under_review';
    if (value === 'awaiting-response') return 'awaiting_response';
    if (STATUSES.includes(value as DisputeStatus))
      return value as DisputeStatus;
    return 'open';
  }

  private category(value: unknown): DisputeCategory {
    if (value === 'repayment' || value === 'service') return 'payment';
    return CATEGORIES.includes(value as DisputeCategory)
      ? (value as DisputeCategory)
      : 'other';
  }

  private priorityFor(category: DisputeCategory): DisputePriority {
    if (category === 'fraud') return 'critical';
    if (category === 'payment') return 'high';
    if (category === 'loan_terms' || category === 'conduct') return 'medium';
    return 'low';
  }

  private timestamp(value: unknown, fallback = Timestamp.now()): Timestamp {
    if (value instanceof Timestamp) return value;
    if (value instanceof Date) return Timestamp.fromDate(value);
    return fallback;
  }

  private mapDispute(
    id: string,
    data: DocumentData,
  ): Dispute & Record<string, unknown> {
    const complainantId =
      data.complainantId ??
      data.openedByUserId ??
      data.raisedByUserId ??
      data.borrowerId ??
      '';
    const respondentId =
      data.respondentId ??
      data.againstUserId ??
      (complainantId === data.borrowerId ? data.lenderId : data.borrowerId) ??
      '';
    const complainantRole = (data.complainantRole ??
      data.raisedByRole ??
      (complainantId === data.lenderId ? 'lender' : 'borrower')) as
      | 'borrower'
      | 'lender';
    const respondentRole = (data.respondentRole ??
      data.againstUserRole ??
      (complainantRole === 'borrower' ? 'lender' : 'borrower')) as
      | 'borrower'
      | 'lender';
    const disputedAmountMinor =
      typeof data.disputedAmountMinor === 'number'
        ? data.disputedAmountMinor
        : typeof data.disputedAmount === 'number'
          ? Math.round(data.disputedAmount * 100)
          : null;
    const resolvedAt = data.resolvedAt ? this.timestamp(data.resolvedAt) : null;
    const legacyResolution =
      typeof data.resolution === 'string' && data.resolution.trim()
        ? {
            summary: data.resolution.trim(),
            recommendedActions: [],
            issuedByAdminId:
              data.assignedAdminId ?? data.assignedTo ?? 'legacy-admin',
            issuedAt: resolvedAt ?? this.timestamp(data.updatedAt),
            reopenUntil: Timestamp.fromMillis(
              (resolvedAt ?? this.timestamp(data.updatedAt)).toMillis() +
                REOPEN_WINDOW_MS,
            ),
          }
        : null;
    const mapped: Dispute = {
      id,
      disputeId: data.disputeId ?? id,
      disputeCode: data.disputeCode ?? `DSP-${id.slice(0, 8).toUpperCase()}`,
      loanId: data.loanId || null,
      transactionId: data.transactionId ?? null,
      installmentId: data.installmentId ?? null,
      complainantId,
      complainantRole,
      respondentId,
      respondentRole,
      borrowerId:
        data.borrowerId ??
        (complainantRole === 'borrower' ? complainantId : respondentId),
      lenderId:
        data.lenderId ??
        (complainantRole === 'lender' ? complainantId : respondentId),
      borrowerName: data.borrowerName ?? '',
      lenderName: data.lenderName ?? '',
      category: this.category(data.category),
      subject: data.subject ?? data.title ?? 'Dispute',
      description: data.description ?? '',
      desiredOutcome: data.desiredOutcome ?? '',
      disputedAmountMinor,
      currency: 'LKR',
      // Legacy URL evidence remains on the source document for audit/migration;
      // only verified document-record IDs are exposed through secured access.
      evidenceDocumentIds: data.evidenceDocumentIds ?? [],
      searchTokens: Array.isArray(data.searchTokens) ? data.searchTokens : [],
      status: this.status(data.status),
      priority: PRIORITIES.includes(data.priority)
        ? data.priority
        : this.priorityFor(this.category(data.category)),
      assignedAdminId: data.assignedAdminId ?? data.assignedTo ?? null,
      resolution:
        data.resolution && typeof data.resolution === 'object'
          ? data.resolution
          : legacyResolution,
      acknowledgements: data.acknowledgements ?? {},
      reopenCount: Number(data.reopenCount ?? 0),
      responseRequestedFrom: ['complainant', 'respondent', 'both'].includes(
        data.responseRequestedFrom,
      )
        ? data.responseRequestedFrom
        : null,
      createdAt: this.timestamp(data.createdAt),
      updatedAt: this.timestamp(data.updatedAt, this.timestamp(data.createdAt)),
      resolvedAt,
      closedAt: data.closedAt ? this.timestamp(data.closedAt) : null,
    };
    return {
      ...mapped,
      title: mapped.subject,
      raisedBy:
        mapped.complainantRole === 'borrower'
          ? mapped.borrowerName || mapped.complainantId
          : mapped.lenderName || mapped.complainantId,
      raisedByUserId: mapped.complainantId,
      raisedByRole: mapped.complainantRole,
      againstUser:
        mapped.respondentRole === 'borrower'
          ? mapped.borrowerName || mapped.respondentId
          : mapped.lenderName || mapped.respondentId,
      againstUserId: mapped.respondentId,
      againstUserRole: mapped.respondentRole,
      evidenceUrls: [],
      disputedAmount:
        mapped.disputedAmountMinor == null
          ? undefined
          : mapped.disputedAmountMinor / 100,
      resolutionSummary: mapped.resolution?.summary,
    };
  }

  private assertParticipant(dispute: Dispute, userId: string, role: UserRole) {
    if (role === 'admin') return;
    if (![dispute.complainantId, dispute.respondentId].includes(userId)) {
      throw new ForbiddenException(
        'You are not a participant in this dispute.',
      );
    }
  }

  private assertParticipantCanReply(dispute: Dispute, userId: string) {
    if (dispute.status === 'closed') {
      throw new BadRequestException('Closed disputes cannot receive comments.');
    }
    if (dispute.status === 'resolved') {
      throw new BadRequestException(
        'Reopen this dispute before sending another message.',
      );
    }
    if (dispute.status !== 'awaiting_response') {
      throw new BadRequestException(
        'You can reply only after the admin requests information.',
      );
    }
    const requestedFrom = dispute.responseRequestedFrom ?? 'both';
    const isRequestedParticipant =
      requestedFrom === 'both' ||
      (requestedFrom === 'complainant' && userId === dispute.complainantId) ||
      (requestedFrom === 'respondent' && userId === dispute.respondentId);
    if (!isRequestedParticipant) {
      throw new ForbiddenException(
        'The admin requested information from the other participant.',
      );
    }
  }

  private async getRequired(
    disputeId: string,
  ): Promise<{ ref: FirebaseFirestore.DocumentReference; dispute: Dispute }> {
    const ref = this.db.collection('disputes').doc(disputeId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new NotFoundException('Dispute not found.');
    return {
      ref,
      dispute: this.mapDispute(snapshot.id, snapshot.data() ?? {}),
    };
  }

  private eventData(
    disputeId: string,
    actorUserId: string,
    actorRole: DisputeRole | 'system',
    type: string,
    message: string,
    now: Timestamp,
    options: {
      documentIds?: string[];
      visibility?: 'shared' | 'admin';
      previousStatus?: DisputeStatus | null;
      nextStatus?: DisputeStatus | null;
    } = {},
  ) {
    return {
      disputeId,
      actorUserId,
      actorRole,
      type,
      message,
      documentIds: options.documentIds ?? [],
      visibility: options.visibility ?? 'shared',
      previousStatus: options.previousStatus ?? null,
      nextStatus: options.nextStatus ?? null,
      createdAt: now,
    };
  }

  private emit(dispute: Dispute, changeType: string) {
    this.cache.invalidate('admin:disputes:');
    const payload = {
      disputeId: dispute.id,
      changeType,
      status: dispute.status,
      updatedAt: dispute.updatedAt.toDate().toISOString(),
    };
    if (dispute.borrowerId)
      this.gateway.emitToUser(dispute.borrowerId, 'dispute:changed', payload);
    if (dispute.lenderId)
      this.gateway.emitToUser(dispute.lenderId, 'dispute:changed', payload);
    if (dispute.assignedAdminId)
      this.gateway.emitToUser(
        dispute.assignedAdminId,
        'dispute:changed',
        payload,
      );
    this.gateway.emitToRole('admin', 'dispute:changed', payload);
  }

  private async auditAdminAction(
    disputeId: string,
    adminId: string,
    action: string,
    description: string,
  ) {
    await writeAuditLog(this.db, {
      actorUserId: adminId,
      action: `dispute.${action}`,
      entityType: 'dispute',
      entityId: disputeId,
      metadata: { description },
    });
    this.gateway.emitToRole('admin', 'admin:changed', {
      resource: 'audit',
      changeType: action,
      entityId: disputeId,
      updatedAt: new Date().toISOString(),
    });
  }

  private async notify(
    dispute: Dispute,
    excludedUserId: string | null,
    eventType: string,
    title: string,
    body: string,
  ) {
    const now = Timestamp.now();
    const writes: Promise<unknown>[] = [];
    if (dispute.borrowerId && dispute.borrowerId !== excludedUserId) {
      writes.push(
        this.db.collection('borrowerNotifications').add({
          borrowerId: dispute.borrowerId,
          category: 'dispute',
          severity: 'info',
          title,
          message: body,
          isRead: false,
          relatedEntityType: 'dispute',
          relatedEntityId: dispute.id,
          actionTarget: 'DisputeDetail',
          metadata: { disputeId: dispute.id, status: dispute.status },
          createdAt: now,
          updatedAt: now,
          readAt: null,
        }),
      );
    }
    if (dispute.lenderId && dispute.lenderId !== excludedUserId) {
      writes.push(
        this.db.collection('notifications').add({
          userId: dispute.lenderId,
          category: 'dispute',
          eventType,
          title,
          body,
          severity: 'info',
          isRead: false,
          createdAt: now,
          readAt: null,
          entityType: 'dispute',
          entityId: dispute.id,
          actionLabel: 'Open dispute',
          actionTarget: 'disputes',
          metadata: { disputeId: dispute.id, status: dispute.status },
        }),
      );
    }
    await Promise.all(writes);
  }

  async getEligibleLoans(userId: string, role: UserRole) {
    const field = role === 'lender' ? 'lenderId' : 'borrowerId';
    const snapshot = await this.db
      .collection('loans')
      .where(field, '==', userId)
      .get();
    const participantIds = snapshot.docs.flatMap((doc) => {
      const data = doc.data();
      return [String(data.borrowerId ?? ''), String(data.lenderId ?? '')];
    });
    const names = await this.getUserDisplayNames(participantIds);
    const loans = snapshot.docs.map((doc) => {
      const data = doc.data();
      const borrowerId = String(data.borrowerId ?? '');
      const lenderId = String(data.lenderId ?? '');
      return {
        id: doc.id,
        loanId: data.loanId ?? doc.id,
        status: data.status,
        borrowerId,
        lenderId,
        borrowerName: data.borrowerName ?? names.get(borrowerId) ?? null,
        lenderName: data.lenderName ?? names.get(lenderId) ?? null,
        principalAmountMinor:
          data.principalMinor ??
          data.principalAmountMinor ??
          (typeof data.principalAmount === 'number'
            ? Math.round(data.principalAmount * 100)
            : null),
        currency: data.currency ?? 'LKR',
      };
    });
    return { success: true, loans };
  }

  private async getUserDisplayNames(userIds: string[]) {
    const ids = [...new Set(userIds.filter(Boolean))];
    const names = new Map<string, string>();
    if (!ids.length) return names;

    const snapshots = await this.db.getAll(
      ...ids.map((id) => this.db.collection('users').doc(id)),
    );
    snapshots.forEach((snapshot) => {
      const data = snapshot.data() ?? {};
      const name = String(data.fullName ?? data.name ?? '').trim();
      if (snapshot.exists && name) names.set(snapshot.id, name);
    });
    return names;
  }

  private async validateEvidence(userId: string | null, ids: string[]) {
    if (ids.length > 5)
      throw new BadRequestException(
        'A dispute can contain at most five evidence files.',
      );
    if (!ids.length) return;
    const documents = await this.db.getAll(
      ...ids.map((id) => this.db.collection('documents').doc(id)),
    );
    for (const document of documents) {
      const data = document.data();
      if (
        !document.exists ||
        (userId !== null && data?.userId !== userId) ||
        data?.category !== 'dispute_evidence'
      ) {
        throw new BadRequestException(
          `Invalid evidence document: ${document.id}`,
        );
      }
      if (
        !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(
          data.mimeType,
        ) ||
        Number(data.fileSize) > 10 * 1024 * 1024
      ) {
        throw new BadRequestException(
          `Unsupported evidence document: ${document.id}`,
        );
      }
    }
  }

  async createDispute(
    userId: string,
    role: UserRole,
    input: CreateDisputeInput,
  ) {
    if (role !== 'borrower' && role !== 'lender')
      throw new ForbiddenException(
        'Only borrowers and lenders can create disputes.',
      );
    const requestedLoanId = input.loanId?.trim();
    const loanId = requestedLoanId
      ? this.text(requestedLoanId, 'loanId', 1, 120)
      : null;
    const category = this.category(input.category);
    if (!CATEGORIES.includes(input.category))
      throw new BadRequestException('Invalid dispute category.');
    const subject = this.text(input.subject, 'subject', 3, 160);
    const description = this.text(input.description, 'description', 10, 4000);
    const desiredOutcome = this.text(
      input.desiredOutcome,
      'desiredOutcome',
      3,
      1000,
    );
    if (
      input.evidenceDocumentIds != null &&
      (!Array.isArray(input.evidenceDocumentIds) ||
        input.evidenceDocumentIds.some(
          (id) => typeof id !== 'string' || !id.trim(),
        ))
    )
      throw new BadRequestException('Invalid evidence document IDs.');
    const evidenceDocumentIds = [...new Set(input.evidenceDocumentIds ?? [])];
    await this.validateEvidence(userId, evidenceDocumentIds);

    const loanRef = loanId
      ? this.db.collection('loans').doc(loanId)
      : null;
    const loanSnapshot = loanRef ? await loanRef.get() : null;
    if (loanId && !loanSnapshot?.exists)
      throw new NotFoundException('Loan not found.');
    const loan = loanSnapshot?.data() ?? {};
    const borrowerId = loanId
      ? String(loan.borrowerId ?? '')
      : role === 'borrower'
        ? userId
        : '';
    const lenderId = loanId
      ? String(loan.lenderId ?? '')
      : role === 'lender'
        ? userId
        : '';
    if (loanId) {
      if (!borrowerId || !lenderId)
        throw new BadRequestException(
          'The selected loan does not have valid borrower and lender participants.',
        );
      if (
        (role === 'borrower' && borrowerId !== userId) ||
        (role === 'lender' && lenderId !== userId)
      ) {
        throw new ForbiddenException(
          'The selected loan does not belong to you.',
        );
      }
    } else if (input.transactionId || input.installmentId) {
      throw new BadRequestException(
        'Select a loan before adding a transaction or installment ID.',
      );
    }

    if (input.transactionId) {
      const tx = await this.db
        .collection('transactions')
        .doc(input.transactionId)
        .get();
      if (!tx.exists || tx.data()?.loanId !== loanId)
        throw new BadRequestException(
          'The transaction does not belong to this loan.',
        );
    }
    if (input.installmentId && loanRef) {
      const installment = await loanRef
        .collection('installments')
        .doc(input.installmentId)
        .get();
      if (!installment.exists)
        throw new BadRequestException(
          'The installment does not belong to this loan.',
        );
    }

    const disputedAmountMinor =
      input.disputedAmountMinor == null
        ? null
        : Number(input.disputedAmountMinor);
    if (
      disputedAmountMinor != null &&
      (!Number.isSafeInteger(disputedAmountMinor) || disputedAmountMinor < 0)
    )
      throw new BadRequestException(
        'disputedAmountMinor must be a non-negative integer.',
      );

    const ref = this.db.collection('disputes').doc();
    const now = Timestamp.now();
    const respondentId = loanId
      ? role === 'borrower'
        ? lenderId
        : borrowerId
      : '';
    const participantNames = await this.getUserDisplayNames([
      borrowerId,
      lenderId,
    ]);
    const document: Omit<Dispute, 'id'> = {
      disputeId: ref.id,
      disputeCode: `DSP-${ref.id.slice(0, 8).toUpperCase()}`,
      loanId,
      transactionId: input.transactionId ?? null,
      installmentId: input.installmentId ?? null,
      complainantId: userId,
      complainantRole: role,
      respondentId,
      respondentRole: role === 'borrower' ? 'lender' : 'borrower',
      borrowerId,
      lenderId,
      borrowerName: loan.borrowerName ?? participantNames.get(borrowerId) ?? '',
      lenderName: loan.lenderName ?? participantNames.get(lenderId) ?? '',
      category,
      subject,
      description,
      desiredOutcome,
      disputedAmountMinor,
      currency: 'LKR',
      evidenceDocumentIds,
      searchTokens: buildSearchTokens([
        ref.id,
        `DSP-${ref.id.slice(0, 8).toUpperCase()}`,
        loanId,
        subject,
        loan.borrowerName,
        loan.lenderName,
      ]),
      status: 'open',
      priority: this.priorityFor(category),
      assignedAdminId: null,
      resolution: null,
      acknowledgements: {},
      reopenCount: 0,
      responseRequestedFrom: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      closedAt: null,
    };

    await this.db.runTransaction(async (transaction) => {
      const duplicates = await transaction.get(
        this.db
          .collection('disputes')
          .where('complainantId', '==', userId)
          .where('loanId', '==', loanId)
          .where('category', '==', category)
          .where('transactionId', '==', input.transactionId ?? null)
          .where('status', 'in', DUPLICATE_BLOCKING_STATUSES)
          .limit(1),
      );
      if (!duplicates.empty)
        throw new ConflictException(
          loanId
            ? 'An active dispute already exists for this loan and category.'
            : 'An active general dispute already exists for this category.',
        );
      transaction.create(ref, document);
      const eventRef = ref.collection('events').doc();
      transaction.create(eventRef, {
        eventId: eventRef.id,
        ...this.eventData(ref.id, userId, role, 'created', description, now, {
          documentIds: evidenceDocumentIds,
          nextStatus: 'open',
        }),
      });
      for (const documentId of evidenceDocumentIds)
        transaction.update(this.db.collection('documents').doc(documentId), {
          relatedEntityType: 'dispute',
          relatedEntityId: ref.id,
          updatedAt: now,
        });
    });

    const dispute = this.mapDispute(ref.id, document);
    this.emit(dispute, 'created');
    await this.notify(
      dispute,
      userId,
      'dispute_created',
      'New dispute opened',
      loanId
        ? `${subject} was opened for loan ${loanId}.`
        : `${subject} was opened as a general platform dispute.`,
    );
    return { success: true, dispute };
  }

  async getMyDisputes(
    userId: string,
    status?: DisputeStatus,
    limit?: string,
    cursor?: string,
    role: UserRole = 'borrower',
    scope?: ParticipantDisputeScope,
  ) {
    if (status && !STATUSES.includes(status)) {
      throw new BadRequestException('Invalid dispute status filter.');
    }
    if (scope && !['active', 'history'].includes(scope)) {
      throw new BadRequestException('Invalid dispute scope filter.');
    }
    if (status && scope) {
      throw new BadRequestException(
        'Use either a status filter or a scope filter, not both.',
      );
    }
    const participantField = role === 'lender' ? 'lenderId' : 'borrowerId';
    let query: FirebaseFirestore.Query = this.db
      .collection('disputes')
      .where(participantField, '==', userId);
    if (status) query = query.where('status', '==', status);
    if (scope === 'active') {
      query = query.where('status', 'in', OPEN_CASE_STATUSES);
    } else if (scope === 'history') {
      query = query.where('status', 'in', HISTORY_STATUSES);
    }
    query = query.orderBy('updatedAt', 'desc');
    if (cursor) {
      const cursorDoc = await this.db.collection('disputes').doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }
    const pageSize = this.parseLimit(limit);
    const snapshot = await query.limit(pageSize + 1).get();
    const hasMore = snapshot.size > pageSize;
    const disputes = snapshot.docs
      .slice(0, pageSize)
      .map((doc) => this.mapDispute(doc.id, doc.data()));
    return {
      success: true,
      count: disputes.length,
      disputes,
      hasMore,
      nextCursor: hasMore ? disputes[disputes.length - 1]?.id : undefined,
    };
  }

  async getAllDisputes(
    limit?: string,
    cursor?: string,
    filters: AdminDisputeQuery = {},
  ) {
    let query: FirebaseFirestore.Query = this.db.collection('disputes');
    if (filters.status === 'under_review') {
      query = query.where('status', 'in', [
        'under_review',
        'in-progress',
        'escalated',
      ]);
    } else if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.priority)
      query = query.where('priority', '==', filters.priority);
    if (filters.assignedAdminId)
      query = query.where('assignedAdminId', '==', filters.assignedAdminId);
    const search = filters.search?.trim().toLowerCase();
    if (search) query = query.where('searchTokens', 'array-contains', search);
    query = query.orderBy('updatedAt', 'desc');
    if (cursor) {
      const cursorDoc = await this.db.collection('disputes').doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }
    const pageSize = this.parseLimit(limit);
    const snapshot = await query.limit(pageSize + 1).get();
    const hasMore = snapshot.size > pageSize;
    const disputes = snapshot.docs
      .slice(0, pageSize)
      .map((doc) => this.mapDispute(doc.id, doc.data()));
    return {
      success: true,
      count: disputes.length,
      disputes,
      hasMore,
      nextCursor: hasMore ? disputes[disputes.length - 1]?.id : undefined,
    };
  }

  async getStats() {
    const cached = await this.cache.remember(
      'admin:disputes:stats',
      async () => {
        const disputes = this.db.collection('disputes');
        const count = async (query: FirebaseFirestore.Query) =>
          (await query.count().get()).data().count;
        const [
          all,
          open,
          underReview,
          awaitingResponse,
          escalated,
          resolved,
          closed,
        ] = await Promise.all([
          count(disputes),
          count(disputes.where('status', '==', 'open')),
          count(
            disputes.where('status', 'in', [
              'under_review',
              'in-progress',
              'escalated',
            ]),
          ),
          count(disputes.where('status', '==', 'awaiting_response')),
          count(disputes.where('status', '==', 'escalated')),
          count(disputes.where('status', '==', 'resolved')),
          count(disputes.where('status', '==', 'closed')),
        ]);
        return {
          all,
          open,
          under_review: underReview,
          awaiting_response: awaitingResponse,
          escalated,
          resolved,
          closed,
        };
      },
    );
    return {
      success: true,
      stats: cached.value,
      generatedAt: cached.generatedAt,
      cacheAgeSeconds: cached.cacheAgeSeconds,
    };
  }

  async getDisputeById(
    disputeId: string,
    requesterId?: string,
    role: UserRole = 'admin',
  ) {
    const { dispute } = await this.getRequired(disputeId);
    if (requesterId) this.assertParticipant(dispute, requesterId, role);
    return { success: true, dispute };
  }

  async getEvents(disputeId: string, requesterId: string, role: UserRole) {
    const { dispute } = await this.getRequired(disputeId);
    this.assertParticipant(dispute, requesterId, role);
    const snapshot = await this.db
      .collection('disputes')
      .doc(disputeId)
      .collection('events')
      .orderBy('createdAt', 'asc')
      .get();
    const events = snapshot.docs
      .map(
        (doc) =>
          ({
            id: doc.id,
            eventId: doc.data().eventId ?? doc.id,
            ...doc.data(),
          }) as DisputeEvent,
      )
      .filter((event) => role === 'admin' || event.visibility === 'shared');
    return { success: true, events };
  }

  async addComment(
    disputeId: string,
    actorId: string,
    role: UserRole,
    body: AddDisputeCommentDto,
  ) {
    const message = this.text(body.message, 'message', 1, 2000);
    const { ref, dispute } = await this.getRequired(disputeId);
    this.assertParticipant(dispute, actorId, role);
    if (dispute.status === 'closed')
      throw new BadRequestException('Closed disputes cannot receive comments.');
    if (role !== 'admin') this.assertParticipantCanReply(dispute, actorId);
    const documentIds = [...new Set(body.documentIds ?? [])];
    await this.validateEvidence(role === 'admin' ? null : actorId, documentIds);
    const visibility =
      role === 'admin' && body.visibility === 'admin' ? 'admin' : 'shared';
    const returnsToReview =
      role !== 'admin' && dispute.status === 'awaiting_response';
    const nextStatus = returnsToReview ? 'under_review' : dispute.status;
    const now = Timestamp.now();
    const eventRef = ref.collection('events').doc();
    await this.db.runTransaction(async (transaction) => {
      if (role !== 'admin') {
        const currentSnapshot = await transaction.get(ref);
        if (!currentSnapshot.exists)
          throw new NotFoundException('Dispute not found.');
        const current = this.mapDispute(
          currentSnapshot.id,
          currentSnapshot.data() ?? {},
        );
        this.assertParticipant(current, actorId, role);
        this.assertParticipantCanReply(current, actorId);
      }
      transaction.create(eventRef, {
        eventId: eventRef.id,
        ...this.eventData(
          disputeId,
          actorId,
          role,
          visibility === 'admin' ? 'internal_note' : 'comment',
          message,
          now,
          {
            documentIds,
            visibility,
            previousStatus: returnsToReview ? dispute.status : null,
            nextStatus: returnsToReview ? nextStatus : null,
          },
        ),
      });
      transaction.update(ref, {
        status: nextStatus,
        updatedAt: now,
        ...(returnsToReview ? { responseRequestedFrom: null } : {}),
      });
      for (const id of documentIds)
        transaction.update(this.db.collection('documents').doc(id), {
          relatedEntityType: 'dispute',
          relatedEntityId: disputeId,
          updatedAt: now,
        });
    });
    const updated = {
      ...dispute,
      status: nextStatus,
      updatedAt: now,
      ...(returnsToReview ? { responseRequestedFrom: null } : {}),
    };
    this.emit(updated, 'commented');
    if (role === 'admin')
      await this.auditAdminAction(
        disputeId,
        actorId,
        visibility === 'admin' ? 'noted' : 'commented',
        visibility === 'admin'
          ? 'Private note added to dispute.'
          : 'Shared response added to dispute.',
      );
    if (visibility === 'shared')
      await this.notify(
        updated,
        actorId,
        'dispute_commented',
        'Dispute updated',
        `A new message was added to ${dispute.disputeCode}.`,
      );
    return { success: true, eventId: eventRef.id };
  }

  private async transition(
    disputeId: string,
    actorId: string,
    role: DisputeRole | 'system',
    nextStatus: DisputeStatus,
    type: string,
    message: string,
    fields: Record<string, unknown> = {},
  ) {
    const ref = this.db.collection('disputes').doc(disputeId);
    let dispute!: Dispute;
    const now = Timestamp.now();
    const eventRef = ref.collection('events').doc();
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new NotFoundException('Dispute not found.');
      dispute = this.mapDispute(snapshot.id, snapshot.data()!);
      if (dispute.status === 'closed')
        throw new BadRequestException('Closed disputes cannot be changed.');
      transaction.update(ref, {
        status: nextStatus,
        updatedAt: now,
        ...fields,
      });
      transaction.create(eventRef, {
        eventId: eventRef.id,
        ...this.eventData(disputeId, actorId, role, type, message, now, {
          previousStatus: dispute.status,
          nextStatus,
        }),
      });
    });
    const updated = {
      ...dispute,
      ...fields,
      status: nextStatus,
      updatedAt: now,
    } as Dispute;
    this.emit(updated, type);
    if (role === 'admin')
      await this.auditAdminAction(disputeId, actorId, type, message);
    return updated;
  }

  async assign(
    disputeId: string,
    actorAdminId: string,
    assignedAdminId?: string,
  ) {
    const target = assignedAdminId || actorAdminId;
    const admin = await this.db.collection('users').doc(target).get();
    const roles = admin.data()?.roles ?? admin.data()?.role;
    if (
      !admin.exists ||
      !(Array.isArray(roles) ? roles.includes('admin') : roles === 'admin')
    )
      throw new BadRequestException('Assigned user is not an admin.');
    const { dispute } = await this.getRequired(disputeId);
    const next = dispute.status === 'open' ? 'under_review' : dispute.status;
    return {
      success: true,
      dispute: await this.transition(
        disputeId,
        actorAdminId,
        'admin',
        next,
        'assigned',
        `Case assigned to admin ${target}.`,
        { assignedAdminId: target },
      ),
    };
  }

  async changePriority(
    disputeId: string,
    adminId: string,
    priority: DisputePriority,
    reason: string,
  ) {
    if (!PRIORITIES.includes(priority))
      throw new BadRequestException('Invalid priority.');
    const note = this.text(reason, 'reason', 3, 500);
    const { ref, dispute } = await this.getRequired(disputeId);
    if (dispute.status === 'closed') {
      throw new BadRequestException(
        'Closed disputes cannot have their priority changed.',
      );
    }
    const now = Timestamp.now();
    const eventRef = ref.collection('events').doc();
    await this.db.runTransaction(async (transaction) => {
      transaction.update(ref, { priority, updatedAt: now });
      transaction.create(eventRef, {
        eventId: eventRef.id,
        ...this.eventData(
          disputeId,
          adminId,
          'admin',
          'priority_changed',
          `${priority}: ${note}`,
          now,
          { visibility: 'admin' },
        ),
      });
    });
    const updated = { ...dispute, priority, updatedAt: now };
    this.emit(updated, 'priority_changed');
    await this.auditAdminAction(
      disputeId,
      adminId,
      'priority_changed',
      `Priority changed to ${priority}: ${note}`,
    );
    return { success: true, dispute: updated };
  }

  async startReview(disputeId: string, adminId: string) {
    const { dispute } = await this.getRequired(disputeId);
    if (dispute.status !== 'open') {
      return { success: true, dispute };
    }
    return {
      success: true,
      dispute: await this.transition(
        disputeId,
        adminId,
        'admin',
        'under_review',
        'review_started',
        'Admin started reviewing this dispute.',
      ),
    };
  }

  async requestInformation(
    disputeId: string,
    adminId: string,
    requestedFrom: 'complainant' | 'respondent' | 'both',
    message: string,
  ) {
    if (!['complainant', 'respondent', 'both'].includes(requestedFrom))
      throw new BadRequestException('Invalid information request recipient.');
    const note = this.text(message, 'message', 3, 1000);
    const updated = await this.transition(
      disputeId,
      adminId,
      'admin',
      'awaiting_response',
      'information_requested',
      `${requestedFrom}: ${note}`,
      { responseRequestedFrom: requestedFrom },
    );
    await this.notify(
      updated,
      null,
      'dispute_information_requested',
      'Information requested',
      note,
    );
    return { success: true, dispute: updated };
  }

  async escalateDispute(
    disputeId: string,
    reason: string,
    notes?: string,
    adminId = 'admin',
  ) {
    const message =
      this.text(reason, 'reason', 3, 1000) +
      (notes?.trim() ? `\n${notes.trim()}` : '');
    const updated = await this.transition(
      disputeId,
      adminId,
      'admin',
      'escalated',
      'escalated',
      message,
    );
    await this.notify(
      updated,
      null,
      'dispute_escalated',
      'Dispute escalated',
      message,
    );
    return {
      success: true,
      message: 'Dispute escalated successfully',
      disputeId,
      dispute: updated,
    };
  }

  async resolveCanonical(
    disputeId: string,
    adminId: string,
    body: ResolveCanonicalDisputeDto,
  ) {
    const summary = this.text(body.summary, 'summary', 5, 2000);
    const recommendedActions = (body.recommendedActions ?? [])
      .map((item) => this.text(item, 'recommended action', 1, 300))
      .slice(0, 5);
    const now = Timestamp.now();
    const reopenUntil = Timestamp.fromMillis(now.toMillis() + REOPEN_WINDOW_MS);
    const resolution = {
      summary,
      recommendedActions,
      issuedByAdminId: adminId,
      issuedAt: now,
      reopenUntil,
    };
    const updated = await this.transition(
      disputeId,
      adminId,
      'admin',
      'resolved',
      'resolved',
      summary,
      {
        resolution,
        resolvedAt: now,
        acknowledgements: {},
        reopenCount: 0,
        closedAt: null,
        responseRequestedFrom: null,
      },
    );
    if (body.internalNotes?.trim())
      await this.addComment(disputeId, adminId, 'admin', {
        message: body.internalNotes,
        visibility: 'admin',
      });
    await this.notify(
      updated,
      null,
      'dispute_resolved',
      'Dispute resolution available',
      summary,
    );
    return {
      success: true,
      message: 'Dispute resolved successfully',
      disputeId,
      dispute: updated,
    };
  }

  async resolveDispute(
    disputeId: string,
    resolution: string,
    notes?: string,
    adminId = 'admin',
  ) {
    return this.resolveCanonical(disputeId, adminId, {
      summary: resolution,
      internalNotes: notes,
    });
  }

  async acknowledge(disputeId: string, userId: string, role: UserRole) {
    const ref = this.db.collection('disputes').doc(disputeId);
    const now = Timestamp.now();
    const eventRef = ref.collection('events').doc();
    let updated!: Dispute;
    let both = false;
    let alreadyAcknowledged = false;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new NotFoundException('Dispute not found.');
      const dispute = this.mapDispute(snapshot.id, snapshot.data()!);
      this.assertParticipant(dispute, userId, role);
      if (dispute.status !== 'resolved')
        throw new BadRequestException(
          'Only resolved disputes can be acknowledged.',
        );
      if (dispute.acknowledgements[userId]) {
        alreadyAcknowledged = true;
        updated = dispute;
        return;
      }
      const acknowledgements = { ...dispute.acknowledgements, [userId]: now };
      const participantIds = [dispute.borrowerId, dispute.lenderId].filter(
        Boolean,
      );
      both = participantIds.every((id) => Boolean(acknowledgements[id]));
      transaction.update(ref, {
        acknowledgements,
        status: both ? 'closed' : 'resolved',
        closedAt: both ? now : null,
        updatedAt: now,
      });
      transaction.create(eventRef, {
        eventId: eventRef.id,
        ...this.eventData(
          disputeId,
          userId,
          role,
          'acknowledged',
          'Resolution acknowledged.',
          now,
          {
            previousStatus: dispute.status,
            nextStatus: both ? 'closed' : 'resolved',
          },
        ),
      });
      updated = {
        ...dispute,
        acknowledgements,
        status: both ? 'closed' : 'resolved',
        closedAt: both ? now : null,
        updatedAt: now,
      } as Dispute;
    });
    if (alreadyAcknowledged) {
      return { success: true, dispute: updated };
    }
    this.emit(updated, both ? 'closed' : 'acknowledged');
    if (both)
      await this.notify(
        updated,
        null,
        'dispute_closed',
        'Dispute closed',
        'Both parties acknowledged the resolution.',
      );
    return { success: true, dispute: updated };
  }

  async reopen(
    disputeId: string,
    userId: string,
    role: UserRole,
    reason: string,
  ) {
    const message = this.text(reason, 'reason', 5, 1000);
    const { dispute } = await this.getRequired(disputeId);
    this.assertParticipant(dispute, userId, role);
    if (dispute.status !== 'resolved' || !dispute.resolution)
      throw new BadRequestException('Only resolved disputes can be reopened.');
    if (dispute.resolution.reopenUntil.toMillis() < Date.now())
      throw new BadRequestException(
        'The seven-day reopening period has ended.',
      );
    if (dispute.reopenCount >= 1)
      throw new ConflictException(
        'This resolution cycle has already been reopened.',
      );
    const updated = await this.transition(
      disputeId,
      userId,
      role,
      'under_review',
      'reopened',
      message,
      {
        reopenCount: dispute.reopenCount + 1,
        resolution: null,
        acknowledgements: {},
        resolvedAt: null,
        closedAt: null,
        responseRequestedFrom: null,
      },
    );
    await this.notify(
      updated,
      userId,
      'dispute_reopened',
      'Dispute reopened',
      message,
    );
    return { success: true, dispute: updated };
  }

  async close(disputeId: string, adminId: string, reason: string) {
    const message = this.text(reason, 'reason', 3, 1000);
    const now = Timestamp.now();
    const updated = await this.transition(
      disputeId,
      adminId,
      'admin',
      'closed',
      'closed',
      message,
      { closedAt: now, responseRequestedFrom: null },
    );
    await this.notify(
      updated,
      null,
      'dispute_closed',
      'Dispute closed',
      message,
    );
    return { success: true, dispute: updated };
  }

  async closeExpiredResolvedCases() {
    const now = Timestamp.now();
    const snapshot = await this.db
      .collection('disputes')
      .where('status', '==', 'resolved')
      .where('resolution.reopenUntil', '<=', now)
      .get();
    let closed = 0;
    for (const doc of snapshot.docs) {
      const ref = doc.ref;
      const eventRef = ref.collection('events').doc();
      let updated: Dispute | null = null;
      await this.db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(ref);
        if (!currentSnapshot.exists) return;
        const current = this.mapDispute(
          currentSnapshot.id,
          currentSnapshot.data()!,
        );
        if (
          current.status !== 'resolved' ||
          !current.resolution?.reopenUntil ||
          current.resolution.reopenUntil.toMillis() > now.toMillis()
        )
          return;
        transaction.update(ref, {
          status: 'closed',
          closedAt: now,
          updatedAt: now,
        });
        transaction.create(eventRef, {
          eventId: eventRef.id,
          ...this.eventData(
            current.id,
            'system',
            'system',
            'auto_closed',
            'Seven-day review period ended.',
            now,
            { previousStatus: 'resolved', nextStatus: 'closed' },
          ),
        });
        updated = {
          ...current,
          status: 'closed',
          closedAt: now,
          updatedAt: now,
        };
      });
      if (updated) {
        this.emit(updated, 'auto_closed');
        await this.notify(
          updated,
          null,
          'dispute_closed',
          'Dispute closed',
          'The seven-day resolution review period has ended.',
        );
        closed += 1;
      }
    }
    return { closed };
  }
}
