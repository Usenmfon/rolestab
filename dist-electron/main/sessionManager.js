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
//# sourceMappingURL=sessionManager.js.map