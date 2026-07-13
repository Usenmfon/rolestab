"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeTabType = sanitizeTabType;
exports.sanitizeFeatureName = sanitizeFeatureName;
exports.sanitizeLifetimeSeconds = sanitizeLifetimeSeconds;
const analytics_types_js_1 = require("./analytics-types.js");
const allowedTabTypes = new Set([
    'web',
    'settings',
    'extensions',
    'internal',
    'new_tab',
    'unknown',
]);
const allowedFeatures = new Set(Object.values(analytics_types_js_1.AnalyticsFeatures));
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
//# sourceMappingURL=analytics-privacy.js.map