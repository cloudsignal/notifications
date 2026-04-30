# Server-Side Publishing

The `@cloudsignal/notifications` SDK is **receive-only** -- it never publishes to MQTT from the client. Notifications are sent from your backend by publishing MQTT messages with a secret key.

## Notification Payload Structure

Every notification published to MQTT must be a JSON object with these fields:

```typescript
interface Notification {
  /** Unique notification ID (required) */
  id: string;
  /** Notification type, e.g. "order.shipped" (required) */
  type: string;
  /** Short title (required) */
  title: string;
  /** Body text (required) */
  body: string;
  /** Timestamp in milliseconds (required) */
  ts: number;
  /** Icon URL or emoji */
  icon?: string;
  /** Rich image URL */
  image?: string;
  /** Call-to-action button */
  action?: {
    label: string;
    url: string;
  };
  /** Category for filtering (e.g. "orders", "payments") */
  category?: string;
  /** Channel ID -- populated for channel broadcasts */
  channel?: string;
  /** Who triggered this notification */
  sender?: {
    name: string;
    avatar?: string;
  };
  /** Arbitrary metadata */
  data?: Record<string, unknown>;
}
```

Required fields: `id`, `type`, `title`, `body`, `ts`. The SDK drops messages missing any required field.

## Next.js API Route Example

A full API route that verifies the user session, builds the notification, and publishes via MQTT:

```typescript
// app/api/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import mqtt from "mqtt";

const MQTT_HOST = process.env.CLOUDSIGNAL_MQTT_HOST!;
const SECRET_KEY = process.env.CLOUDSIGNAL_SECRET_KEY!;
const ORG_ID = process.env.CLOUDSIGNAL_ORG_ID!;

export async function POST(request: NextRequest) {
  // 1. Verify session
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

  // 2. Parse request
  const { userId, notification, channel } = await request.json();

  if (!notification?.type || !notification?.title || !notification?.body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 3. Build payload with id and ts
  const payload = {
    ...notification,
    id: notification.id || crypto.randomUUID().slice(0, 8),
    ts: notification.ts || Date.now(),
  };

  // 4. Determine MQTT topic
  let topic: string;
  if (channel) {
    topic = `$notifications/channels/${channel}`;
  } else if (userId) {
    topic = `$notifications/${userId}/inbox`;
    if (notification.category) {
      topic = `$notifications/${userId}/inbox/${notification.category}`;
    }
  } else {
    return NextResponse.json({ error: "userId or channel required" }, { status: 400 });
  }

  // 5. Connect, publish, disconnect
  const client = mqtt.connect(MQTT_HOST, {
    username: `server@${ORG_ID}`,
    password: SECRET_KEY,
    clientId: `notify-api-${Date.now()}`,
    connectTimeout: 5000,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("MQTT connection timeout"));
    }, 5000);

    client.on("connect", () => {
      clearTimeout(timeout);
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        client.end();
        if (err) reject(err);
        else resolve();
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      client.end(true);
      reject(err);
    });
  });

  return NextResponse.json({ ok: true, topic, id: payload.id });
}
```

## Express.js Example

```typescript
// routes/notify.ts
import express from "express";
import mqtt from "mqtt";

const router = express.Router();

const MQTT_HOST = process.env.CLOUDSIGNAL_MQTT_HOST!;
const SECRET_KEY = process.env.CLOUDSIGNAL_SECRET_KEY!;
const ORG_ID = process.env.CLOUDSIGNAL_ORG_ID!;

router.post("/notify", async (req, res) => {
  const { userId, notification, channel } = req.body;

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

  // Publish
  const client = mqtt.connect(MQTT_HOST, {
    username: `server@${ORG_ID}`,
    password: SECRET_KEY,
    clientId: `express-notify-${Date.now()}`,
    connectTimeout: 5000,
  });

  client.on("connect", () => {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      client.end();
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, topic, id: payload.id });
    });
  });

  client.on("error", (err) => {
    client.end(true);
    res.status(500).json({ error: err.message });
  });
});

export default router;
```

## Direct MQTT Publish Example

If you already have an MQTT client connected (e.g., in a long-running worker), publish directly:

```typescript
import mqtt from "mqtt";

const client = mqtt.connect("wss://connect.cloudsignal.app:18885/", {
  username: `server@${process.env.CLOUDSIGNAL_ORG_ID}`,
  password: process.env.CLOUDSIGNAL_SECRET_KEY,
  clientId: `worker-${process.pid}`,
});

// Send a personal notification to a specific user
function notifyUser(userId: string, notification: Record<string, unknown>) {
  const payload = {
    id: crypto.randomUUID().slice(0, 8),
    ts: Date.now(),
    ...notification,
  };

  const category = notification.category as string | undefined;
  const topic = category
    ? `$notifications/${userId}/inbox/${category}`
    : `$notifications/${userId}/inbox`;

  client.publish(topic, JSON.stringify(payload), { qos: 1 });
}

// Broadcast to a channel (all subscribed users receive it)
function broadcastChannel(channelId: string, notification: Record<string, unknown>) {
  const payload = {
    id: crypto.randomUUID().slice(0, 8),
    ts: Date.now(),
    ...notification,
  };

  client.publish(
    `$notifications/channels/${channelId}`,
    JSON.stringify(payload),
    { qos: 1 }
  );
}
```

## Notification Examples by Type

### Order Shipped

```typescript
notifyUser("user-123", {
  type: "order.shipped",
  title: "Order Shipped",
  body: "Your order #1234 has been shipped and is on its way!",
  icon: "package",
  category: "orders",
  action: { label: "Track Order", url: "/orders/1234" },
});
```

### Payment Received

```typescript
notifyUser("user-123", {
  type: "payment.received",
  title: "Payment Received",
  body: "We received your payment of $49.99",
  icon: "credit-card",
  category: "payments",
  action: { label: "View Receipt", url: "/payments/receipt-5678" },
});
```

### Team Mention

```typescript
notifyUser("user-456", {
  type: "team.mention",
  title: "New Mention",
  body: "@alex mentioned you in Project Alpha",
  icon: "message",
  category: "mentions",
  sender: { name: "Alex Chen", avatar: "https://example.com/avatars/alex.png" },
  action: { label: "View Message", url: "/messages/thread-91011" },
});
```

### System Maintenance (Channel Broadcast)

```typescript
broadcastChannel("announcements", {
  type: "system.maintenance",
  title: "Scheduled Maintenance",
  body: "Systems will be briefly unavailable tonight at 2:00 AM UTC",
  icon: "wrench",
  category: "system",
  channel: "announcements",
});
```

### Flash Sale (Channel Broadcast)

```typescript
broadcastChannel("promotions", {
  type: "promotion.sale",
  title: "Flash Sale: 50% Off",
  body: "Limited time offer on all premium plans!",
  icon: "party",
  category: "promotions",
  channel: "promotions",
  action: { label: "Shop Now", url: "/pricing" },
});
```

## Topic Routing Summary

| Target | Topic Pattern | Example |
|--------|---------------|---------|
| User inbox | `$notifications/{userId}/inbox` | `$notifications/user-123/inbox` |
| Categorized inbox | `$notifications/{userId}/inbox/{category}` | `$notifications/user-123/inbox/orders` |
| Channel broadcast | `$notifications/channels/{channelId}` | `$notifications/channels/announcements` |

## Authentication

Server-side MQTT connections authenticate with:

- **Username**: `server@{org_short_id}` (e.g., `server@org_k7xm4pqr2n5t`)
- **Password**: Your CloudSignal secret key (`sk_...`)

The secret key should only be used server-side. Never expose it in client code or environment variables prefixed with `NEXT_PUBLIC_`.

```bash
# .env (server-side only)
CLOUDSIGNAL_SECRET_KEY=sk_your_secret_key_here
CLOUDSIGNAL_MQTT_HOST=wss://connect.cloudsignal.app:18885/
CLOUDSIGNAL_ORG_ID=org_k7xm4pqr2n5t
```
