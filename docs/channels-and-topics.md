# Channels and Topics

The `@cloudsignal/notifications` SDK uses MQTT topics under the `$notifications/` prefix. Understanding the topic structure helps you design notification routing for your application.

## Topic Structure

```
$notifications/
  {userId}/
    inbox              -- personal notifications (base)
    inbox/{category}   -- categorized personal notifications
  channels/
    {channelId}        -- channel broadcasts
```

### Topic Constants

The SDK exports topic-building utilities:

```typescript
import {
  TOPIC_PREFIX,       // "$notifications"
  TOPICS,             // { INBOX: "inbox", CHANNELS: "channels" }
  TOPIC_PATTERNS,     // Documentation-only patterns
  userInboxWildcard,  // (userId) => "$notifications/{userId}/inbox/#"
  userInboxTopic,     // (userId) => "$notifications/{userId}/inbox"
  channelTopic,       // (channelId) => "$notifications/channels/{channelId}"
} from "@cloudsignal/notifications";

// Examples
userInboxWildcard("user-123");  // "$notifications/user-123/inbox/#"
userInboxTopic("user-123");     // "$notifications/user-123/inbox"
channelTopic("announcements");  // "$notifications/channels/announcements"
```

## Personal Inbox

Each user has a personal inbox topic. The SDK subscribes to the wildcard `$notifications/{userId}/inbox/#` which captures both the base inbox and all category subtopics.

### Base Inbox

Publish to `$notifications/{userId}/inbox` for general notifications:

```typescript
// Server-side publish
client.publish(
  "$notifications/user-123/inbox",
  JSON.stringify({
    id: "notif-001",
    type: "system.welcome",
    title: "Welcome!",
    body: "Thanks for signing up",
    ts: Date.now(),
  }),
  { qos: 1 }
);
```

### Categorized Inbox

Publish to `$notifications/{userId}/inbox/{category}` for categorized notifications. The category is embedded in the topic, and can also be set in the payload's `category` field for client-side filtering:

```typescript
// Server-side: publish to the "orders" category
client.publish(
  "$notifications/user-123/inbox/orders",
  JSON.stringify({
    id: "notif-002",
    type: "order.shipped",
    title: "Order Shipped",
    body: "Your order #1234 is on its way",
    category: "orders",
    ts: Date.now(),
    action: { label: "Track Order", url: "/orders/1234" },
  }),
  { qos: 1 }
);

// Server-side: publish to the "payments" category
client.publish(
  "$notifications/user-123/inbox/payments",
  JSON.stringify({
    id: "notif-003",
    type: "payment.received",
    title: "Payment Received",
    body: "We received $49.99",
    category: "payments",
    ts: Date.now(),
  }),
  { qos: 1 }
);
```

Both messages are received by the client because the SDK subscribes to `$notifications/user-123/inbox/#` (wildcard).

## Channel Broadcasts

Channels are shared topics that multiple users can subscribe to. Any message published to a channel topic is delivered to all subscribers.

### Subscribing to Channels

Channels can be subscribed in two ways:

**1. At mount time via the `channels` prop:**

```tsx
import { NotificationProvider } from "@cloudsignal/notifications";

function App() {
  return (
    <NotificationProvider
      userId="user-123"
      connection={{
        host: "wss://connect.cloudsignal.app:18885/",
        username: "alice@org_k7xm4pqr2n5t",
        password: "alice-password",
      }}
      channels={["announcements", "promotions"]}
    >
      <YourApp />
    </NotificationProvider>
  );
}
```

**2. At runtime via the `useChannels` hook:**

```tsx
import { useChannels } from "@cloudsignal/notifications";

function ChannelManager() {
  const { channels, subscribe, unsubscribe } = useChannels();

  return (
    <div>
      <h3>Subscribed Channels: {channels.join(", ") || "none"}</h3>

      <button
        onClick={() => subscribe("engineering")}
        disabled={channels.includes("engineering")}
      >
        Subscribe to Engineering
      </button>

      <button
        onClick={() => unsubscribe("engineering")}
        disabled={!channels.includes("engineering")}
      >
        Unsubscribe from Engineering
      </button>
    </div>
  );
}
```

### Publishing to Channels

Publish from your server to the channel topic:

```typescript
// Server-side: broadcast to the "announcements" channel
client.publish(
  "$notifications/channels/announcements",
  JSON.stringify({
    id: "notif-004",
    type: "system.maintenance",
    title: "Scheduled Maintenance",
    body: "Systems will be unavailable tonight at 2:00 AM UTC",
    channel: "announcements",
    ts: Date.now(),
  }),
  { qos: 1 }
);
```

### Channel Toggle UI Pattern

A common pattern for letting users manage their channel subscriptions:

```tsx
import { useChannels } from "@cloudsignal/notifications";

function ChannelPreferences() {
  const { channels, subscribe, unsubscribe } = useChannels();

  const availableChannels = [
    { id: "announcements", label: "Announcements", description: "System-wide updates and maintenance notices" },
    { id: "promotions", label: "Promotions", description: "Sales, discounts, and special offers" },
    { id: "engineering", label: "Engineering", description: "Technical updates, deploy notifications" },
    { id: "product-updates", label: "Product Updates", description: "New features and improvements" },
  ];

  return (
    <div style={{ maxWidth: "400px" }}>
      <h3>Notification Preferences</h3>
      <p style={{ color: "#666", fontSize: "13px" }}>
        Choose which channels you want to receive broadcasts from.
      </p>
      {availableChannels.map((ch) => (
        <label
          key={ch.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "12px",
            borderBottom: "1px solid #eee",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={channels.includes(ch.id)}
            onChange={(e) =>
              e.target.checked ? subscribe(ch.id) : unsubscribe(ch.id)
            }
            style={{ marginTop: "2px" }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>{ch.label}</div>
            <div style={{ color: "#888", fontSize: "12px" }}>{ch.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
}
```

## QoS 1 Behavior

All subscriptions use **QoS 1** (at-least-once delivery):

- The broker guarantees each message is delivered at least once
- Messages are acknowledged by the client after receipt
- If the client disconnects and reconnects, queued messages are redelivered
- Duplicate messages may arrive -- the SDK deduplicates by notification `id`

QoS 1 is the right choice for notifications because it ensures no messages are silently lost, while the deduplication logic prevents duplicate UI entries.

## Topic ACL Patterns

For your CloudSignal organization, configure ACL rules to allow:

**Client (receive-only SDK):**
- Subscribe: `$notifications/{userId}/inbox/#` (personal inbox wildcard)
- Subscribe: `$notifications/channels/{channelId}` (per channel)

**Server (publishing backend):**
- Publish: `$notifications/+/inbox` (any user's base inbox)
- Publish: `$notifications/+/inbox/+` (any user's categorized inbox)
- Publish: `$notifications/channels/+` (any channel)

Example ACL configuration:

```
# Client rules (applied per user)
pattern subscribe $notifications/%u/inbox/#
pattern subscribe $notifications/channels/+

# Server rules (applied to server@org_id)
pattern publish $notifications/+/inbox
pattern publish $notifications/+/inbox/+
pattern publish $notifications/channels/+
```

## Summary

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `$notifications/{userId}/inbox` | Server publishes, client subscribes | General personal notifications |
| `$notifications/{userId}/inbox/{category}` | Server publishes, client subscribes | Categorized personal notifications |
| `$notifications/channels/{channelId}` | Server publishes, client subscribes | Channel broadcasts to all subscribers |
| `$notifications/{userId}/inbox/#` | Client subscribes (wildcard) | Captures all personal notifications |
