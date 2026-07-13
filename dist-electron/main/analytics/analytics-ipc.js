"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAnalyticsIpcHandlers = registerAnalyticsIpcHandlers;
exports.trackApplicationError = trackApplicationError;
exports.getAnalyticsErrorCodeForScope = getAnalyticsErrorCodeForScope;
const electron_1 = __importDefault(require("electron"));
const analytics_privacy_js_1 = require("./analytics-privacy.js");
const analytics_types_js_1 = require("./analytics-types.js");
const { ipcMain } = electron_1.default;
function registerAnalyticsIpcHandlers(options) {
    const { analytics, assertTrustedSender } = options;
    ipcMain.on('analytics:connectivity-restored', (event) => {
        assertTrustedSender(event);
        void analytics.flush().catch(() => undefined);
    });
    ipcMain.on('analytics:tab-opened', (event, payload) => {
        assertTrustedSender(event);
        void analytics.track({
            event_name: 'tab_opened',
            properties: { tab_type: (0, analytics_privacy_js_1.sanitizeTabType)(payload?.tabType) },
        });
    });
    ipcMain.on('analytics:tab-closed', (event, payload) => {
        assertTrustedSender(event);
        const lifetimeSeconds = (0, analytics_privacy_js_1.sanitizeLifetimeSeconds)(payload?.lifetimeSeconds);
        void analytics.track({
            event_name: 'tab_closed',
            properties: {
                tab_type: (0, analytics_privacy_js_1.sanitizeTabType)(payload?.tabType),
                ...(typeof lifetimeSeconds === 'number' ? { lifetime_seconds: lifetimeSeconds } : {}),
            },
        });
    });
    ipcMain.on('analytics:tab-switched', (event, payload) => {
        assertTrustedSender(event);
        void analytics.track({
            event_name: 'tab_switched',
            properties: {
                from_tab_type: (0, analytics_privacy_js_1.sanitizeTabType)(payload?.fromTabType),
                to_tab_type: (0, analytics_privacy_js_1.sanitizeTabType)(payload?.toTabType),
            },
        });
    });
    ipcMain.on('analytics:feature-used', (event, payload) => {
        assertTrustedSender(event);
        const feature = (0, analytics_privacy_js_1.sanitizeFeatureName)(payload?.feature);
        if (feature) {
            void analytics.track({ event_name: 'feature_used', properties: { feature } });
        }
    });
}
function trackApplicationError(analytics, errorCode, severity) {
    void analytics?.track({
        event_name: 'application_error',
        properties: {
            error_code: errorCode,
            severity,
        },
    });
}
function getAnalyticsErrorCodeForScope(scope) {
    switch (scope) {
        case 'workspace-load':
            return analytics_types_js_1.AnalyticsErrorCodes.WORKSPACE_LOAD_FAILED;
        case 'settings-save':
            return analytics_types_js_1.AnalyticsErrorCodes.WORKSPACE_SAVE_FAILED;
        case 'auto-updater':
            return analytics_types_js_1.AnalyticsErrorCodes.UPDATE_CHECK_FAILED;
        case 'session-usage':
        case 'session-reset':
        case 'session-clear-project':
        case 'session-clear-all':
            return analytics_types_js_1.AnalyticsErrorCodes.SESSION_RESTORE_FAILED;
        case 'extensions-list':
            return analytics_types_js_1.AnalyticsErrorCodes.EXTENSION_LOAD_FAILED;
        default:
            return analytics_types_js_1.AnalyticsErrorCodes.RENDERER_ERROR;
    }
}
//# sourceMappingURL=analytics-ipc.js.map