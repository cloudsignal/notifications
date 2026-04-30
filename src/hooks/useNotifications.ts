'use client'

import { useContext } from 'react'
import { NotificationContext } from '../context/NotificationContext'

/**
 * Access the notification feed and actions.
 * Must be used within a `<NotificationProvider>`.
 */
export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error(
      'useNotifications() must be used within a <NotificationProvider>. ' +
      'Wrap your component tree with <NotificationProvider userId="..." connection={...}>'
    )
  }
  return {
    notifications: ctx.notifications,
    markAsRead: ctx.markAsRead,
    markAllAsRead: ctx.markAllAsRead,
    dismiss: ctx.dismiss,
    clearAll: ctx.clearAll,
  }
}
