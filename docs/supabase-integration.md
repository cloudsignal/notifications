# Supabase Integration

Full guide for integrating `@cloudsignal/notifications` with Supabase Auth in a Next.js App Router application. The SDK uses Supabase JWT tokens to authenticate MQTT connections via CloudSignal's token service.

## How It Works

1. User signs in via Supabase Auth (magic link, OAuth, etc.)
2. Supabase issues a JWT access token
3. The `NotificationProvider` passes this token to CloudSignal's token service
4. The token service verifies the JWT and creates a temporary MQTT session
5. The SDK connects to the MQTT broker and subscribes to the user's inbox

## Installation

```bash
npm install @cloudsignal/notifications @cloudsignal/mqtt-client @supabase/ssr @supabase/supabase-js
```

## Environment Variables

```bash
# .env.local

# Supabase (client + server)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# CloudSignal (client-side)
NEXT_PUBLIC_CLOUDSIGNAL_WSS_URL=wss://connect.cloudsignal.app:18885/
NEXT_PUBLIC_CLOUDSIGNAL_ORG_ID=org_k7xm4pqr2n5t
NEXT_PUBLIC_TOKEN_SERVICE_URL=https://auth.cloudsignal.app

# CloudSignal (server-side only -- for publishing notifications)
CLOUDSIGNAL_SECRET_KEY=sk_your_secret_key
CLOUDSIGNAL_MQTT_HOST=wss://connect.cloudsignal.app:18885/
CLOUDSIGNAL_ORG_ID=org_k7xm4pqr2n5t
```

## Supabase Client Setup

Create the browser client helper:

```typescript
// src/lib/supabase.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## Auth Callback Route

Handle the magic link redirect to exchange the code for a session:

```typescript
// src/app/auth/callback/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never)
            );
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

## Login Page with Magic Link

```tsx
// src/app/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (!error) setSent(true);
  };

  if (sent) {
    return <p>Check your email for a magic link!</p>;
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Sign in with Magic Link"}
      </button>
    </form>
  );
}
```

## Protected Dashboard with Notifications

The core integration -- pass the Supabase session token to `NotificationProvider`:

```tsx
// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  NotificationProvider,
  NotificationBell,
  NotificationToast,
  useChannels,
  useNotifications,
} from "@cloudsignal/notifications";
import type { Session } from "@supabase/supabase-js";

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (!data.session) {
        window.location.href = "/";
      }
    });
  }, [supabase]);

  if (loading || !session) {
    return <p>Loading...</p>;
  }

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
    >
      <DashboardContent session={session} />
      <NotificationToast position="top-right" />
    </NotificationProvider>
  );
}

function DashboardContent({ session }: { session: Session }) {
  const supabase = createClient();
  const { notifications, markAllAsRead } = useNotifications();
  const { channels, subscribe, unsubscribe } = useChannels();

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: "16px" }}>
        <div>
          <h1>Dashboard</h1>
          <span style={{ color: "#666" }}>{session.user.email}</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <NotificationBell
            maxVisible={10}
            onNotificationClick={(n) => {
              if (n.action?.url) window.location.href = n.action.url;
            }}
          />
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ padding: "16px" }}>
        <h2>Recent Notifications ({notifications.length})</h2>
        <button onClick={markAllAsRead}>Mark All Read</button>

        {notifications.map((n) => (
          <div key={n.id} style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
            <strong>{n.title}</strong> -- {n.body}
          </div>
        ))}

        <h3>Channel Subscriptions</h3>
        {["announcements", "promotions"].map((ch) => (
          <label key={ch} style={{ display: "block", padding: "4px 0" }}>
            <input
              type="checkbox"
              checked={channels.includes(ch)}
              onChange={(e) => e.target.checked ? subscribe(ch) : unsubscribe(ch)}
            />
            {ch}
          </label>
        ))}
      </main>
    </div>
  );
}
```

## Server-Side Session Verification in API Routes

When publishing notifications from an API route, verify the Supabase session server-side:

```typescript
// src/app/api/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import mqtt from "mqtt";

export async function POST(request: NextRequest) {
  // Verify Supabase session server-side
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse notification from request body
  const { userId, notification, channel } = await request.json();

  const payload = {
    ...notification,
    id: notification.id || crypto.randomUUID().slice(0, 8),
    ts: notification.ts || Date.now(),
  };

  // Build topic
  let topic: string;
  if (channel) {
    topic = `$notifications/channels/${channel}`;
  } else {
    topic = `$notifications/${userId}/inbox`;
    if (notification.category) {
      topic += `/${notification.category}`;
    }
  }

  // Publish via MQTT with secret key (server-side only)
  const client = mqtt.connect(process.env.CLOUDSIGNAL_MQTT_HOST!, {
    username: `server@${process.env.CLOUDSIGNAL_ORG_ID}`,
    password: process.env.CLOUDSIGNAL_SECRET_KEY,
    clientId: `api-${Date.now()}`,
    connectTimeout: 5000,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { client.end(true); reject(new Error("Timeout")); }, 5000);
    client.on("connect", () => {
      clearTimeout(timeout);
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        client.end();
        err ? reject(err) : resolve();
      });
    });
    client.on("error", (err) => { clearTimeout(timeout); client.end(true); reject(err); });
  });

  return NextResponse.json({ ok: true, topic, id: payload.id });
}
```

## Calling the API Route from the Client

```tsx
"use client";

import { useState, useCallback } from "react";

export function useNotificationSender() {
  const [sending, setSending] = useState(false);

  const send = useCallback(async (options: {
    userId?: string;
    notification: Record<string, unknown>;
    channel?: string;
  }) => {
    setSending(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      return data;
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending };
}
```

Usage:

```tsx
const { send, sending } = useNotificationSender();

// Send a personal notification
await send({
  userId: "user-123",
  notification: {
    type: "order.shipped",
    title: "Order Shipped",
    body: "Your order #1234 is on its way!",
    category: "orders",
    action: { label: "Track Order", url: "/orders/1234" },
  },
});

// Broadcast to a channel
await send({
  channel: "announcements",
  notification: {
    type: "system.maintenance",
    title: "Scheduled Maintenance",
    body: "Systems will be unavailable tonight at 2:00 AM UTC",
    channel: "announcements",
  },
});
```

## Key Points

- The `externalToken` in the connection config is the Supabase JWT `session.access_token`
- The `tokenServiceUrl` points to CloudSignal's auth service which verifies the JWT
- Secret keys (`sk_...`) are only used server-side for publishing -- never expose them in client code
- The `userId` should match `session.user.id` so the MQTT subscription targets the correct inbox
- Supabase cookies are automatically managed by `@supabase/ssr` for SSR compatibility
