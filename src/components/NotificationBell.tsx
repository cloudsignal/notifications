'use client'

import { useState, useRef, useEffect } from 'react'
import { useUnreadCount } from '../hooks/useUnreadCount'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { DEFAULTS } from '../constants'
import type { NotificationBellProps } from '../types'

/**
 * Bell icon with unread badge and dropdown.
 * Opens a NotificationList on click, marks all as read.
 */
export function NotificationBell({
  maxVisible = DEFAULTS.BELL_MAX_VISIBLE,
  onNotificationClick,
  renderEmpty,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { count, reset } = useUnreadCount()
  const { notifications, markAllAsRead, dismiss } = useNotifications()
  const containerRef = useRef<HTMLDivElement>(null)
  const visibleNotifications = notifications.slice(0, maxVisible)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const toggleDropdown = () => {
    const willOpen = !isOpen
    setIsOpen(willOpen)
    if (willOpen) {
      markAllAsRead()
    }
  }

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell button */}
      <button
        onClick={toggleDropdown}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Bell SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge */}
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#ef4444',
            color: 'white',
            fontSize: '10px',
            fontWeight: 700,
            borderRadius: '9999px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '360px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid rgba(0,0,0,0.08)',
          overflow: 'hidden',
          zIndex: 9998,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', fontWeight: 600, fontSize: '14px', color: '#111827' }}>
            Notifications
          </div>
          {visibleNotifications.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
              {renderEmpty ? renderEmpty() : 'All caught up!'}
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {visibleNotifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={() => { setIsOpen(false); onNotificationClick?.(n) }}
                  onDismiss={() => dismiss(n.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
