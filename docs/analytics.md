# RolesTab Pseudonymous Usage Analytics

RolesTab analytics runs in the Electron main process. Renderer code can only send fixed internal signals through the preload bridge, and loaded web content does not receive that bridge because webviews run with context isolation, sandboxing, and no Node integration.

## Local Storage

Analytics uses the existing app-data JSON persistence style in `app.getPath("userData")`.

- `analytics.json` stores `installation_id`, `installed_at`, `analytics_enabled`, consent version, schema version, and registration state.
- `analytics-queue.json` stores unsent queue items.

The installation ID is a random UUID v4. It is pseudonymous rather than anonymous because it links events from the same installation. It is never derived from IP address, machine name, username, MAC address, serial number, or browser fingerprint.

## Lifecycle

Analytics is off by default. A legacy preference without the current consent marker is migrated to off and its old installation ID is replaced. After a user explicitly enables analytics, startup creates a fresh session ID, registers the installation asynchronously, and queues `app_launched` and `session_started`.

On clean shutdown it queues `session_ended` and `app_closed`, then attempts a short flush. Remaining events stay in the local queue for the next launch.

## Events

Supported events include app/session lifecycle, tab actions, controlled feature usage, app updates, and application errors represented by fixed error codes.

Navigation destinations are not collected: hostnames, full URLs, paths, query strings, fragments, and page titles are never analytics payloads. Role events, role IDs, role names, extension events, extension IDs, extension paths, page content, cookies, error messages, component names, stack traces, and secrets are also excluded. Legacy queued navigation, role, and extension events are discarded before they can be sent.

## Queue And Retry

The queue survives restarts and is capped at 5,000 events with a 7-day age limit. Flushes run after startup/registration, every 30 seconds, when the queue reaches a threshold, when the renderer reports that network connectivity has returned, and during clean shutdown. The connectivity signal carries no network details and only requests an immediate flush through a trusted IPC handler.

Single events post to `/analytics/events`; batches post to `/analytics/events/batch`. Accepted and duplicate events are removed. Rejected invalid events are quarantined. Temporary failures, timeouts, `429`, and `5xx` responses retry with exponential backoff and jitter, respecting `Retry-After`.

## Opt-Out

The final first-run guide step offers equally clear `Share analytics` and `Not now` choices, with no preselected option. The consent step and Settings both link to the authoritative policy at `https://rolestab.app/privacy`. The Settings panel also exposes `Share pseudonymous usage analytics`. Enabling it is an explicit opt-in. Disabling it stops new event creation, stops sending, clears queued events, and replaces the installation ID so a later opt-in cannot be linked to the earlier local identity. Resetting other app settings preserves this privacy choice.

## Server Requirements

The desktop client cannot enforce server-side log handling or data deletion. Before release, the analytics API must define and enforce an event retention period, minimize or promptly remove source IP addresses from application and proxy logs, restrict analytics access, and provide an operational deletion process keyed by installation ID. These requirements do not change the current request payload schema.

## Development

Production defaults to `https://api.rolestab.app/api/v1`. Development can override the base URL with:

```text
ROLESTAB_ANALYTICS_BASE_URL=http://127.0.0.1:3000/api/v1
```

No API secrets are stored in the client.

## Adding Events

Add new events by updating the discriminated union in `src/main/analytics/analytics-types.ts`, adding narrow preload and IPC methods if the renderer must initiate them, validating all payload fields in main, and adding tests that prove sensitive values are excluded.
