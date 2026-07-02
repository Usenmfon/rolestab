import electron from 'electron'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import type { SessionUsage } from '../shared/session.js'

const { session } = electron

export function createRolePartition(projectId: string, roleProfileId: string): string {
  return `persist:${projectId}-${roleProfileId}`
}

export async function clearRoleSession(partition: string): Promise<void> {
  const roleSession = session.fromPartition(partition)

  await Promise.all([
    roleSession.clearCache(),
    roleSession.clearAuthCache(),
    roleSession.clearHostResolverCache(),
    roleSession.clearStorageData({
      storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage', 'serviceworkers'],
    }),
  ])
}

export async function clearRoleSessions(partitions: string[]): Promise<void> {
  const uniquePartitions = [...new Set(partitions.filter((partition) => partition.startsWith('persist:')))]

  await Promise.all(uniquePartitions.map((partition) => clearRoleSession(partition)))
}

export async function getRoleSessionUsage(partition: string): Promise<SessionUsage> {
  const roleSession = session.fromPartition(partition)
  const [cacheBytes, storageBytes] = await Promise.all([
    roleSession.getCacheSize(),
    getDirectorySize(roleSession.getStoragePath()),
  ])

  return {
    partition,
    cacheBytes,
    storageBytes,
    totalBytes: Math.max(cacheBytes, storageBytes),
    persistent: roleSession.isPersistent(),
  }
}

export async function getRoleSessionsUsage(partitions: string[]): Promise<SessionUsage[]> {
  const uniquePartitions = [...new Set(partitions.filter((partition) => partition.startsWith('persist:')))]

  return Promise.all(uniquePartitions.map((partition) => getRoleSessionUsage(partition)))
}

async function getDirectorySize(directoryPath: string | null): Promise<number> {
  if (!directoryPath) {
    return 0
  }

  try {
    const entries = await readdir(directoryPath, { withFileTypes: true })
    const sizes = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directoryPath, entry.name)

        if (entry.isDirectory()) {
          return getDirectorySize(entryPath)
        }

        if (!entry.isFile()) {
          return 0
        }

        const fileStats = await stat(entryPath)
        return fileStats.size
      }),
    )

    return sizes.reduce((total, size) => total + size, 0)
  } catch {
    return 0
  }
}
