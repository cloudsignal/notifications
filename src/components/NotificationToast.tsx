'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { DEFAULTS } from '../constants'
import type { NotificationToastProps } from '../types'
import type { Notification } from '../types'

interface ToastEntry {
  notification: Notification
  id: string
  expiresAt: number
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  'top-right': { position: 'fixed', top: '16px', right: '16px' },
  'top-left': { position: 'fixed', top: '16px', left: '16px' },
  'bottom-right': { position: 'fixed', bottom: '16px', right: '16px' },
  'bottom-left': { position: 'fixed', bottom: '16px', left: '16px' },
}

/**
 * Auto-renders incoming notifications as temporary toasts.
 * Self-contained — no dependency on external toast libraries.
 */
export function NotificationToast({
  position = 'top-right',
  duration = DEFAULTS.TOAST_DURATION_MS,
  maxVisible = DEFAULTS.TOAST_MAX_VISIBLE,
  onClick,
  renderToast,
}: NotificationToastProps) {
  const { notifications } = useNotifications()
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const seenRef = useRef(new Set<string>())

  // Watch for new notifications — detect all unseen, not just [0]
  useEffect(() => {
    if (notifications.length === 0) return

    const newEntries: ToastEntry[] = []
    for (const n of notifications) {
      if (seenRef.current.has(n.id)) break // Once we hit a seen one, all older are also seen
      seenRef.current.add(n.id)
      newEntries.push({
        notification: n,
        id: n.id,
        expiresAt: Date.now() + duration,
      })
    }

    if (newEntries.length > 0) {
      setToasts(prev => [...newEntries, ...prev].slice(0, maxVisible))
    }

    // Prune seenRef to prevent unbounded growth (keep only current notification IDs)
    if (seenRef.current.size > maxVisible * 10) {
      const currentIds = new Set(notifications.map(n => n.id))
      seenRef.current = currentIds
    }
  }, [notifications, duration, maxVisible])

  // Auto-dismiss expired toasts
  useEffect(() => {
    if (toasts.length === 0) return

    const timer = setInterval(() => {
      const now = Date.now()
      setToasts(prev => prev.filter(t => t.expiresAt > now))
    }, 500)

    return () => clearInterval(timer)
  }, [toasts.length])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{ ...POSITION_STYLES[position], zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '360px' }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => { removeToast(toast.id); onClick?.(toast.notification) }}
          role="alert"
          style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px 16px',
            cursor: onClick ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            animation: 'csn-slideIn 0.2s ease-out',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {renderToast ? renderToast(toast.notification) : (
            <>
              <div style={{ fontSize: '20px', flexShrink: 0 }}>
                {toast.notification.icon || '\u{1F514}'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                  {toast.notification.title}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {toast.notification.body}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeToast(toast.id) }}
                aria-label="Dismiss"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px' }}
              >
                ✕
              </button>
            </>
          )}
        </div>
      ))}
      <style>{`
        @keyframes csn-slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
