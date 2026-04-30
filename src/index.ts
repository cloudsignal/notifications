// Provider (+ alias for AI-generated code)
export { NotificationProvider, CloudSignalNotifications } from './context/NotificationProvider'

// Hooks
export { useNotifications } from './hooks/useNotifications'
export { useUnreadCount } from './hooks/useUnreadCount'
export { useChannels } from './hooks/useChannels'
export { useNotificationEvent } from './hooks/useNotificationEvent'

// Components
export { NotificationBell } from './components/NotificationBell'
export { NotificationToast } from './components/NotificationToast'
export { NotificationList } from './components/NotificationList'
export { NotificationItem } from './components/NotificationItem'

// Utilities
export { shortId } from './utils/uid'
export { playNotificationSound } from './utils/sounds'

// Constants
export { TOPIC_PREFIX, TOPICS, TOPIC_PATTERNS, DEFAULTS, userInboxWildcard, userInboxTopic, channelTopic } from './constants'

// Types
export type {
  Notification,
  InternalNotification,
  NotificationProviderProps,
  NotificationConnectionConfig,
  NotificationContextValue,
  NotificationEventHandler,
  TopicHandler,
  PublishOptions,
  NotificationBellProps,
  NotificationToastProps,
  NotificationListProps,
  NotificationItemProps,
} from './types'

export const VERSION = '0.1.0'
