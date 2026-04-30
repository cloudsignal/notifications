import type { ReactNode } from 'react'

// ============================================================================
// Connection Configuration
// ============================================================================

/** How to connect to CloudSignal — supports credentials, token, or external IdP */
export interface NotificationConnectionConfig {
  /** WebSocket URL (e.g. wss://connect.cloudsignal.app:18885/) */
  host: string
  /** Direct credential auth */
  username?: string
  password?: string
  /** Token-based auth */
  organizationId?: string
  secretKey?: string
  /** External IdP token (Supabase, Clerk, etc.) */
  externalToken?: string
  /** Token service URL for V2 auth */
  tokenServiceUrl?: string
}

// ============================================================================
// Notification Payload
// ============================================================================

/** A notification received from the server */
export interface Notification {
  /** Unique notification ID */
  id: string
  /** Notification type (e.g. "order.shipped", "payment.received") */
  type: string
  /** Short title */
  title: string
  /** Notification body text */
  body: string
  /** Icon URL or emoji */
  icon?: string
  /** Rich image URL */
  image?: string
  /** Call-to-action */
  action?: {
    label: string
    url: string
  }
  /** Category for filtering (e.g. "orders", "payments") */
  category?: string
  /** Channel ID — populated for channel broadcasts */
  channel?: string
  /** Who triggered this notification */
  sender?: {
    name: string
    avatar?: string
  }
  /** Timestamp in milliseconds */
  ts: number
  /** Arbitrary metadata */
  data?: Record<string, unknown>
}

/** Internal notification with read/received state */
export interface InternalNotification extends Notification {
  /** Whether the user has read this notification */
  isRead: boolean
  /** When the client received this notification */
  receivedAt: number
}

// ============================================================================
// Provider
// ============================================================================

export interface NotificationProviderProps {
  /** Unique user identifier */
  userId: string
  /** MQTT connection configuration */
  connection: NotificationConnectionConfig
  /** Channel IDs to auto-subscribe on mount */
  channels?: string[]
  /** Max notifications in memory (default: 50) */
  maxNotifications?: number
  /** Callback fired on each incoming notification */
  onNotification?: (n: Notification) => void
  /** Enable debug logging */
  debug?: boolean
  children: ReactNode
}

// ============================================================================
// Context
// ============================================================================

/** Internal topic dispatch handler */
export type TopicHandler = (subtopic: string, payload: unknown) => void

/** Callback for useNotificationEvent */
export type NotificationEventHandler = (notification: Notification) => void

export interface NotificationContextValue {
  userId: string
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  /** Notification list (newest first) — synced at 1Hz */
  notifications: InternalNotification[]
  /** Unread count — synced independently at 1Hz */
  unreadCount: number
  /** Register a handler for a topic segment — returns unsubscribe function */
  addTopicHandler: (segment: string, handler: TopicHandler) => () => void
  /** Mark a notification as read (local only) */
  markAsRead: (id: string) => void
  /** Mark all notifications as read (local only) */
  markAllAsRead: () => void
  /** Remove a notification from the list */
  dismiss: (id: string) => void
  /** Clear all notifications */
  clearAll: () => void
  /** Subscribe to a channel at runtime */
  subscribeChannel: (channelId: string) => void
  /** Unsubscribe from a channel at runtime */
  unsubscribeChannel: (channelId: string) => void
  /** Currently subscribed channel IDs */
  subscribedChannels: string[]
}

export interface PublishOptions {
  qos?: 0 | 1 | 2
  retain?: boolean
}

// ============================================================================
// Component Props
// ============================================================================

export interface NotificationBellProps {
  /** Max notifications in dropdown (default: 5) */
  maxVisible?: number
  /** Click handler for a notification */
  onNotificationClick?: (n: InternalNotification) => void
  /** Custom empty state */
  renderEmpty?: () => ReactNode
  className?: string
}

export interface NotificationToastProps {
  /** Toast position (default: "top-right") */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Auto-dismiss duration in ms (default: 5000) */
  duration?: number
  /** Max simultaneous toasts (default: 3) */
  maxVisible?: number
  /** Click handler */
  onClick?: (n: Notification) => void
  /** Custom toast renderer */
  renderToast?: (n: Notification) => ReactNode
}

export interface NotificationListProps {
  /** Click handler for a notification */
  onNotificationClick?: (n: InternalNotification) => void
  /** Custom item renderer */
  renderItem?: (n: InternalNotification) => ReactNode
  /** Custom empty state */
  renderEmpty?: () => ReactNode
  className?: string
}

export interface NotificationItemProps {
  notification: InternalNotification
  onClick?: () => void
  onDismiss?: () => void
}
