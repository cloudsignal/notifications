'use client'

import type { NotificationItemProps } from '../types'

/** Format a timestamp as relative time (e.g. "2m ago") */
function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Single notification card.
 * Renders icon, title, body, time, action CTA, and dismiss button.
 */
export function NotificationItem({ notification, onClick, onDismiss }: NotificationItemProps) {
  const n = notification

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick?.() }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        cursor: onClick ? 'pointer' : 'default',
        background: n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <div style={{
          position: 'absolute',
          left: '4px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#3b82f6',
        }} />
      )}

      {/* Icon */}
      <div style={{
        flexShrink: 0,
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
      }}>
        {n.sender?.avatar ? (
          <img
            src={n.sender.avatar}
            alt={n.sender.name}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          n.icon || '\u{1F514}'
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: '18px', color: '#111827' }}>
          {n.title}
        </div>
        <div style={{
          fontSize: '12px',
          lineHeight: '16px',
          color: '#6b7280',
          marginTop: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {n.body}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
          {timeAgo(n.ts)}
        </div>
        {n.action && (
          <button
            onClick={e => { e.stopPropagation(); window.open(n.action!.url, '_self') }}
            style={{
              marginTop: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {n.action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          aria-label="Dismiss notification"
          style={{
            flexShrink: 0,
            width: '24px',
            height: '24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
