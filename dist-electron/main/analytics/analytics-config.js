"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_CONFIG = void 0;
exports.ANALYTICS_CONFIG = {
    baseUrl: process.env.ROLESTAB_ANALYTICS_BASE_URL ?? 'https://api.rolestab.app/api/v1',
    schemaVersion: 1,
    batchSize: 100,
    flushIntervalMs: 30_000,
    requestTimeoutMs: 10_000,
    maxQueueSize: 5_000,
    maxEventAgeDays: 30,
    maxRetryAttempts: 10,
    flushThreshold: 20,
    shutdownFlushTimeoutMs: 1_500,
};
//# sourceMappingURL=analytics-config.js.map