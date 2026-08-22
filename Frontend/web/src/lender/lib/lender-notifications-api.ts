import { API_BASE_URL, getAuthHeaders } from './api-config'

export type NotificationCategory =
  | 'loan_request'
  | 'transaction'
  | 'repayment_risk'
  | 'dispute'
  | 'agreement'
  | 'ad'
  | 'system'

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical'
export type NotificationStateFilter = 'all' | 'unread' | 'read'
export type NotificationActionTarget =
  | 'pending-requests'
  | 'dashboard'
  | 'analytics'
  | 'create-ad'
  | 'agreements'
  | 'settings'
  | null

export type LenderNotification = {
  id: string
  lenderId: string
  category: NotificationCategory
  eventType: string
  title: string
  message: string
  severity: NotificationSeverity
  isRead: boolean
  createdAt: string
  readAt: string | null
  relatedEntityType:
    | 'loanRequest'
    | 'transaction'
    | 'loan'
    | 'dispute'
    | 'loanAgreement'
    | 'ad'
    | 'system'
    | null
  relatedEntityId: string | null
  actionLabel: string | null
  actionTarget: NotificationActionTarget
  metadata: {
    borrowerId?: string
    loanId?: string
    agreementId?: string
    adId?: string
    amount?: number
    status?: string
  }
}

export type LenderNotificationsListResponse = {
  lenderId: string
  unreadCount: number
  countsByCategory: Record<NotificationCategory, number>
  notifications: LenderNotification[]
  pageInfo: {
    pageSize: number
    hasMore: boolean
    nextCursor: string | null
  }
}

export type LenderNotificationsSummaryResponse = {
  lenderId: string
  unreadCount: number
  totalCount: number
  highPriorityCount: number
  todaysCount: number
  topCategory: NotificationCategory | null
  countsByCategory: Record<NotificationCategory, number>
}

async function parseError(response: Response, fallback: string): Promise<never> {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message
    throw new Error(message || fallback)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error(fallback)
  }
}

export async function fetchLenderNotifications(
  category: string,
  state: NotificationStateFilter,
  limit = 80,
): Promise<LenderNotificationsListResponse> {
  const searchParams = new URLSearchParams({
    state,
    limit: String(limit),
  })

  if (category && category !== 'all') {
    searchParams.set('category', category)
  }

  const response = await fetch(
    `${API_BASE_URL}/lender-notifications?${searchParams.toString()}`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to load lender notifications.')
  }

  return response.json()
}

export async function fetchLenderNotificationSummary(): Promise<LenderNotificationsSummaryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/lender-notifications/summary`,
    { headers: getAuthHeaders() },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to load notification summary.')
  }

  return response.json()
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<LenderNotification> {
  const response = await fetch(
    `${API_BASE_URL}/lender-notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
    },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to mark notification as read.')
  }

  return response.json()
}

export async function markAllNotificationsAsRead(
  category: string,
  state: NotificationStateFilter,
): Promise<void> {
  const searchParams = new URLSearchParams({
    state,
  })

  if (category && category !== 'all') {
    searchParams.set('category', category)
  }

  const response = await fetch(
    `${API_BASE_URL}/lender-notifications/mark-all-read?${searchParams.toString()}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
    },
  )

  if (!response.ok) {
    return parseError(response, 'Failed to mark notifications as read.')
  }
}
