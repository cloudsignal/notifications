'use client'

import { useContext, useCallback } from 'react'
import { NotificationContext } from '../context/NotificationContext'

/**
 * Lightweight hook for badge rendering.
 * Re-renders only when the unread count changes.
 */
export function useUnreadCount() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error(
      'useUnreadCount() must be used within a <NotificationProvider>.'
    )
  }

  const { unreadCount, markAllAsRead } = ctx

  const reset = useCallback(() => {
    markAllAsRead()
  }, [markAllAsRead])

  return {
    count: unreadCount,
    reset,
  }
}
