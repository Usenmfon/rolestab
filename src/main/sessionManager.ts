import { session } from 'electron'

export function createRolePartition(projectId: string, roleProfileId: string): string {
  return `persist:${projectId}-${roleProfileId}`
}

export async function clearRoleSession(partition: string): Promise<void> {
  const roleSession = session.fromPartition(partition)

  await Promise.all([
    roleSession.clearCache(),
    roleSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage'],
    }),
  ])
}
