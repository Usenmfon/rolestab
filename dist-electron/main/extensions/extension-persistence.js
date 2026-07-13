"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagedExtensionsDirectory = getManagedExtensionsDirectory;
exports.getExtensionsStatePath = getExtensionsStatePath;
exports.loadExtensionsState = loadExtensionsState;
exports.writeExtensionsState = writeExtensionsState;
exports.sanitizeExtensionsState = sanitizeExtensionsState;
exports.isPathInsideManagedDirectory = isPathInsideManagedDirectory;
const electron_1 = __importDefault(require("electron"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const { app } = electron_1.default;
const extensionsSchemaVersion = 1;
const defaultExtensionsState = {
    schemaVersion: extensionsSchemaVersion,
    extensions: [],
};
let extensionsWriteQueue = Promise.resolve(defaultExtensionsState);
function getManagedExtensionsDirectory() {
    return node_path_1.default.join(app.getPath('userData'), 'extensions');
}
function getExtensionsStatePath() {
    return node_path_1.default.join(app.getPath('userData'), 'extensions.json');
}
async function loadExtensionsState() {
    try {
        const raw = await (0, promises_1.readFile)(getExtensionsStatePath(), 'utf8');
        const parsed = JSON.parse(raw);
        const state = sanitizeExtensionsState(parsed);
        if (raw.trim() !== JSON.stringify(state, null, 2)) {
            void writeExtensionsState(state);
        }
        return state;
    }
    catch (error) {
        const code = error.code;
        if (code === 'ENOENT' || error instanceof SyntaxError) {
            return defaultExtensionsState;
        }
        throw error;
    }
}
async function writeExtensionsState(state) {
    const nextState = sanitizeExtensionsState(state);
    const filePath = getExtensionsStatePath();
    const temporaryPath = `${filePath}.tmp`;
    extensionsWriteQueue = extensionsWriteQueue
        .catch(() => defaultExtensionsState)
        .then(async () => {
        await (0, promises_1.mkdir)(node_path_1.default.dirname(filePath), { recursive: true });
        await (0, promises_1.writeFile)(temporaryPath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
        await (0, promises_1.rename)(temporaryPath, filePath);
        return nextState;
    });
    return extensionsWriteQueue;
}
function sanitizeExtensionsState(data) {
    const extensions = Array.isArray(data.extensions) ? data.extensions.filter(isValidInstalledExtension) : [];
    return {
        schemaVersion: extensionsSchemaVersion,
        extensions,
    };
}
function isValidInstalledExtension(extension) {
    return (typeof extension.id === 'string' &&
        extension.id.length > 0 &&
        typeof extension.internalId === 'string' &&
        extension.internalId.length > 0 &&
        typeof extension.name === 'string' &&
        extension.name.trim().length > 0 &&
        typeof extension.version === 'string' &&
        extension.version.trim().length > 0 &&
        typeof extension.path === 'string' &&
        isPathInsideManagedDirectory(extension.path) &&
        typeof extension.globallyEnabled === 'boolean' &&
        typeof extension.installedAt === 'string' &&
        typeof extension.updatedAt === 'string' &&
        isValidRoleSettings(extension.roleSettings));
}
function isValidRoleSettings(roleSettings) {
    return (typeof roleSettings === 'object' &&
        roleSettings !== null &&
        Object.values(roleSettings).every((setting) => typeof setting === 'object' &&
            setting !== null &&
            typeof setting.enabled === 'boolean' &&
            (setting.allowFileAccess === undefined || typeof setting.allowFileAccess === 'boolean') &&
            (setting.incognitoEnabled === undefined || typeof setting.incognitoEnabled === 'boolean')));
}
function isPathInsideManagedDirectory(candidatePath) {
    const managedDirectory = node_path_1.default.resolve(getManagedExtensionsDirectory());
    const resolvedCandidate = node_path_1.default.resolve(candidatePath);
    const relativePath = node_path_1.default.relative(managedDirectory, resolvedCandidate);
    return Boolean(relativePath) && !relativePath.startsWith('..') && !node_path_1.default.isAbsolute(relativePath);
}
//# sourceMappingURL=extension-persistence.js.map