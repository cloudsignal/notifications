# Getting Started with @cloudsignal/notifications

Step-by-step guide to adding realtime in-app notifications to your React application.

## Installation

```bash
npm install @cloudsignal/notifications @cloudsignal/mqtt-client
```

`@cloudsignal/mqtt-client` is a peer dependency that handles the underlying MQTT WebSocket connection.

## 1. Wrap Your App with NotificationProvider

The `NotificationProvider` manages the MQTT connection, receives notifications, and exposes them to all child components via React context.

### Direct Credentials

```tsx
import { NotificationProvider, NotificationBell, NotificationToast } from "@cloudsignal/notifications";

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
      debug={false}
    >
      <Header />
      <NotificationToast position="top-right" />
      <MainContent />
    </NotificationProvider>
  );
}

function Header() {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", padding: "16px" }}>
      <h1>My App</h1>
      <NotificationBell />
    </header>
  );
}
```

### Token Auth (Secret Key)

Use this when your server manages authentication and you have a CloudSignal secret key:

```tsx
import { NotificationProvider, NotificationBell, NotificationToast } from "@cloudsignal/notifications";

export default function App() {
  return (
    <NotificationProvider
      userId="user-456"
      connection={{
        host: "wss://connect.cloudsignal.app:18885/",
        organizationId: "org-uuid",
        secretKey: "sk_your_secret_key_here",
      }}
    >
      <NotificationBell />
      <NotificationToast />
      <YourApp />
    </NotificationProvider>
  );
}
```

### Supabase / External IdP Auth

Pass a JWT from Supabase, Clerk, Firebase, or Auth0:

```tsx
import { NotificationProvider, NotificationBell, NotificationToast } from "@cloudsignal/notifications";
import { useSession } from "@supabase/auth-helpers-react";

export default function App() {
  const session = useSession();

  if (!session) return <LoginPage />;

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
      <Dashboard />
    </NotificationProvider>
  );
}
```

## 2. Add the Bell and Toast Components

Once the provider is in place, drop in `NotificationBell` for a notification inbox and `NotificationToast` for popup alerts:

```tsx
import { NotificationBell, NotificationToast } from "@cloudsignal/notifications";

function AppHeader() {
  return (
    <header>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/orders">Orders</a>
        <NotificationBell
          maxVisible={10}
          onNotificationClick={(n) => {
            if (n.action?.url) window.location.href = n.action.url;
          }}
        />
      </nav>
      <NotificationToast position="top-right" duration={5000} />
    </header>
  );
}
```

## 3. Full Working Example

A complete Next.js page with authentication, notifications, and channel subscriptions:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  NotificationProvider,
  NotificationBell,
  NotificationToast,
  useChannels,
  useNotificationEvent,
} from "@cloudsignal/notifications";

interface Session {
  user: { id: string };
  access_token: string;
}

function NotificationApp({ session }: { session: Session }) {
  return (
    <NotificationProvider
      userId={session.user.id}
      connection={{
        host: process.env.NEXT_PUBLIC_CLOUDSIGNAL_WSS_URL!,
        organizationId: process.env.NEXT_PUBLIC_CLOUDSIGNAL_ORG_ID!,
        externalToken: session.access_token,
        tokenServiceUrl: process.env.NEXT_PUBLIC_TOKEN_SERVICE_URL!,
      }}
      channels={["announcements"]}
      onNotification={(n) => console.log("New notification:", n.title)}
      debug={false}
    >
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px" }}>
        <h1>My Store</h1>
        <NotificationBell
          onNotificationClick={(n) => {
            if (n.action?.url) window.location.href = n.action.url;
          }}
        />
      </div>

      <OrderTracker />
      <ChannelSettings />
      <NotificationToast position="top-right" duration={5000} />
    </NotificationProvider>
  );
}

function OrderTracker() {
  useNotificationEvent("order.shipped", (notification) => {
    console.log("Order shipped!", notification.data);
  });

  return <div>Order tracking active...</div>;
}

function ChannelSettings() {
  const { channels, subscribe, unsubscribe } = useChannels();

  return (
    <div>
      <h3>Channel Subscriptions</h3>
      {["announcements", "promotions"].map((ch) => (
        <label key={ch}>
          <input
            type="checkbox"
            checked={channels.includes(ch)}
            onChange={(e) =>
              e.target.checked ? subscribe(ch) : unsubscribe(ch)
            }
          />
          {ch}
        </label>
      ))}
    </div>
  );
}
```

## Provider Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | `string` | Yes | -- | Unique user identifier for inbox subscriptions |
| `connection` | `NotificationConnectionConfig` | Yes | -- | MQTT connection config |
| `channels` | `string[]` | No | `[]` | Channel IDs to auto-subscribe on mount |
| `maxNotifications` | `number` | No | `50` | Max notifications kept in memory |
| `onNotification` | `(n: Notification) => void` | No | -- | Callback fired on each incoming notification |
| `debug` | `boolean` | No | `false` | Enable debug logging to console |

## Connection Config

```typescript
interface NotificationConnectionConfig {
  /** WebSocket URL (e.g. wss://connect.cloudsignal.app:18885/) */
  host: string;
  /** Direct credential auth */
  username?: string;
  password?: string;
  /** Token-based auth */
  organizationId?: string;
  secretKey?: string;
  /** External IdP token (Supabase, Clerk, etc.) */
  externalToken?: string;
  /** Token service URL for V2 auth */
  tokenServiceUrl?: string;
}
```

## Next Steps

- [Hooks Guide](./hooks-guide.md) -- learn `useNotifications`, `useUnreadCount`, `useChannels`, and `useNotificationEvent`
- [Components Guide](./components-guide.md) -- customize bell, toast, list, and item components
- [Server-Side Publishing](./server-side-publishing.md) -- send notifications from your backend
- [Channels and Topics](./channels-and-topics.md) -- understand the MQTT topic structure
- [Supabase Integration](./supabase-integration.md) -- full auth flow with Supabase
