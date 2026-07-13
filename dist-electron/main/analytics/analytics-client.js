"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsClient = void 0;
const analytics_config_js_1 = require("./analytics-config.js");
const analytics_events_js_1 = require("./analytics-events.js");
const analytics_platform_js_1 = require("./analytics-platform.js");
const analytics_retry_js_1 = require("./analytics-retry.js");
const analytics_session_js_1 = require("./analytics-session.js");
const analytics_storage_js_1 = require("./analytics-storage.js");
const analytics_queue_js_1 = require("./analytics-queue.js");
class AnalyticsClient {
    options;
    identity = null;
    session = null;
    queue;
    platform;
    architecture;
    fetchImpl;
    distributionChannel;
    log;
    flushTimer = null;
    flushing = false;
    constructor(options) {
        this.options = options;
        this.queue = new analytics_queue_js_1.AnalyticsQueue(options.userDataPath);
        this.platform = (0, analytics_platform_js_1.normalizePlatform)(options.platform ?? process.platform);
        this.architecture = (0, analytics_platform_js_1.normalizeArchitecture)(options.architecture ?? process.arch);
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.distributionChannel = options.distributionChannel ?? 'github';
        this.log = options.log ?? (() => undefined);
    }
    async initialize() {
        this.identity = await (0, analytics_storage_js_1.loadAnalyticsIdentity)(this.options.userDataPath);
        await this.queue.load();
        if (!this.identity.analytics_enabled) {
            return;
        }
        this.session = (0, analytics_session_js_1.createAnalyticsSession)();
        await this.trackAppUpdatedIfNeeded();
        void this.registerInstallation().then(() => this.flush()).catch(() => undefined);
        await this.track({ event_name: 'app_launched', properties: {} });
        await this.track({ event_name: 'session_started', properties: {} });
        this.startFlushTimer();
    }
    getIdentity() {
        return this.identity;
    }
    getSessionId() {
        return this.session?.id ?? null;
    }
    getQueueLength() {
        return this.queue.length;
    }
    async track(input) {
        if (!this.identity?.analytics_enabled) {
            return;
        }
        const event = (0, analytics_events_js_1.createAnalyticsEvent)({
            input,
            identity: this.identity,
            sessionId: this.session?.id,
            appVersion: this.options.appVersion,
            platform: this.platform,
            architecture: this.architecture,
        });
        await this.queue.enqueue(event);
        if (this.queue.length >= analytics_config_js_1.ANALYTICS_CONFIG.flushThreshold) {
            void this.flush().catch(() => undefined);
        }
    }
    async setEnabled(enabled) {
        if (!this.identity) {
            this.identity = await (0, analytics_storage_js_1.loadAnalyticsIdentity)(this.options.userDataPath);
        }
        this.identity = {
            ...this.identity,
            analytics_enabled: enabled,
            registration_pending: enabled ? true : this.identity.registration_pending,
        };
        await (0, analytics_storage_js_1.saveAnalyticsIdentity)(this.options.userDataPath, this.identity);
        if (!enabled) {
            this.stopFlushTimer();
            await this.queue.clear();
            return;
        }
        if (!this.session) {
            this.session = (0, analytics_session_js_1.createAnalyticsSession)();
        }
        this.startFlushTimer();
        void this.registerInstallation().then(() => this.flush()).catch(() => undefined);
    }
    async shutdown() {
        this.stopFlushTimer();
        if (!this.identity?.analytics_enabled) {
            return;
        }
        await this.track({ event_name: 'session_ended', properties: {} });
        await this.track({ event_name: 'app_closed', properties: {} });
        await Promise.race([
            this.flush(),
            new Promise((resolve) => {
                setTimeout(resolve, analytics_config_js_1.ANALYTICS_CONFIG.shutdownFlushTimeoutMs);
            }),
        ]);
    }
    async registerInstallation() {
        if (!this.identity?.analytics_enabled) {
            return;
        }
        const payload = {
            installation_id: this.identity.installation_id,
            installed_at: this.identity.installed_at,
            app_version: this.options.appVersion,
            platform: this.platform,
            architecture: this.architecture,
            distribution_channel: this.distributionChannel,
            locale: this.options.locale,
            timezone: this.options.timezone,
            analytics_enabled: this.identity.analytics_enabled,
            schema_version: analytics_config_js_1.ANALYTICS_CONFIG.schemaVersion,
        };
        try {
            const response = await this.post('/analytics/installations', payload);
            if (response.ok || response.status === 409) {
                this.identity = { ...this.identity, registration_pending: false };
                await (0, analytics_storage_js_1.saveAnalyticsIdentity)(this.options.userDataPath, this.identity);
                return;
            }
            if (!(0, analytics_retry_js_1.isRetryableStatus)(response.status)) {
                this.log(`Analytics registration failed permanently: ${response.status}`);
            }
        }
        catch {
            this.log('Analytics registration failed temporarily.');
        }
    }
    async trackAppUpdatedIfNeeded() {
        if (!this.identity) {
            return;
        }
        const previousVersion = this.identity.last_app_version;
        if (previousVersion && previousVersion !== this.options.appVersion) {
            await this.track({
                event_name: 'app_updated',
                properties: {
                    previous_version: previousVersion,
                    new_version: this.options.appVersion,
                },
            });
        }
        this.identity = { ...this.identity, last_app_version: this.options.appVersion };
        await (0, analytics_storage_js_1.saveAnalyticsIdentity)(this.options.userDataPath, this.identity);
    }
    async flush() {
        if (this.flushing || !this.identity?.analytics_enabled) {
            return;
        }
        const batch = this.queue.readyBatch();
        if (batch.length === 0) {
            return;
        }
        this.flushing = true;
        try {
            await this.queue.markSending(batch.map((item) => item.event.event_id));
            const endpoint = batch.length === 1 ? '/analytics/events' : '/analytics/events/batch';
            const body = batch.length === 1
                ? { event: batch[0]?.event }
                : { events: batch.map((item) => item.event) };
            const response = await this.post(endpoint, body);
            if (response.ok) {
                await this.handleSuccessfulFlush(response, batch);
                return;
            }
            if ((0, analytics_retry_js_1.isPermanentStatus)(response.status)) {
                await this.queue.quarantine(batch.map((item) => item.event.event_id), String(response.status));
                return;
            }
            if ((0, analytics_retry_js_1.isRetryableStatus)(response.status)) {
                await this.queue.scheduleRetry(batch.map((item) => item.event.event_id), (0, analytics_retry_js_1.getRetryDelayMs)(getHighestAttemptCount(batch), response.headers.get('Retry-After')), String(response.status));
                return;
            }
            await this.queue.scheduleRetry(batch.map((item) => item.event.event_id), (0, analytics_retry_js_1.getRetryDelayMs)(getHighestAttemptCount(batch)), String(response.status));
        }
        catch (error) {
            const name = error instanceof Error ? error.name : 'NETWORK_ERROR';
            await this.queue.scheduleRetry(batch.map((item) => item.event.event_id), (0, analytics_retry_js_1.getRetryDelayMs)(getHighestAttemptCount(batch)), name);
        }
        finally {
            this.flushing = false;
        }
    }
    async handleSuccessfulFlush(response, batch) {
        const results = await readBatchResults(response, batch);
        const acceptedIds = [];
        const rejectedIds = [];
        const notRegisteredIds = [];
        for (const result of results) {
            if (result.status === 'accepted' || result.status === 'duplicate') {
                acceptedIds.push(result.event_id);
            }
            else if (result.error_code === 'INSTALLATION_NOT_REGISTERED') {
                notRegisteredIds.push(result.event_id);
            }
            else {
                rejectedIds.push(result.event_id);
            }
        }
        if (acceptedIds.length > 0) {
            await this.queue.remove(acceptedIds);
        }
        if (rejectedIds.length > 0) {
            await this.queue.quarantine(rejectedIds, 'REJECTED');
        }
        if (notRegisteredIds.length > 0) {
            const retryableIds = batch
                .filter((item) => notRegisteredIds.includes(item.event.event_id) && !item.registration_retry_attempted)
                .map((item) => item.event.event_id);
            const exhaustedIds = notRegisteredIds.filter((eventId) => !retryableIds.includes(eventId));
            if (retryableIds.length > 0) {
                await this.queue.flagRegistrationRetryAttempted(retryableIds);
                await this.registerInstallation();
                await this.queue.scheduleRetry(retryableIds, 0, 'INSTALLATION_NOT_REGISTERED');
            }
            if (exhaustedIds.length > 0) {
                await this.queue.quarantine(exhaustedIds, 'INSTALLATION_NOT_REGISTERED');
            }
        }
    }
    async post(path, payload) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), analytics_config_js_1.ANALYTICS_CONFIG.requestTimeoutMs);
        try {
            return await this.fetchImpl(`${analytics_config_js_1.ANALYTICS_CONFIG.baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timeout);
        }
    }
    startFlushTimer() {
        if (this.flushTimer) {
            return;
        }
        this.flushTimer = setInterval(() => {
            void this.flush().catch(() => undefined);
        }, analytics_config_js_1.ANALYTICS_CONFIG.flushIntervalMs);
        this.flushTimer.unref();
    }
    stopFlushTimer() {
        if (!this.flushTimer) {
            return;
        }
        clearInterval(this.flushTimer);
        this.flushTimer = null;
    }
}
exports.AnalyticsClient = AnalyticsClient;
async function readBatchResults(response, batch) {
    const fallback = batch.map((item) => ({
        event_id: item.event.event_id,
        status: 'accepted',
    }));
    try {
        const json = (await response.json());
        if (Array.isArray(json.results)) {
            return json.results;
        }
        if ('event_id' in json && 'status' in json) {
            return [json];
        }
    }
    catch {
        return fallback;
    }
    return fallback;
}
function getHighestAttemptCount(batch) {
    return Math.max(0, ...batch.map((item) => item.attempt_count));
}
//# sourceMappingURL=analytics-client.js.map