"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRetryableStatus = isRetryableStatus;
exports.isPermanentStatus = isPermanentStatus;
exports.getRetryDelayMs = getRetryDelayMs;
exports.parseRetryAfterMs = parseRetryAfterMs;
const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);
const permanentStatusCodes = new Set([400, 413, 422]);
function isRetryableStatus(statusCode) {
    return retryableStatusCodes.has(statusCode);
}
function isPermanentStatus(statusCode) {
    return permanentStatusCodes.has(statusCode);
}
function getRetryDelayMs(attemptCount, retryAfterHeader, random = Math.random) {
    const retryAfter = parseRetryAfterMs(retryAfterHeader);
    if (retryAfter !== null) {
        return retryAfter;
    }
    const baseDelayMs = 5_000;
    const maxDelayMs = 60 * 60 * 1_000;
    const jitterMs = 1_000;
    return Math.min(baseDelayMs * 2 ** Math.max(0, attemptCount), maxDelayMs) + Math.floor(random() * jitterMs);
}
function parseRetryAfterMs(header, now = Date.now()) {
    if (!header) {
        return null;
    }
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.round(seconds * 1_000);
    }
    const dateMs = Date.parse(header);
    if (Number.isFinite(dateMs)) {
        return Math.max(0, dateMs - now);
    }
    return null;
}
//# sourceMappingURL=analytics-retry.js.map