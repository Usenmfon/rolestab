import electron from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ExtensionsState, InstalledExtension, RoleExtensionSetting } from '../../shared/extensions.js'

const { app } = electron

const extensionsSchemaVersion = 1

const defaultExtensionsState: ExtensionsState = {
  schemaVersion: extensionsSchemaVersion,
  extensions: [],
}

let extensionsWriteQueue = Promise.resolve<ExtensionsState>(defaultExtensionsState)

export function getManagedExtensionsDirectory(): string {
  return path.join(app.getPath('userData'), 'extensions')
}

export function getExtensionsStatePath(): string {
  return path.join(app.getPath('userData'), 'extensions.json')
}

export async function loadExtensionsState(): Promise<ExtensionsState> {
  try {
    const raw = await readFile(getExtensionsStatePath(), 'utf8')
    const parsed = JSON.parse(raw) as ExtensionsState
    const state = sanitizeExtensionsState(parsed)

    if (raw.trim() !== JSON.stringify(state, null, 2)) {
      void writeExtensionsState(state)
    }

    return state
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code === 'ENOENT' || error instanceof SyntaxError) {
      return defaultExtensionsState
    }

    throw error
  }
}

export async function writeExtensionsState(state: ExtensionsState): Promise<ExtensionsState> {
  const nextState = sanitizeExtensionsState(state)
  const filePath = getExtensionsStatePath()
  const temporaryPath = `${filePath}.tmp`

  extensionsWriteQueue = extensionsWriteQueue
    .catch(() => defaultExtensionsState)
    .then(async () => {
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(temporaryPath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8')
      await rename(temporaryPath, filePath)

      return nextState
    })

  return extensionsWriteQueue
}

export function sanitizeExtensionsState(data: ExtensionsState): ExtensionsState {
  const extensions = Array.isArray(data.extensions) ? data.extensions.filter(isValidInstalledExtension) : []

  return {
    schemaVersion: extensionsSchemaVersion,
    extensions,
  }
}

function isValidInstalledExtension(extension: InstalledExtension): boolean {
  return (
    typeof extension.id === 'string' &&
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
    isValidRoleSettings(extension.roleSettings)
  )
}

function isValidRoleSettings(roleSettings: Record<string, RoleExtensionSetting>): boolean {
  return (
    typeof roleSettings === 'object' &&
    roleSettings !== null &&
    Object.values(roleSettings).every(
      (setting) =>
        typeof setting === 'object' &&
        setting !== null &&
        typeof setting.enabled === 'boolean' &&
        (setting.allowFileAccess === undefined || typeof setting.allowFileAccess === 'boolean') &&
        (setting.incognitoEnabled === undefined || typeof setting.incognitoEnabled === 'boolean'),
    )
  )
}

export function isPathInsideManagedDirectory(candidatePath: string): boolean {
  const managedDirectory = path.resolve(getManagedExtensionsDirectory())
  const resolvedCandidate = path.resolve(candidatePath)
  const relativePath = path.relative(managedDirectory, resolvedCandidate)

  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}
