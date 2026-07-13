"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsEvent = createAnalyticsEvent;
const node_crypto_1 = require("node:crypto");
const analytics_config_js_1 = require("./analytics-config.js");
function createAnalyticsEvent(options) {
    return {
        event_id: (0, node_crypto_1.randomUUID)(),
        installation_id: options.identity.installation_id,
        session_id: options.sessionId,
        event_name: options.input.event_name,
        occurred_at: new Date().toISOString(),
        app_version: options.appVersion,
        platform: options.platform,
        architecture: options.architecture,
        schema_version: analytics_config_js_1.ANALYTICS_CONFIG.schemaVersion,
        properties: options.input.properties,
    };
}
//# sourceMappingURL=analytics-events.js.map