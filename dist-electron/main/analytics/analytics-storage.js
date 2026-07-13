"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsStoragePaths = getAnalyticsStoragePaths;
exports.loadAnalyticsIdentity = loadAnalyticsIdentity;
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
            return {
                installation_id: parsed.installation_id,
                installed_at: parsed.installed_at,
                analytics_enabled: typeof parsed.analytics_enabled === 'boolean' ? parsed.analytics_enabled : true,
                schema_version: analytics_config_js_1.ANALYTICS_CONFIG.schemaVersion,
                registration_pending: typeof parsed.registration_pending === 'boolean' ? parsed.registration_pending : true,
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
    const identity = {
        installation_id: (0, node_crypto_1.randomUUID)(),
        installed_at: new Date().toISOString(),
        analytics_enabled: true,
        schema_version: analytics_config_js_1.ANALYTICS_CONFIG.schemaVersion,
        registration_pending: true,
    };
    await saveAnalyticsIdentity(userDataPath, identity);
    return identity;
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
    return (Boolean(candidate.event) &&
        typeof candidate.event?.event_id === 'string' &&
        typeof candidate.event?.event_name === 'string' &&
        typeof candidate.created_at === 'string' &&
        typeof candidate.attempt_count === 'number');
}
//# sourceMappingURL=analytics-storage.js.map