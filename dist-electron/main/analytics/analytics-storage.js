"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsStoragePaths = getAnalyticsStoragePaths;
exports.loadAnalyticsIdentity = loadAnalyticsIdentity;
exports.createAnalyticsIdentity = createAnalyticsIdentity;
exports.saveAnalyticsIdentity = saveAnalyticsIdentity;
exports.loadQueuedAnalyticsEvents = loadQueuedAnalyticsEvents;
exports.saveQueuedAnalyticsEvents = saveQueuedAnalyticsEvents;
exports.clearQueuedAnalyticsEvents = clearQueuedAnalyticsEvents;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const analytics_config_js_1 = require("./analytics-config.js");
const analyticsFileName = 'analytics.json';
const queueFileName = 'analytics-queue.json';
const retiredEventNames = new Set([
    'url_visited',
    'role_created',
    'role_updated',
    'role_deleted',
    'extension_installed',
    'extension_enabled',
    'extension_disabled',
    'extension_removed',
]);
function getAnalyticsStoragePaths(userDataPath) {
    return {
        identityPath: node_path_1.default.join(userDataPath, analyticsFileName),
        queuePath: node_path_1.default.join(userDataPath, queueFileName),
    };
}
async function loadAnalyticsIdentity(userDataPath) {
    const { identityPath } = getAnalyticsStoragePaths(userDataPath);
    try {
        const raw = await (0, promises_1.readFile)(identityPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.installation_id === 'string' && typeof parsed.installed_at === 'string') {
            if (parsed.consent_version !== 1) {
                const migratedIdentity = createAnalyticsIdentity(false);
                await saveAnalyticsIdentity(userDataPath, migratedIdentity);
                return migratedIdentity;
            }
            const hasCurrentConsent = parsed.consent_version === 1 && parsed.analytics_enabled === true;
            return {
                installation_id: parsed.installation_id,
                installed_at: parsed.installed_at,
                analytics_enabled: hasCurrentConsent,
                consent_version: 1,
                schema_version: analytics_config_js_1.ANALYTICS_CONFIG.schemaVersion,
                registration_pending: hasCurrentConsent && typeof parsed.registration_pending === 'boolean'
                    ? parsed.registration_pending
                    : hasCurrentConsent,
                last_app_version: typeof parsed.last_app_version === 'string' ? parsed.last_app_version : undefined,
            };
        }
    }
    catch (error) {
        const code = error.code;
        if (code !== 'ENOENT') {
            throw error;
        }
    }
    const identity = createAnalyticsIdentity(false);
    await saveAnalyticsIdentity(userDataPath, identity);
    return identity;
}
function createAnalyticsIdentity(analyticsEnabled) {
    return {
        installation_id: (0, node_crypto_1.randomUUID)(),
        installed_at: new Date().toISOString(),
        analytics_enabled: analyticsEnabled,
        consent_version: 1,
        schema_version: analytics_config_js_1.ANALYTICS_CONFIG.schemaVersion,
        registration_pending: analyticsEnabled,
    };
}
async function saveAnalyticsIdentity(userDataPath, identity) {
    const { identityPath } = getAnalyticsStoragePaths(userDataPath);
    await writeJsonAtomic(identityPath, identity);
}
async function loadQueuedAnalyticsEvents(userDataPath) {
    const { queuePath } = getAnalyticsStoragePaths(userDataPath);
    try {
        const raw = await (0, promises_1.readFile)(queuePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isQueueItem) : [];
    }
    catch (error) {
        const code = error.code;
        if (code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}
async function saveQueuedAnalyticsEvents(userDataPath, items) {
    const { queuePath } = getAnalyticsStoragePaths(userDataPath);
    await writeJsonAtomic(queuePath, items);
}
async function clearQueuedAnalyticsEvents(userDataPath) {
    const { queuePath } = getAnalyticsStoragePaths(userDataPath);
    await (0, promises_1.rm)(queuePath, { force: true });
}
async function writeJsonAtomic(filePath, value) {
    const temporaryPath = `${filePath}.tmp`;
    await (0, promises_1.mkdir)(node_path_1.default.dirname(filePath), { recursive: true });
    await (0, promises_1.writeFile)(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await (0, promises_1.rename)(temporaryPath, filePath);
}
function isQueueItem(item) {
    if (!item || typeof item !== 'object') {
        return false;
    }
    const candidate = item;
    const event = candidate.event;
    return (typeof event?.event_id === 'string' &&
        typeof event.event_name === 'string' &&
        !retiredEventNames.has(event.event_name) &&
        typeof candidate.created_at === 'string' &&
        typeof candidate.attempt_count === 'number');
}
//# sourceMappingURL=analytics-storage.js.map