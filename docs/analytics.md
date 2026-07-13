# RolesTab Browser Analytics

RolesTab analytics runs in the Electron main process. Renderer code can only send fixed internal signals through the preload bridge, and loaded web content does not receive that bridge because webviews run with context isolation, sandboxing, and no Node integration.

## Local Storage

Analytics uses the existing app-data JSON persistence style in `app.getPath("userData")`.

- `analytics.json` stores `installation_id`, `installed_at`, `analytics_enabled`, schema version, and registration state.
- `analytics-queue.json` stores unsent queue items.

The installation ID is a random UUID v4. It is never derived from IP address, machine name, username, MAC address, serial number, or browser fingerprint.

## Lifecycle

On startup the main process loads or creates the installation identity, creates a fresh session ID, registers the installation asynchronously, and queues `app_launched` and `session_started`.

On clean shutdown it queues `session_ended` and `app_closed`, then attempts a short flush. Remaining events stay in the local queue for the next launch.

## Events

Supported events include app/session lifecycle, role changes, tab actions, hostname visits, extension changes, controlled feature usage, app updates, and sanitized application errors.

Role events send only the anonymous local role ID. URL visits are reduced to `hostname` with the JavaScript `URL` parser. Full URLs, paths, query strings, fragments, page titles, cookies, role names, extension paths, stack traces, and secrets are not analytics payloads.

## Queue And Retry

The queue survives restarts and is capped at 5,000 events with a 30-day age limit. Flushes run after startup/registration, every 30 seconds, when the queue reaches a threshold, when the renderer reports that network connectivity has returned, and during clean shutdown. The connectivity signal carries no network details and only requests an immediate flush through a trusted IPC handler.

Single events post to `/analytics/events`; batches post to `/analytics/events/batch`. Accepted and duplicate events are removed. Rejected invalid events are quarantined. Temporary failures, timeouts, `429`, and `5xx` responses retry with exponential backoff and jitter, respecting `Retry-After`.

## Opt-Out

The Settings panel exposes `Share anonymous usage analytics`. Disabling it stops new event creation, stops sending, clears queued events, and persists the disabled preference while preserving the anonymous installation ID. Re-enabling resumes future registration and collection only.

## Development

Production defaults to `https://api.rolestab.app/api/v1`. Development can override the base URL with:

```text
ROLESTAB_ANALYTICS_BASE_URL=http://127.0.0.1:3000/api/v1
```

No API secrets are stored in the client.

## Adding Events

Add new events by updating the discriminated union in `src/main/analytics/analytics-types.ts`, adding narrow preload and IPC methods if the renderer must initiate them, validating all payload fields in main, and adding tests that prove sensitive values are excluded.
