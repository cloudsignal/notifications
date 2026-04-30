'use client'

import { useContext, useEffect, useRef } from 'react'
import { NotificationContext } from '../context/NotificationContext'
import type { Notification, NotificationEventHandler } from '../types'

/**
 * Listen for specific notification types.
 * Fires callback when a notification with matching `type` arrives.
 * Callback receives the raw Notification (before InternalNotification enrichment).
 *
 * Note: This hook only listens on the inbox topic segment. Channel broadcast
 * notifications are not captured. To react to channel notifications, use
 * the provider's addTopicHandler('channels', ...) directly.
 */
export function useNotificationEvent(
  type: string,
  callback: NotificationEventHandler,
): void {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error(
      'useNotificationEvent() must be used within a <NotificationProvider>.'
    )
  }

  // Callback ref pattern — avoids stale closures
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    // Register on the inbox topic handler and filter by notification.type
    const unsubscribe = ctx.addTopicHandler('inbox', (_subtopic: string, payload: unknown) => {
      if (payload && typeof payload === 'object' && 'type' in payload) {
        const notification = payload as Notification
        if (notification.type === type) {
          callbackRef.current(notification)
        }
      }
    })

    return unsubscribe
  }, [ctx, type])
}
