# @cloudsignal/notifications

Realtime in-app notifications for React — powered by [CloudSignal](https://cloudsignal.io) MQTT.

Drop-in components for **notification bell**, **toast popups**, **notification feed**, and **channel subscriptions** with hooks for fine-grained control.

## Install

```bash
npm install @cloudsignal/notifications @cloudsignal/mqtt-client
```

## Quick Start

```tsx
import {
  NotificationProvider,
  NotificationBell,
  NotificationToast,
} from "@cloudsignal/notifications";

export default function App() {
  return (
    <NotificationProvider
      userId="user-123"
      connection={{
        host: "wss://connect.cloudsignal.app:18885/",
        username: "alice@org_k7xm4pqr2n5t",
        password: "alice-password",
      }}
      channels={["announcements"]}
    >
      <NotificationBell />
      <NotificationToast />
      <YourApp />
    </NotificationProvider>
  );
}
```

## Provider

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | `string` | Yes | — | Unique user identifier for inbox subscriptions |
| `connection` | `NotificationConnectionConfig` | Yes | — | MQTT connection config (see below) |
| `channels` | `string[]` | No | `[]` | Channel IDs to auto-subscribe on mount |
| `maxNotifications` | `number` | No | `50` | Max notifications kept in memory |
| `onNotification` | `(n: Notification) => void` | No | — | Callback fired on each incoming notification |
| `debug` | `boolean` | No | `false` | Enable debug logging to console |

## Connection Options

### Direct Credentials

```tsx
<NotificationProvider
  userId="user-123"
  connection={{
    host: "wss://connect.cloudsignal.app:18885/",
    username: "alice@org_k7xm4pqr2n5t",
    password: "alice-password",
  }}
>
```

### Token Auth (Secret Key)

```tsx
<NotificationProvider
  userId="user-123"
  connection={{
    host: "wss://connect.cloudsignal.app:18885/",
    organizationId: "org-uuid",
    secretKey: "sk_...",
  }}
>
```

### External IdP (Supabase, Clerk, Firebase, Auth0)

```tsx
import { useSession } from "@supabase/auth-helpers-react";

function App() {
  const session = useSession();

  return (
    <NotificationProvider
      userId={session.user.id}
      connection={{
        host: "wss://connect.cloudsignal.app:18885/",
        organizationId: "org-uuid",
        externalToken: session.access_token,
        tokenServiceUrl: "https://auth.cloudsignal.app",
      }}
    >
      <YourApp />
    </NotificationProvider>
  );
}
```

## Hooks

All hooks must be called inside a `<NotificationProvider>`.

| Hook | Returns | Description |
|------|---------|-------------|
| `useNotifications()` | `{ notifications, markAsRead, markAllAsRead, dismiss, clearAll }` | Full notification feed and actions |
| `useUnreadCount()` | `{ count, reset }` | Lightweight unread badge counter |
| `useChannels()` | `{ channels, subscribe, unsubscribe }` | Runtime channel subscription management |
| `useNotificationEvent(type, cb)` | `void` | Filtered listener for a specific notification type |

### useNotifications

```tsx
const { notifications, markAsRead, markAllAsRead, dismiss, clearAll } = useNotifications();

// notifications: InternalNotification[] (newest first)
// markAsRead(id: string): void
// markAllAsRead(): void
// dismiss(id: string): void — remove from list
// clearAll(): void — clear all notifications
```

### useUnreadCount

```tsx
const { count, reset } = useUnreadCount();

// count: number — current unread count
// reset(): void — marks all as read
```

### useChannels

```tsx
const { channels, subscribe, unsubscribe } = useChannels();

// channels: string[] — currently subscribed channel IDs
// subscribe(channelId: string): void
// unsubscribe(channelId: string): void
```

### useNotificationEvent

```tsx
useNotificationEvent("order.shipped", (notification) => {
  // Fires only for notifications with type === "order.shipped"
  console.log("Order shipped:", notification.data);
});
```

## Components

### NotificationBell

Bell icon with unread badge and dropdown list.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxVisible` | `number` | `5` | Max notifications in dropdown |
| `onNotificationClick` | `(n: InternalNotification) => void` | — | Click handler for a notification |
| `renderEmpty` | `() => ReactNode` | — | Custom empty state |
| `className` | `string` | — | CSS class for outer container |

```tsx
<NotificationBell maxVisible={10} onNotificationClick={(n) => router.push(n.action?.url)} />
```

### NotificationToast

Auto-renders incoming notifications as temporary toasts.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"` | `"top-right"` | Toast position |
| `duration` | `number` | `5000` | Auto-dismiss duration in ms |
| `maxVisible` | `number` | `3` | Max simultaneous toasts |
| `onClick` | `(n: Notification) => void` | — | Click handler |
| `renderToast` | `(n: Notification) => ReactNode` | — | Custom toast renderer |

```tsx
<NotificationToast position="bottom-right" duration={8000} />
```

### NotificationList

Scrollable notification feed.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onNotificationClick` | `(n: InternalNotification) => void` | — | Click handler |
| `renderItem` | `(n: InternalNotification) => ReactNode` | — | Custom item renderer |
| `renderEmpty` | `() => ReactNode` | — | Custom empty state |
| `className` | `string` | — | CSS class |

```tsx
<NotificationList
  onNotificationClick={(n) => router.push(n.action?.url)}
  renderEmpty={() => <p>No notifications yet</p>}
/>
```

### NotificationItem

Single notification card. Used internally by `NotificationBell` and `NotificationList`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `notification` | `InternalNotification` | Yes | The notification to render |
| `onClick` | `() => void` | No | Click handler |
| `onDismiss` | `() => void` | No | Dismiss handler |

## MQTT Topics

All notifications flow over MQTT topics under `$notifications/`:

| Topic | Purpose |
|-------|---------|
| `$notifications/{userId}/inbox` | Personal notifications |
| `$notifications/{userId}/inbox/{category}` | Categorized personal notifications |
| `$notifications/channels/{channelId}` | Channel broadcasts |

The provider automatically subscribes to `$notifications/{userId}/inbox/#` (wildcard covers base + categories) and each channel topic specified in the `channels` prop.

## Types

### Notification

```typescript
interface Notification {
  id: string;           // Unique notification ID
  type: string;         // e.g. "order.shipped", "payment.received"
  title: string;        // Short title
  body: string;         // Body text
  icon?: string;        // Icon URL or emoji
  image?: string;       // Rich image URL
  action?: {            // Call-to-action
    label: string;
    url: string;
  };
  category?: string;    // For filtering (e.g. "orders", "payments")
  channel?: string;     // Channel ID for broadcasts
  sender?: {            // Who triggered this
    name: string;
    avatar?: string;
  };
  ts: number;           // Timestamp in milliseconds
  data?: Record<string, unknown>; // Arbitrary metadata
}
```

### InternalNotification

Extends `Notification` with client-side state:

```typescript
interface InternalNotification extends Notification {
  isRead: boolean;     // Whether the user has read this
  receivedAt: number;  // When the client received it
}
```

## Architecture

```
@cloudsignal/notifications (this package)
  └── @cloudsignal/mqtt-client (peer dependency — MQTT transport)
        └── CloudSignal MQTT broker (managed infrastructure)
```

- **Receive-only** — the SDK never publishes to MQTT. Notifications are sent server-side via the CloudSignal API or by publishing directly with a secret key.
- **1Hz state sync** — notification state is stored in refs and synced to React state at 1Hz for batched re-renders.
- **QoS 1** — all subscriptions use QoS 1 for reliable delivery.

## License

MIT
