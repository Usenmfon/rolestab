"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRolePartition = createRolePartition;
exports.clearRoleSession = clearRoleSession;
exports.clearRoleSessions = clearRoleSessions;
exports.getRoleSessionUsage = getRoleSessionUsage;
exports.getRoleSession = getRoleSession;
exports.getRoleSessionsUsage = getRoleSessionsUsage;
const electron_1 = __importDefault(require("electron"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const { session } = electron_1.default;
function createRolePartition(projectId, roleProfileId) {
    const partition = `persist:${projectId}-${roleProfileId}`;
    getRoleSession(partition);
    return partition;
}
async function clearRoleSession(partition) {
    const roleSession = getRoleSession(partition);
    await Promise.all([
        roleSession.clearCache(),
        roleSession.clearAuthCache(),
        roleSession.clearHostResolverCache(),
        roleSession.clearStorageData({
            storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage', 'serviceworkers'],
        }),
    ]);
}
async function clearRoleSessions(partitions) {
    const uniquePartitions = [...new Set(partitions.filter((partition) => partition.startsWith('persist:')))];
    await Promise.all(uniquePartitions.map((partition) => clearRoleSession(partition)));
}
async function getRoleSessionUsage(partition) {
    const roleSession = getRoleSession(partition);
    const [cacheBytes, storageBytes] = await Promise.all([
        roleSession.getCacheSize(),
        getDirectorySize(roleSession.getStoragePath()),
    ]);
    return {
        partition,
        cacheBytes,
        storageBytes,
        totalBytes: Math.max(cacheBytes, storageBytes),
        persistent: roleSession.isPersistent(),
    };
}
function getRoleSession(partition) {
    const roleSession = session.fromPartition(partition);
    roleSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
    });
    roleSession.setPermissionCheckHandler(() => false);
    return roleSession;
}
async function getRoleSessionsUsage(partitions) {
    const uniquePartitions = [...new Set(partitions.filter((partition) => partition.startsWith('persist:')))];
    return Promise.all(uniquePartitions.map((partition) => getRoleSessionUsage(partition)));
}
async function getDirectorySize(directoryPath) {
    if (!directoryPath) {
        return 0;
    }
    try {
        const entries = await (0, promises_1.readdir)(directoryPath, { withFileTypes: true });
        const sizes = await Promise.all(entries.map(async (entry) => {
            const entryPath = node_path_1.default.join(directoryPath, entry.name);
            if (entry.isDirectory()) {
                return getDirectorySize(entryPath);
            }
            if (!entry.isFile()) {
                return 0;
            }
            const fileStats = await (0, promises_1.stat)(entryPath);
            return fileStats.size;
        }));
        return sizes.reduce((total, size) => total + size, 0);
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=sessionManager.js.map