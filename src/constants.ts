/** MQTT topic prefix for all notification messages */
export const TOPIC_PREFIX = '$notifications'

/** Topic segments */
export const TOPICS = {
  INBOX: 'inbox',
  CHANNELS: 'channels',
} as const

/** Topic pattern templates (for documentation, not used at runtime) */
export const TOPIC_PATTERNS = {
  USER_INBOX: '$notifications/{userId}/inbox',
  USER_INBOX_CATEGORY: '$notifications/{userId}/inbox/{category}',
  CHANNEL: '$notifications/channels/{channelId}',
  USER_INBOX_WILDCARD: '$notifications/{userId}/inbox/#',
} as const

/** Default timing and limits */
export const DEFAULTS = {
  /** In-memory notification cap */
  MAX_NOTIFICATIONS: 50,
  /** Auto-dismiss toast after 5s */
  TOAST_DURATION_MS: 5_000,
  /** Max simultaneous toasts */
  TOAST_MAX_VISIBLE: 3,
  /** Max notifications in bell dropdown */
  BELL_MAX_VISIBLE: 5,
  /** State sync frequency (1Hz) */
  SYNC_TICK_MS: 1_000,
} as const

/** Required fields for a valid notification payload */
export const REQUIRED_FIELDS = ['id', 'type', 'title', 'body', 'ts'] as const

/** Build the inbox wildcard subscription for a user */
export function userInboxWildcard(userId: string): string {
  return `${TOPIC_PREFIX}/${userId}/${TOPICS.INBOX}/#`
}

/** Build the base inbox topic for a user */
export function userInboxTopic(userId: string): string {
  return `${TOPIC_PREFIX}/${userId}/${TOPICS.INBOX}`
}

/** Build a channel topic */
export function channelTopic(channelId: string): string {
  return `${TOPIC_PREFIX}/${TOPICS.CHANNELS}/${channelId}`
}
