"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRolePartition = createRolePartition;
exports.clearRoleSession = clearRoleSession;
exports.clearRoleSessions = clearRoleSessions;
const electron_1 = __importDefault(require("electron"));
const { session } = electron_1.default;
function createRolePartition(projectId, roleProfileId) {
    return `persist:${projectId}-${roleProfileId}`;
}
async function clearRoleSession(partition) {
    const roleSession = session.fromPartition(partition);
    await Promise.all([
        roleSession.clearCache(),
        roleSession.clearStorageData({
            storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage'],
        }),
    ]);
}
async function clearRoleSessions(partitions) {
    const uniquePartitions = [...new Set(partitions.filter((partition) => partition.startsWith('persist:')))];
    await Promise.all(uniquePartitions.map((partition) => clearRoleSession(partition)));
}
//# sourceMappingURL=sessionManager.js.map