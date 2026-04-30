'use client'

import { useContext } from 'react'
import { NotificationContext } from '../context/NotificationContext'

/**
 * Manage channel subscriptions at runtime.
 * Must be used within a `<NotificationProvider>`.
 */
export function useChannels() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error(
      'useChannels() must be used within a <NotificationProvider>.'
    )
  }
  return {
    channels: ctx.subscribedChannels,
    subscribe: ctx.subscribeChannel,
    unsubscribe: ctx.unsubscribeChannel,
  }
}
