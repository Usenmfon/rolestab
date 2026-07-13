import electron from 'electron'
import { rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { logInternalError } from '../errorLogger.js'
import { getRoleSession } from '../sessionManager.js'
import type {
  ExtensionCompatibility,
  ExtensionListResult,
  ExtensionManifest,
  InstalledExtension,
  RoleExtensionRuntimeState,
} from '../../shared/extensions.js'
import { determineExtensionCompatibility } from './extension-compatibility.js'
import { prepareManagedExtensionDirectory } from './extension-installer.js'
import {
  isPathInsideManagedDirectory,
  loadExtensionsState,
  writeExtensionsState,
} from './extension-persistence.js'

const { shell } = electron

const safeIdentifierPattern = /^[\w-]+$/

export class ExtensionManager {
  private runtimeStates = new Map<string, RoleExtensionRuntimeState>()

  async installExtension(sourcePath: string, probePartition?: string): Promise<InstalledExtension> {
    const internalId = `ext-${crypto.randomUUID()}`

    await logExtensionEvent('extension-install-attempt', `Installing unpacked extension from ${sourcePath}.`)

    const prepared = await prepareManagedExtensionDirectory(sourcePath, internalId)
    const now = new Date().toISOString()
    const compatibility = determineExtensionCompatibility(prepared.manifest)
    const installedExtension: InstalledExtension = {
      id: internalId,
      internalId,
      name: prepared.manifest.name,
      version: prepared.manifest.version,
      description: prepared.manifest.description,
      path: prepared.destinationPath,
      manifestVersion: prepared.manifest.manifest_version,
      iconPath: getLargestIconPath(prepared.destinationPath, prepared.manifest),
      permissions: prepared.manifest.permissions ?? [],
      hostPermissions: prepared.manifest.host_permissions ?? [],
      globallyEnabled: true,
      compatibility: compatibility.compatibility,
      compatibilityWarnings: [...prepared.warnings, ...compatibility.warnings],
      installedAt: now,
      updatedAt: now,
      roleSettings: {},
      action: prepared.manifest.action ?? prepared.manifest.browser_action ?? prepared.manifest.page_action,
    }

    if (probePartition && isSafePartition(probePartition)) {
      try {
        const probeSession = getRoleSession(probePartition)
        const loadedExtension = await probeSession.extensions.loadExtension(prepared.destinationPath, {
          allowFileAccess: false,
        })

        installedExtension.id = loadedExtension.id
        installedExtension.name = loadedExtension.name || installedExtension.name
        installedExtension.version = loadedExtension.version || installedExtension.version
        installedExtension.compatibility = mergeCompatibility(installedExtension.compatibility, 'compatible')
        probeSession.extensions.removeExtension(loadedExtension.id)
      } catch (error) {
        installedExtension.installError = getSafeErrorMessage(error)
        installedExtension.compatibility = mergeCompatibility(installedExtension.compatibility, 'partially-supported')
        await logExtensionEvent(
          'extension-install-load-failed',
          `Extension copied but failed initial Electron load: ${installedExtension.installError}`,
        )
      }
    }

    const state = await loadExtensionsState()
    const nextState = {
      ...state,
      extensions: [installedExtension, ...state.extensions.filter((extension) => extension.id !== installedExtension.id)],
    }

    await writeExtensionsState(nextState)
    await logExtensionEvent('extension-install-complete', `Installed extension ${installedExtension.name}.`)

    return installedExtension
  }

  async removeExtension(extensionId: string): Promise<void> {
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
    const state = await loadExtensionsState()
    const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId)

    if (!extension) {
      return
    }

    for (const runtimeState of this.runtimeStates.values()) {
      if (runtimeState.extensionId === extensionId && runtimeState.status === 'loaded') {
        await this.unloadExtensionForRole(extensionId, runtimeState.roleId, extension.path)
      }
    }

    if (!isPathInsideManagedDirectory(extension.path)) {
      throw new Error('Refusing to delete an extension folder outside the managed extensions directory.')
    }

    try {
      await rm(extension.path, { recursive: true, force: true })
    } catch (error) {
      await logExtensionEvent('extension-remove-delete-failed', getSafeErrorMessage(error))
    }

    this.deleteRuntimeStatesForExtension(extensionId)
    await writeExtensionsState({
      ...state,
      extensions: state.extensions.filter((currentExtension) => currentExtension.id !== extensionId),
    })
    await logExtensionEvent('extension-removed', `Removed extension ${extension.name}.`)
  }

  async setGlobalEnabled(extensionId: string, enabled: boolean): Promise<InstalledExtension[]> {
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
    const state = await loadExtensionsState()
    const now = new Date().toISOString()
    const extensions = state.extensions.map((extension) =>
      extension.id === extensionId ? { ...extension, globallyEnabled: enabled, updatedAt: now } : extension,
    )

    if (!enabled) {
      const disabledExtension = state.extensions.find((extension) => extension.id === extensionId)

      for (const runtimeState of this.runtimeStates.values()) {
        if (runtimeState.extensionId === extensionId && runtimeState.status === 'loaded') {
          await this.unloadExtensionForRole(extensionId, runtimeState.roleId, disabledExtension?.path)
        }
      }
    }

    const nextState = await writeExtensionsState({ ...state, extensions })
    await logExtensionEvent(
      'extension-global-toggle',
      `${enabled ? 'Enabled' : 'Disabled'} extension ${extensionId} globally.`,
    )

    return nextState.extensions
  }

  async setRoleEnabled(
    extensionId: string,
    roleId: string,
    partition: string,
    enabled: boolean,
  ): Promise<RoleExtensionRuntimeState> {
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
    assertSafeIdentifier(roleId, 'Invalid role identifier.')

    if (!isSafePartition(partition)) {
      throw new Error('Invalid role session partition.')
    }

    const state = await loadExtensionsState()
    const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId)

    if (!extension) {
      throw new Error('Extension is no longer installed.')
    }

    const now = new Date().toISOString()
    const extensions = state.extensions.map((currentExtension) =>
      currentExtension.id === extensionId
        ? {
            ...currentExtension,
            updatedAt: now,
            roleSettings: {
              ...currentExtension.roleSettings,
              [roleId]: {
                ...currentExtension.roleSettings[roleId],
                enabled,
                allowFileAccess: currentExtension.roleSettings[roleId]?.allowFileAccess ?? false,
              },
            },
          }
        : currentExtension,
    )

    await writeExtensionsState({ ...state, extensions })

    if (enabled) {
      return this.loadExtensionForRole(extensionId, roleId, partition)
    }

    await this.unloadExtensionForRole(extensionId, roleId, extension.path)
    const runtimeState = this.setRuntimeState(extensionId, roleId, {
      extensionId,
      roleId,
      sessionPartition: partition,
      status: 'disabled',
      reloadRequired: true,
    })

    await logExtensionEvent('extension-role-disabled', `Disabled extension ${extensionId} for role ${roleId}.`)
    return runtimeState
  }

  async loadExtensionsForRole(roleId: string, partition: string): Promise<RoleExtensionRuntimeState[]> {
    assertSafeIdentifier(roleId, 'Invalid role identifier.')

    if (!isSafePartition(partition)) {
      throw new Error('Invalid role session partition.')
    }

    const state = await loadExtensionsState()
    const runtimeStates: RoleExtensionRuntimeState[] = []

    await logExtensionEvent('extension-role-load-start', `Loading role extensions for ${roleId} in ${partition}.`)

    for (const extension of state.extensions) {
      const roleSetting = extension.roleSettings[roleId]

      if (!extension.globallyEnabled || !roleSetting?.enabled) {
        runtimeStates.push(
          this.setRuntimeState(extension.id, roleId, {
            extensionId: extension.id,
            roleId,
            sessionPartition: partition,
            status: 'disabled',
          }),
        )
        continue
      }

      runtimeStates.push(await this.loadExtensionForRole(extension.id, roleId, partition))
    }

    return runtimeStates
  }

  async reloadExtensionForRole(
    extensionId: string,
    roleId: string,
    partition: string,
  ): Promise<RoleExtensionRuntimeState> {
    await this.unloadExtensionForRole(extensionId, roleId)
    return this.loadExtensionForRole(extensionId, roleId, partition)
  }

  async getInstalledExtensions(): Promise<ExtensionListResult> {
    const state = await loadExtensionsState()
    const extensions = await Promise.all(
      state.extensions.map(async (extension) => ({
        ...extension,
        installError: (await directoryExists(extension.path))
          ? extension.installError
          : 'Extension folder is missing from the managed extensions directory.',
      })),
    )

    return {
      extensions,
      runtimeStates: [...this.runtimeStates.values()],
    }
  }

  async openExtensionFolder(extensionId: string): Promise<void> {
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
    const state = await loadExtensionsState()
    const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId)

    if (!extension || !isPathInsideManagedDirectory(extension.path)) {
      throw new Error('Extension folder is unavailable.')
    }

    await shell.openPath(extension.path)
  }

  private async loadExtensionForRole(
    extensionId: string,
    roleId: string,
    partition: string,
  ): Promise<RoleExtensionRuntimeState> {
    const state = await loadExtensionsState()
    const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId)

    if (!extension) {
      throw new Error('Extension is no longer installed.')
    }

    const roleSetting = extension.roleSettings[roleId]

    if (!extension.globallyEnabled || !roleSetting?.enabled) {
      return this.setRuntimeState(extensionId, roleId, {
        extensionId,
        roleId,
        sessionPartition: partition,
        status: 'disabled',
      })
    }

    if (!(await directoryExists(extension.path))) {
      return this.setRuntimeState(extensionId, roleId, {
        extensionId,
        roleId,
        sessionPartition: partition,
        status: 'failed',
        error: 'Extension folder is missing.',
      })
    }

    this.setRuntimeState(extensionId, roleId, {
      extensionId,
      roleId,
      sessionPartition: partition,
      status: 'loading',
    })

    try {
      const roleSession = getRoleSession(partition)
      const alreadyLoaded = roleSession.extensions
        .getAllExtensions()
        .find((loadedExtension) => loadedExtension.id === extension.id || loadedExtension.path === extension.path)

      if (!alreadyLoaded) {
        await roleSession.extensions.loadExtension(extension.path, {
          allowFileAccess: roleSetting.allowFileAccess ?? false,
        })
      }

      await logExtensionEvent('extension-role-loaded', `Loaded extension ${extension.id} for ${roleId} in ${partition}.`)

      return this.setRuntimeState(extensionId, roleId, {
        extensionId,
        roleId,
        sessionPartition: partition,
        status: 'loaded',
      })
    } catch (error) {
      const message = getSafeErrorMessage(error)

      await logExtensionEvent('extension-role-load-failed', `${extension.id} for ${roleId}: ${message}`)

      return this.setRuntimeState(extensionId, roleId, {
        extensionId,
        roleId,
        sessionPartition: partition,
        status: 'failed',
        error: message,
      })
    }
  }

  private async unloadExtensionForRole(extensionId: string, roleId: string, extensionPath?: string): Promise<void> {
    for (const partition of getLikelyLoadedPartitions(this.runtimeStates, extensionId, roleId)) {
      try {
            const roleSession = getRoleSession(partition)
            const loadedExtension = roleSession.extensions
              .getAllExtensions()
              .find((extension) => extension.id === extensionId || extension.path === extensionPath)

        if (loadedExtension) {
          roleSession.extensions.removeExtension(loadedExtension.id)
        }
      } catch (error) {
        await logExtensionEvent('extension-role-unload-failed', getSafeErrorMessage(error))
      }
    }
  }

  private setRuntimeState(
    extensionId: string,
    roleId: string,
    runtimeState: RoleExtensionRuntimeState,
  ): RoleExtensionRuntimeState {
    this.runtimeStates.set(`${roleId}:${extensionId}`, runtimeState)
    return runtimeState
  }

  private deleteRuntimeStatesForExtension(extensionId: string): void {
    for (const key of this.runtimeStates.keys()) {
      if (key.endsWith(`:${extensionId}`)) {
        this.runtimeStates.delete(key)
      }
    }
  }
}

function getLargestIconPath(extensionPath: string, manifest: ExtensionManifest): string | undefined {
  const iconEntry = Object.entries(manifest.icons ?? {})
    .map(([size, iconPath]) => ({ size: Number(size), iconPath }))
    .filter((entry) => Number.isFinite(entry.size) && entry.iconPath)
    .sort((first, second) => second.size - first.size)[0]

  return iconEntry ? path.join(extensionPath, iconEntry.iconPath) : undefined
}

function mergeCompatibility(
  currentCompatibility: ExtensionCompatibility,
  loadCompatibility: ExtensionCompatibility,
): ExtensionCompatibility {
  if (currentCompatibility === 'unsupported') {
    return 'unsupported'
  }

  if (currentCompatibility === 'partially-supported') {
    return 'partially-supported'
  }

  return loadCompatibility
}

async function directoryExists(directoryPath: string): Promise<boolean> {
  try {
    const directoryStats = await stat(directoryPath)
    return directoryStats.isDirectory()
  } catch {
    return false
  }
}

function getLikelyLoadedPartitions(
  runtimeStates: Map<string, RoleExtensionRuntimeState>,
  extensionId: string,
  roleId: string,
): string[] {
  const runtimeState = runtimeStates.get(`${roleId}:${extensionId}`)

  if (!runtimeState || runtimeState.status !== 'loaded') {
    return []
  }

  return runtimeState.sessionPartition ? [runtimeState.sessionPartition] : []
}

function assertSafeIdentifier(value: string, message: string): void {
  if (!safeIdentifierPattern.test(value)) {
    throw new Error(message)
  }
}

function isSafePartition(partition: string): boolean {
  return /^persist:[\w-]+-[\w-]+$/.test(partition)
}

function getSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Extension operation failed.'
  return message.split(/\r?\n/)[0]?.slice(0, 240) || 'Extension operation failed.'
}

async function logExtensionEvent(scope: string, message: string): Promise<void> {
  await logInternalError({ scope, message }).catch(() => {
    // Extension logging must never break browsing.
  })
}
