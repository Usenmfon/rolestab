"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInternalError = logInternalError;
const electron_1 = __importDefault(require("electron"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const { app } = electron_1.default;
async function logInternalError(entry) {
    const logDirectory = node_path_1.default.join(app.getPath('userData'), 'logs');
    const logPath = node_path_1.default.join(logDirectory, 'roles-tab.log');
    const safeEntry = {
        createdAt: entry.createdAt ?? new Date().toISOString(),
        scope: entry.scope,
        message: entry.message,
        stack: entry.stack,
        details: entry.details,
    };
    await (0, promises_1.mkdir)(logDirectory, { recursive: true });
    await (0, promises_1.appendFile)(logPath, `${JSON.stringify(safeEntry)}\n`, 'utf8');
}
//# sourceMappingURL=errorLogger.js.map