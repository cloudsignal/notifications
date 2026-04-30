'use client'

import { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import type { NotificationListProps } from '../types'

/**
 * Scrollable notification feed.
 * Uses useNotifications() for the data — must be inside <NotificationProvider>.
 */
export function NotificationList({
  onNotificationClick,
  renderItem,
  renderEmpty,
  className,
}: NotificationListProps) {
  const { notifications, dismiss } = useNotifications()

  if (notifications.length === 0) {
    return (
      <div className={className} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
        {renderEmpty ? renderEmpty() : 'No notifications'}
      </div>
    )
  }

  return (
    <div className={className} style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {notifications.map(n =>
        renderItem ? (
          <div key={n.id}>{renderItem(n)}</div>
        ) : (
          <NotificationItem
            key={n.id}
            notification={n}
            onClick={() => onNotificationClick?.(n)}
            onDismiss={() => dismiss(n.id)}
          />
        )
      )}
    </div>
  )
}
