# Components Guide

All components must be rendered inside a `<NotificationProvider>`. They connect to notification state automatically via React context.

## NotificationBell

Bell icon with an unread badge and dropdown notification list. Opens a panel on click and automatically marks all notifications as read when opened.

```tsx
import { NotificationBell } from "@cloudsignal/notifications";

function AppHeader() {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", padding: "16px" }}>
      <h1>My App</h1>
      <NotificationBell
        maxVisible={10}
        onNotificationClick={(n) => {
          if (n.action?.url) window.location.href = n.action.url;
        }}
        renderEmpty={() => <p style={{ padding: "16px" }}>You're all caught up!</p>}
        className="my-bell"
      />
    </header>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxVisible` | `number` | `5` | Max notifications shown in the dropdown |
| `onNotificationClick` | `(n: InternalNotification) => void` | -- | Click handler for a notification item |
| `renderEmpty` | `() => ReactNode` | -- | Custom empty state when no notifications |
| `className` | `string` | -- | CSS class for the outer container |

### Behavior

- Clicking the bell toggles the dropdown and marks all notifications as read
- Clicking outside the dropdown closes it
- Badge shows the unread count (caps at "99+")
- Each notification item shows icon, title, body, relative time, action CTA, and dismiss button

### Minimal Example

```tsx
import { NotificationProvider, NotificationBell } from "@cloudsignal/notifications";

function App() {
  return (
    <NotificationProvider
      userId="user-123"
      connection={{
        host: "wss://connect.cloudsignal.app:18885/",
        username: "alice@org_k7xm4pqr2n5t",
        password: "alice-password",
      }}
    >
      <NotificationBell />
    </NotificationProvider>
  );
}
```

## NotificationToast

Renders incoming notifications as temporary popup toasts. Self-contained with built-in slide-in animation and auto-dismiss.

```tsx
import { NotificationToast } from "@cloudsignal/notifications";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <NotificationToast
        position="bottom-right"
        duration={8000}
        maxVisible={5}
        onClick={(n) => {
          if (n.action?.url) window.location.href = n.action.url;
        }}
      />
    </div>
  );
}
```

### Custom Toast Renderer

Replace the default toast appearance with your own component:

```tsx
import { NotificationToast } from "@cloudsignal/notifications";
import type { Notification } from "@cloudsignal/notifications";

function CustomToastContent({ notification }: { notification: Notification }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <span style={{ fontSize: "24px" }}>{notification.icon}</span>
      <div>
        <strong>{notification.title}</strong>
        <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{notification.body}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <NotificationToast
      position="top-right"
      duration={6000}
      renderToast={(n) => <CustomToastContent notification={n} />}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"` | `"top-right"` | Screen position for the toast stack |
| `duration` | `number` | `5000` | Auto-dismiss duration in milliseconds |
| `maxVisible` | `number` | `3` | Max simultaneous toasts |
| `onClick` | `(n: Notification) => void` | -- | Click handler for a toast |
| `renderToast` | `(n: Notification) => ReactNode` | -- | Custom toast renderer |

### Positions

```tsx
// Top-right (default) — best for desktop apps
<NotificationToast position="top-right" />

// Bottom-right — less intrusive
<NotificationToast position="bottom-right" />

// Top-left — for RTL layouts or left-anchored UIs
<NotificationToast position="top-left" />

// Bottom-left
<NotificationToast position="bottom-left" />
```

## NotificationList

Scrollable notification feed. Renders all notifications from the provider's state.

```tsx
import { NotificationList } from "@cloudsignal/notifications";

function NotificationsPage() {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1>All Notifications</h1>
      <NotificationList
        onNotificationClick={(n) => {
          if (n.action?.url) window.location.href = n.action.url;
        }}
        renderEmpty={() => (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
            <p>No notifications yet</p>
            <p style={{ fontSize: "12px" }}>New notifications will appear here in real-time</p>
          </div>
        )}
        className="notification-feed"
      />
    </div>
  );
}
```

### Custom Item Renderer

Replace the default notification card with your own design:

```tsx
import { NotificationList, useNotifications } from "@cloudsignal/notifications";
import type { InternalNotification } from "@cloudsignal/notifications";

function CustomNotificationCard({ notification }: { notification: InternalNotification }) {
  const { markAsRead, dismiss } = useNotifications();

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "16px",
        borderBottom: "1px solid #eee",
        background: notification.isRead ? "transparent" : "#fafbff",
      }}
    >
      <span style={{ fontSize: "24px" }}>{notification.icon || "bell"}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{notification.title}</div>
        <div style={{ color: "#666", fontSize: "14px" }}>{notification.body}</div>
        {notification.action && (
          <a
            href={notification.action.url}
            style={{ color: "#3b82f6", fontSize: "13px", marginTop: "4px", display: "inline-block" }}
          >
            {notification.action.label}
          </a>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {!notification.isRead && (
          <button onClick={() => markAsRead(notification.id)}>Read</button>
        )}
        <button onClick={() => dismiss(notification.id)}>Dismiss</button>
      </div>
    </div>
  );
}

function NotificationsPage() {
  return (
    <NotificationList
      renderItem={(n) => <CustomNotificationCard notification={n} />}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onNotificationClick` | `(n: InternalNotification) => void` | -- | Click handler for a notification |
| `renderItem` | `(n: InternalNotification) => ReactNode` | -- | Custom item renderer |
| `renderEmpty` | `() => ReactNode` | -- | Custom empty state |
| `className` | `string` | -- | CSS class for the outer container |

## NotificationItem

A single notification card. Used internally by `NotificationBell` and `NotificationList`, but can be used standalone for custom layouts.

```tsx
import { NotificationItem, useNotifications } from "@cloudsignal/notifications";

function LatestNotification() {
  const { notifications, markAsRead, dismiss } = useNotifications();
  const latest = notifications[0];

  if (!latest) return <p>No notifications</p>;

  return (
    <NotificationItem
      notification={latest}
      onClick={() => {
        markAsRead(latest.id);
        if (latest.action?.url) window.location.href = latest.action.url;
      }}
      onDismiss={() => dismiss(latest.id)}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `notification` | `InternalNotification` | Yes | The notification to render |
| `onClick` | `() => void` | No | Click handler for the entire card |
| `onDismiss` | `() => void` | No | Dismiss handler (shows X button when provided) |

### Rendered Elements

- Unread dot indicator (blue circle when `isRead` is false)
- Icon area (renders `sender.avatar` as image, or `icon` as emoji, or default bell)
- Title (bold)
- Body text (truncated with ellipsis)
- Relative time ("just now", "2m ago", "1h ago", "3d ago")
- Action CTA link (if `action` is provided)
- Dismiss button (if `onDismiss` is provided)

## Building a Full Notification Center

Combine all components to create a complete notification center page:

```tsx
"use client";

import {
  NotificationProvider,
  NotificationBell,
  NotificationToast,
  NotificationList,
  useNotifications,
  useUnreadCount,
  useChannels,
  useNotificationEvent,
} from "@cloudsignal/notifications";

function NotificationCenterPage({ session }: { session: { user: { id: string }; access_token: string } }) {
  return (
    <NotificationProvider
      userId={session.user.id}
      connection={{
        host: "wss://connect.cloudsignal.app:18885/",
        organizationId: "org-uuid",
        externalToken: session.access_token,
        tokenServiceUrl: "https://auth.cloudsignal.app",
      }}
      channels={["announcements", "promotions"]}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header />
        <div style={{ display: "flex", flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, padding: "24px" }}>
            <NotificationFeed />
          </main>
        </div>
      </div>
      <NotificationToast position="top-right" />
      <EventHandlers />
    </NotificationProvider>
  );
}

function Header() {
  const { count } = useUnreadCount();

  return (
    <header style={{ display: "flex", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid #eee" }}>
      <h1>Notification Center</h1>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ color: "#666" }}>{count} unread</span>
        <NotificationBell maxVisible={5} />
      </div>
    </header>
  );
}

function Sidebar() {
  const { channels, subscribe, unsubscribe } = useChannels();

  const allChannels = [
    { id: "announcements", label: "Announcements" },
    { id: "promotions", label: "Promotions" },
    { id: "engineering", label: "Engineering" },
  ];

  return (
    <aside style={{ width: "240px", padding: "16px", borderRight: "1px solid #eee" }}>
      <h3>Channels</h3>
      {allChannels.map((ch) => (
        <label key={ch.id} style={{ display: "flex", gap: "8px", padding: "8px 0" }}>
          <input
            type="checkbox"
            checked={channels.includes(ch.id)}
            onChange={(e) => e.target.checked ? subscribe(ch.id) : unsubscribe(ch.id)}
          />
          {ch.label}
        </label>
      ))}
    </aside>
  );
}

function NotificationFeed() {
  const { markAllAsRead, clearAll } = useNotifications();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2>All Notifications</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={markAllAsRead}>Mark All Read</button>
          <button onClick={clearAll}>Clear All</button>
        </div>
      </div>
      <NotificationList
        onNotificationClick={(n) => {
          if (n.action?.url) window.location.href = n.action.url;
        }}
      />
    </div>
  );
}

function EventHandlers() {
  useNotificationEvent("order.shipped", (n) => {
    console.log("Order update:", n.title);
  });

  useNotificationEvent("payment.received", (n) => {
    console.log("Payment:", n.title);
  });

  return null;
}
```
