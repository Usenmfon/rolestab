"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsQueue = void 0;
const analytics_config_js_1 = require("./analytics-config.js");
const analytics_storage_js_1 = require("./analytics-storage.js");
const highPriorityEvents = new Set([
    'application_error',
    'app_updated',
    'session_started',
    'session_ended',
]);
const lowPriorityEvents = new Set([
    'tab_opened',
    'tab_closed',
    'tab_switched',
    'url_visited',
]);
class AnalyticsQueue {
    userDataPath;
    items = [];
    writeQueue = Promise.resolve();
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    async load() {
        this.items = pruneExpiredItems(await (0, analytics_storage_js_1.loadQueuedAnalyticsEvents)(this.userDataPath));
        await this.persist();
    }
    get length() {
        return this.items.filter((item) => item.status !== 'quarantined').length;
    }
    all() {
        return [...this.items];
    }
    async enqueue(event) {
        this.items.push({
            event,
            status: 'pending',
            attempt_count: 0,
            next_retry_at: null,
            created_at: new Date().toISOString(),
        });
        this.enforceLimits();
        await this.persist();
    }
    readyBatch(now = new Date()) {
        const nowMs = now.getTime();
        return this.items
            .filter((item) => {
            if (item.status === 'quarantined' || item.status === 'sending') {
                return false;
            }
            if (!item.next_retry_at) {
                return true;
            }
            return Date.parse(item.next_retry_at) <= nowMs;
        })
            .slice(0, analytics_config_js_1.ANALYTICS_CONFIG.batchSize);
    }
    async markSending(eventIds) {
        const eventIdSet = new Set(eventIds);
        this.items = this.items.map((item) => eventIdSet.has(item.event.event_id) ? { ...item, status: 'sending' } : item);
        await this.persist();
    }
    async remove(eventIds) {
        const eventIdSet = new Set(eventIds);
        this.items = this.items.filter((item) => !eventIdSet.has(item.event.event_id));
        await this.persist();
    }
    async quarantine(eventIds, errorCode) {
        const eventIdSet = new Set(eventIds);
        this.items = this.items.map((item) => eventIdSet.has(item.event.event_id)
            ? { ...item, status: 'quarantined', last_error_code: errorCode ?? item.last_error_code }
            : item);
        await this.persist();
    }
    async scheduleRetry(eventIds, delayMs, errorCode) {
        const eventIdSet = new Set(eventIds);
        const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
        this.items = this.items.map((item) => eventIdSet.has(item.event.event_id)
            ? {
                ...item,
                status: 'retry',
                attempt_count: item.attempt_count + 1,
                next_retry_at: nextRetryAt,
                last_error_code: errorCode ?? item.last_error_code,
            }
            : item);
        await this.persist();
    }
    async flagRegistrationRetryAttempted(eventIds) {
        const eventIdSet = new Set(eventIds);
        this.items = this.items.map((item) => eventIdSet.has(item.event.event_id) ? { ...item, registration_retry_attempted: true } : item);
        await this.persist();
    }
    async clear() {
        this.items = [];
        await (0, analytics_storage_js_1.clearQueuedAnalyticsEvents)(this.userDataPath);
    }
    enforceLimits() {
        this.items = pruneExpiredItems(this.items);
        if (this.items.length <= analytics_config_js_1.ANALYTICS_CONFIG.maxQueueSize) {
            return;
        }
        const overflow = this.items.length - analytics_config_js_1.ANALYTICS_CONFIG.maxQueueSize;
        const removable = [...this.items]
            .sort((left, right) => {
            const priorityDiff = getPriority(left.event.event_name) - getPriority(right.event.event_name);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            return Date.parse(left.created_at) - Date.parse(right.created_at);
        })
            .slice(0, overflow);
        const removableIds = new Set(removable.map((item) => item.event.event_id));
        this.items = this.items.filter((item) => !removableIds.has(item.event.event_id));
    }
    async persist() {
        const snapshot = [...this.items];
        this.writeQueue = this.writeQueue
            .catch(() => undefined)
            .then(() => (0, analytics_storage_js_1.saveQueuedAnalyticsEvents)(this.userDataPath, snapshot));
        await this.writeQueue;
    }
}
exports.AnalyticsQueue = AnalyticsQueue;
function pruneExpiredItems(items) {
    const maxAgeMs = analytics_config_js_1.ANALYTICS_CONFIG.maxEventAgeDays * 24 * 60 * 60 * 1_000;
    const cutoff = Date.now() - maxAgeMs;
    return items.filter((item) => Date.parse(item.created_at) >= cutoff);
}
function getPriority(eventName) {
    if (lowPriorityEvents.has(eventName)) {
        return 0;
    }
    if (highPriorityEvents.has(eventName)) {
        return 2;
    }
    return 1;
}
//# sourceMappingURL=analytics-queue.js.map