# CloudSignal Notifications — AI Integration Guide

Use this guide when generating code that adds real-time notifications.

## Quick Start

```bash
npm install @cloudsignal/notifications @cloudsignal/mqtt-client
```

## Core Pattern

Wrap your app with `<NotificationProvider>`, use hooks/components inside:

```tsx
import { NotificationProvider, NotificationBell, NotificationToast } from "@cloudsignal/notifications";

function App({ session }) {
  return (
    <NotificationProvider
      userId={session.user.id}
      connection={{
        host: "wss://connect.cloudsignal.app:18885/",
        organizationId: "org-uuid",
        externalToken: session.access_token,
        tokenServiceUrl: "https://auth.cloudsignal.app",
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

## Available Primitives

### Provider
- `<NotificationProvider userId="..." connection={...}>` — wraps everything, manages MQTT connection

### Hooks (use inside `<NotificationProvider>`)
- `useNotifications()` — feed + actions: `{ notifications, markAsRead, markAllAsRead, dismiss, clearAll }`
- `useUnreadCount()` — badge count: `{ count, reset }`
- `useChannels()` — subscriptions: `{ channels, subscribe, unsubscribe }`
- `useNotificationEvent(type, callback)` — filtered listener for specific notification types

### Components (drop-in UI)
- `<NotificationBell maxVisible={5} />` — bell icon + unread badge + dropdown
- `<NotificationToast position="top-right" duration={5000} />` — auto-show incoming as toasts
- `<NotificationList />` — scrollable notification feed
- `<NotificationItem notification={n} />` — single notification card

## Connection Options

```tsx
// Direct credentials
connection={{ host: "wss://...", username: "user@org_id", password: "pass" }}

// Token-based (secret key)
connection={{ host: "wss://...", organizationId: "org-uuid", secretKey: "sk_..." }}

// External IdP (Supabase, Clerk, etc.)
connection={{ host: "wss://...", organizationId: "org-uuid", externalToken: "jwt...", tokenServiceUrl: "https://auth.cloudsignal.app" }}
```

## Common Patterns

### E-commerce Notification Handler
```tsx
function OrderTracker() {
  useNotificationEvent("order.shipped", (n) => {
    // Refresh order list when shipping updates arrive
    queryClient.invalidateQueries(["orders"]);
  });

  return <OrderList />;
}
```

### Channel Subscription Toggle
```tsx
function ChannelSettings() {
  const { channels, subscribe, unsubscribe } = useChannels();

  return (
    <label>
      <input
        type="checkbox"
        checked={channels.includes("promotions")}
        onChange={(e) => e.target.checked ? subscribe("promotions") : unsubscribe("promotions")}
      />
      Promotions
    </label>
  );
}
```

## Rules for AI Code Generation

1. Always wrap with `<NotificationProvider>` before using hooks/components
2. `userId` and `connection` props are required
3. Notifications are receive-only — never publish from client
4. Use server-side API routes with secret key for sending notifications
5. Components accept `className` for Tailwind/CSS styling
6. Use `useNotificationEvent` for type-specific side effects
7. Channel subscriptions are dynamic — use `useChannels()` for runtime changes
