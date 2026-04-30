'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import CloudSignalClient from '@cloudsignal/mqtt-client'
import { NotificationContext } from './NotificationContext'
import { DEFAULTS, REQUIRED_FIELDS, userInboxWildcard, channelTopic } from '../constants'
import type {
  NotificationProviderProps,
  NotificationContextValue,
  TopicHandler,
  Notification,
  InternalNotification,
} from '../types'

// Type for the CloudSignal client instance
interface CSClient {
  connect(config: Record<string, unknown>): Promise<void>
  connectWithToken(config: Record<string, unknown>): Promise<void>
  subscribe(topic: string, qos?: 0 | 1 | 2): Promise<void>
  unsubscribe(topic: string): Promise<void>
  transmit(topic: string, message: string | object, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void
  destroy(): void
  onMessage(handler: (topic: string, message: string) => void): void
  offMessage(handler: (topic: string, message: string) => void): void
  onConnectionStatusChange: ((connected: boolean) => void) | null
  onReconnecting: ((attempt: number) => void) | null
  onAuthError: ((error: Error) => void) | null
}

/** Validate that a payload has all required notification fields */
function isValidNotification(payload: unknown): payload is Notification {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return REQUIRED_FIELDS.every(field => field in p && p[field] != null)
}

export function NotificationProvider({
  userId,
  connection,
  channels: initialChannels = [],
  maxNotifications = DEFAULTS.MAX_NOTIFICATIONS,
  onNotification,
  debug = false,
  children,
}: NotificationProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Notification state — synced from refs at 1Hz
  const [notifications, setNotifications] = useState<InternalNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(initialChannels)

  // Refs for StrictMode safety
  const clientRef = useRef<CSClient | null>(null)
  const connectingRef = useRef(false)
  const mountedRef = useRef(true)
  const handlersRef = useRef(new Map<string, Set<TopicHandler>>())
  const messageHandlerRef = useRef<((topic: string, message: string) => void) | null>(null)
  const onNotificationRef = useRef(onNotification)

  // Ref-based notification storage (synced to state at 1Hz)
  const notificationsRef = useRef<InternalNotification[]>([])
  const unreadCountRef = useRef(0)
  const dirtyRef = useRef(false)

  useEffect(() => {
    onNotificationRef.current = onNotification
  }, [onNotification])

  // Logging
  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log('[CloudSignal:Notifications]', ...args)
  }, [debug])

  // Topic handler registry
  const addTopicHandler = useCallback((segment: string, handler: TopicHandler): (() => void) => {
    if (!handlersRef.current.has(segment)) {
      handlersRef.current.set(segment, new Set())
    }
    handlersRef.current.get(segment)!.add(handler)
    return () => {
      handlersRef.current.get(segment)?.delete(handler)
    }
  }, [])

  // Message router — parses topic, dispatches to handlers, adds to notification list
  const routeMessage = useCallback((topic: string, messageStr: string) => {
    let payload: unknown
    try {
      payload = JSON.parse(messageStr)
    } catch {
      payload = messageStr
    }

    // Determine if this is an inbox or channel message
    const inboxPrefix = `$notifications/${userId}/inbox`
    const channelPrefix = '$notifications/channels/'

    let segment: string
    let subtopic: string

    if (topic.startsWith(inboxPrefix)) {
      segment = 'inbox'
      subtopic = topic.slice(inboxPrefix.length + 1) || '' // category or empty
    } else if (topic.startsWith(channelPrefix)) {
      segment = 'channels'
      subtopic = topic.slice(channelPrefix.length) // channelId
    } else {
      return // Not a notification topic
    }

    log('←', segment, subtopic || '(base)')

    // Validate before dispatching — only valid notifications reach hooks and the list
    if (!isValidNotification(payload)) {
      log('Dropped malformed notification:', payload)
      return
    }

    // Dispatch to registered handlers (useNotificationEvent hooks)
    const handlers = handlersRef.current.get(segment)
    if (handlers) {
      for (const handler of handlers) {
        handler(subtopic, payload)
      }
    }

    const internal: InternalNotification = {
      ...payload,
      isRead: false,
      receivedAt: Date.now(),
    }

    // Prepend, cap at maxNotifications
    notificationsRef.current = [internal, ...notificationsRef.current].slice(0, maxNotifications)
    unreadCountRef.current = notificationsRef.current.filter(n => !n.isRead).length
    dirtyRef.current = true

    // Fire callback
    onNotificationRef.current?.(payload)
  }, [userId, maxNotifications, log])

  // 1Hz state sync tick
  useEffect(() => {
    const interval = setInterval(() => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      setNotifications([...notificationsRef.current])
      setUnreadCount(unreadCountRef.current)
    }, DEFAULTS.SYNC_TICK_MS)
    return () => clearInterval(interval)
  }, [])

  // Notification actions
  const markAsRead = useCallback((id: string) => {
    notificationsRef.current = notificationsRef.current.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    )
    unreadCountRef.current = notificationsRef.current.filter(n => !n.isRead).length
    dirtyRef.current = true
  }, [])

  const markAllAsRead = useCallback(() => {
    notificationsRef.current = notificationsRef.current.map(n => ({ ...n, isRead: true }))
    unreadCountRef.current = 0
    dirtyRef.current = true
  }, [])

  const dismiss = useCallback((id: string) => {
    notificationsRef.current = notificationsRef.current.filter(n => n.id !== id)
    unreadCountRef.current = notificationsRef.current.filter(n => !n.isRead).length
    dirtyRef.current = true
  }, [])

  const clearAll = useCallback(() => {
    notificationsRef.current = []
    unreadCountRef.current = 0
    dirtyRef.current = true
  }, [])

  // Channel subscription management
  const subscribeChannel = useCallback((channelId: string) => {
    if (!clientRef.current) return
    const topic = channelTopic(channelId)
    clientRef.current.subscribe(topic, 1)
    log('Subscribed to channel:', channelId)
    setSubscribedChannels(prev => prev.includes(channelId) ? prev : [...prev, channelId])
  }, [log])

  const unsubscribeChannel = useCallback((channelId: string) => {
    if (!clientRef.current) return
    const topic = channelTopic(channelId)
    clientRef.current.unsubscribe(topic)
    log('Unsubscribed from channel:', channelId)
    setSubscribedChannels(prev => prev.filter(c => c !== channelId))
  }, [log])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true

    const doConnect = async () => {
      if (connectingRef.current || clientRef.current) return

      connectingRef.current = true
      setIsConnecting(true)
      setError(null)

      try {
        const clientOptions: Record<string, unknown> = {
          debug,
          preset: 'desktop',
        }
        if (connection.tokenServiceUrl) {
          clientOptions.tokenServiceUrl = connection.tokenServiceUrl
        }

        const client = new CloudSignalClient(clientOptions) as unknown as CSClient

        // Connection status
        client.onConnectionStatusChange = (connected: boolean) => {
          log('Connection:', connected)
          if (mountedRef.current) {
            setIsConnected(connected)
          }
        }

        client.onReconnecting = (attempt: number) => {
          log('Reconnecting, attempt:', attempt)
        }

        client.onAuthError = (err: Error) => {
          log('Auth error:', err.message)
          if (mountedRef.current) {
            setError(err)
            setIsConnected(false)
          }
          clientRef.current = null
        }

        // Message routing
        const handler = (topic: string, message: string) => routeMessage(topic, message)
        messageHandlerRef.current = handler
        client.onMessage(handler)

        // Connect with appropriate auth method — no LWT (receive-only SDK)
        if (connection.secretKey || connection.externalToken) {
          await client.connectWithToken({
            host: connection.host,
            organizationId: connection.organizationId,
            secretKey: connection.secretKey,
            externalToken: connection.externalToken,
          })
        } else {
          await client.connect({
            host: connection.host,
            username: connection.username,
            password: connection.password,
          })
        }

        if (!mountedRef.current) {
          client.destroy()
          return
        }

        clientRef.current = client

        // Subscribe to personal inbox (wildcard covers base + categories)
        await client.subscribe(userInboxWildcard(userId), 1)
        log('Subscribed to inbox:', userInboxWildcard(userId))

        // Subscribe to initial channels
        for (const ch of initialChannels) {
          await client.subscribe(channelTopic(ch), 1)
          log('Subscribed to channel:', ch)
        }

      } catch (err) {
        log('Connection failed:', err)
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        connectingRef.current = false
        if (mountedRef.current) setIsConnecting(false)
      }
    }

    doConnect()

    return () => {
      mountedRef.current = false
      if (clientRef.current) {
        clientRef.current.destroy()
        clientRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, connection.host, connection.username, connection.password, connection.secretKey, connection.externalToken, connection.organizationId])

  // Context value
  const contextValue = useMemo<NotificationContextValue>(() => ({
    userId,
    isConnected,
    isConnecting,
    error,
    notifications,
    unreadCount,
    addTopicHandler,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    subscribeChannel,
    unsubscribeChannel,
    subscribedChannels,
  }), [userId, isConnected, isConnecting, error, notifications, unreadCount, addTopicHandler, markAsRead, markAllAsRead, dismiss, clearAll, subscribeChannel, unsubscribeChannel, subscribedChannels])

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

// Export alias for explicit naming in AI-generated code
export { NotificationProvider as CloudSignalNotifications }
