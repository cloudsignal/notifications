# Hooks Guide

All hooks must be called inside a `<NotificationProvider>`. They throw an error if used outside the provider.

## useNotifications()

Access the full notification feed and actions for managing notifications.

```tsx
import { useNotifications } from "@cloudsignal/notifications";

function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead, dismiss, clearAll } = useNotifications();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2>Notifications ({notifications.length})</h2>
        <div>
          <button onClick={markAllAsRead}>Mark All Read</button>
          <button onClick={clearAll}>Clear All</button>
        </div>
      </div>

      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            padding: "12px",
            background: n.isRead ? "white" : "#f0f7ff",
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{n.title}</strong>
            <span style={{ color: "#999", fontSize: "12px" }}>
              {new Date(n.ts).toLocaleTimeString()}
            </span>
          </div>
          <p style={{ color: "#666", margin: "4px 0" }}>{n.body}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            {!n.isRead && (
              <button onClick={() => markAsRead(n.id)}>Mark Read</button>
            )}
            <button onClick={() => dismiss(n.id)}>Dismiss</button>
            {n.action && (
              <a href={n.action.url}>{n.action.label}</a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Return Value

| Field | Type | Description |
|-------|------|-------------|
| `notifications` | `InternalNotification[]` | Notification list, newest first. Synced at 1Hz. |
| `markAsRead` | `(id: string) => void` | Mark a single notification as read (local only) |
| `markAllAsRead` | `() => void` | Mark all notifications as read |
| `dismiss` | `(id: string) => void` | Remove a notification from the list |
| `clearAll` | `() => void` | Clear all notifications |

### Notification Shape

Every notification in the `notifications` array has this shape:

```typescript
interface InternalNotification {
  id: string;           // Unique notification ID
  type: string;         // e.g. "order.shipped", "payment.received"
  title: string;        // Short title
  body: string;         // Body text
  icon?: string;        // Icon URL or emoji
  image?: string;       // Rich image URL
  action?: {
    label: string;      // CTA button text
    url: string;        // CTA link
  };
  category?: string;    // For filtering (e.g. "orders", "payments")
  channel?: string;     // Channel ID for broadcasts
  sender?: {
    name: string;
    avatar?: string;
  };
  ts: number;           // Timestamp in milliseconds
  data?: Record<string, unknown>; // Arbitrary metadata
  isRead: boolean;      // Whether the user has read this
  receivedAt: number;   // When the client received it
}
```

## useUnreadCount()

Lightweight hook optimized for badge rendering. Only re-renders when the count changes.

```tsx
import { useUnreadCount } from "@cloudsignal/notifications";

function UnreadBadge() {
  const { count, reset } = useUnreadCount();

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={reset} aria-label={`${count} unread notifications`}>
        Notifications
      </button>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            background: "red",
            color: "white",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: "bold",
            minWidth: "18px",
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}
```

### Return Value

| Field | Type | Description |
|-------|------|-------------|
| `count` | `number` | Current unread notification count |
| `reset` | `() => void` | Marks all notifications as read (resets count to 0) |

## useChannels()

Manage channel subscriptions at runtime. Subscribe and unsubscribe to MQTT channel topics dynamically.

```tsx
import { useChannels } from "@cloudsignal/notifications";

function ChannelPreferences() {
  const { channels, subscribe, unsubscribe } = useChannels();

  const availableChannels = [
    { id: "announcements", label: "Announcements", description: "System-wide updates" },
    { id: "promotions", label: "Promotions", description: "Sales and special offers" },
    { id: "engineering", label: "Engineering", description: "Technical updates" },
  ];

  const toggle = (channelId: string) => {
    if (channels.includes(channelId)) {
      unsubscribe(channelId);
    } else {
      subscribe(channelId);
    }
  };

  return (
    <div>
      <h3>Notification Channels</h3>
      {availableChannels.map((ch) => (
        <label key={ch.id} style={{ display: "flex", gap: "8px", padding: "8px 0" }}>
          <input
            type="checkbox"
            checked={channels.includes(ch.id)}
            onChange={() => toggle(ch.id)}
          />
          <div>
            <div style={{ fontWeight: "bold" }}>{ch.label}</div>
            <div style={{ color: "#666", fontSize: "12px" }}>{ch.description}</div>
          </div>
        </label>
      ))}
      <p style={{ color: "#999", fontSize: "12px", marginTop: "8px" }}>
        Currently subscribed: {channels.length > 0 ? channels.join(", ") : "none"}
      </p>
    </div>
  );
}
```

### Return Value

| Field | Type | Description |
|-------|------|-------------|
| `channels` | `string[]` | Currently subscribed channel IDs |
| `subscribe` | `(channelId: string) => void` | Subscribe to a channel at runtime |
| `unsubscribe` | `(channelId: string) => void` | Unsubscribe from a channel |

## useNotificationEvent()

Listen for specific notification types. Fires the callback when a notification with a matching `type` field arrives in the user's inbox.

```tsx
import { useNotificationEvent } from "@cloudsignal/notifications";

function OrderTracker() {
  useNotificationEvent("order.shipped", (notification) => {
    console.log("Order shipped:", notification.title);
    // Refresh your order list, show a custom UI, etc.
  });

  return <div>Tracking orders...</div>;
}
```

### Multiple Event Listeners

Register multiple listeners for different notification types:

```tsx
import { useNotificationEvent } from "@cloudsignal/notifications";

function NotificationSideEffects() {
  useNotificationEvent("order.shipped", (n) => {
    // Invalidate order cache when a shipment update arrives
    queryClient.invalidateQueries(["orders"]);
    console.log(`Order shipped: ${n.body}`);
  });

  useNotificationEvent("payment.received", (n) => {
    // Update balance display
    queryClient.invalidateQueries(["balance"]);
    console.log(`Payment: ${n.body}`);
  });

  useNotificationEvent("team.mention", (n) => {
    // Play a sound for mentions
    playNotificationSound();
    console.log(`Mentioned by: ${n.sender?.name}`);
  });

  useNotificationEvent("promotion.sale", (n) => {
    // Track promotional notification impressions
    analytics.track("promo_notification_received", { type: n.type });
  });

  useNotificationEvent("system.maintenance", (n) => {
    // Show a persistent banner for system alerts
    setMaintenanceBanner(n.body);
  });

  return null; // This component only handles side effects
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `string` | Notification type to listen for (e.g. `"order.shipped"`) |
| `callback` | `(notification: Notification) => void` | Called when a matching notification arrives |

### Notification Payload

The callback receives the raw `Notification` (not `InternalNotification`):

```typescript
interface Notification {
  id: string;
  type: string;         // Matches the first argument
  title: string;
  body: string;
  icon?: string;
  image?: string;
  action?: { label: string; url: string };
  category?: string;
  channel?: string;
  sender?: { name: string; avatar?: string };
  ts: number;
  data?: Record<string, unknown>;
}
```

Note: `useNotificationEvent` only listens on the inbox topic segment. Channel broadcast notifications are not captured by this hook. To react to channel notifications, use the provider's `addTopicHandler('channels', ...)` directly via context.
