"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSafeHostname = getSafeHostname;
exports.sanitizeIdentifier = sanitizeIdentifier;
exports.sanitizeTabType = sanitizeTabType;
exports.sanitizeFeatureName = sanitizeFeatureName;
exports.sanitizeLifetimeSeconds = sanitizeLifetimeSeconds;
exports.sanitizeComponent = sanitizeComponent;
const analytics_types_js_1 = require("./analytics-types.js");
const safeIdentifierPattern = /^[\w-]{1,128}$/;
const allowedTabTypes = new Set([
    'web',
    'settings',
    'extensions',
    'internal',
    'new_tab',
    'unknown',
]);
const allowedFeatures = new Set(Object.values(analytics_types_js_1.AnalyticsFeatures));
function getSafeHostname(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        const hostname = parsed.hostname.toLowerCase();
        if (!hostname || hostname.length > 253) {
            return null;
        }
        return hostname;
    }
    catch {
        return null;
    }
}
function sanitizeIdentifier(value) {
    return typeof value === 'string' && safeIdentifierPattern.test(value) ? value : null;
}
function sanitizeTabType(value) {
    return typeof value === 'string' && allowedTabTypes.has(value)
        ? value
        : 'unknown';
}
function sanitizeFeatureName(value) {
    return typeof value === 'string' && allowedFeatures.has(value) ? value : null;
}
function sanitizeLifetimeSeconds(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return undefined;
    }
    return Math.min(Math.round(value), 60 * 60 * 24 * 30);
}
function sanitizeComponent(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim().toLowerCase().replace(/[^\w-]/g, '_').slice(0, 64);
    return normalized || undefined;
}
//# sourceMappingURL=analytics-privacy.js.map