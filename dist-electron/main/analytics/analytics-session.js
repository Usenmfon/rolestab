"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsSession = createAnalyticsSession;
const node_crypto_1 = require("node:crypto");
function createAnalyticsSession() {
    return {
        id: (0, node_crypto_1.randomUUID)(),
        startedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=analytics-session.js.map