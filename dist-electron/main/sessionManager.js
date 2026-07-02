import { session } from 'electron';
export function createRolePartition(projectId, roleProfileId) {
    return `persist:${projectId}-${roleProfileId}`;
}
export async function clearRoleSession(partition) {
    const roleSession = session.fromPartition(partition);
    await Promise.all([
        roleSession.clearCache(),
        roleSession.clearStorageData({
            storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage'],
        }),
    ]);
}
export async function clearRoleSessions(partitions) {
    const uniquePartitions = [...new Set(partitions.filter((partition) => partition.startsWith('persist:')))];
    await Promise.all(uniquePartitions.map((partition) => clearRoleSession(partition)));
}
//# sourceMappingURL=sessionManager.js.map