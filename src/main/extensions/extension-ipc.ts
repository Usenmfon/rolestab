import electron from 'electron'
import type { ExtensionInstallResult } from '../../shared/extensions.js'
import { loadWorkspace } from '../workspaceStore.js'
import { validateExtensionManifest } from './extension-manifest-validator.js'
import { ExtensionManager } from './extension-manager.js'

const { dialog, ipcMain } = electron

type IpcEvent = Electron.IpcMainInvokeEvent
type AppBrowserWindow = Electron.BrowserWindow

type TrustedSenderAssertion = (event: IpcEvent) => void

const safeIdentifierPattern = /^[\w-]+$/

export function registerExtensionIpcHandlers(options: {
  extensionManager: ExtensionManager
  getMainWindow: () => AppBrowserWindow | null
  assertTrustedSender: TrustedSenderAssertion
}): void {
  const { extensionManager, getMainWindow, assertTrustedSender } = options

  ipcMain.handle('extensions:list', async (event) => {
    assertTrustedSender(event)
    return extensionManager.getInstalledExtensions()
  })

  ipcMain.handle('extensions:install', async (event): Promise<ExtensionInstallResult> => {
    assertTrustedSender(event)

    const openOptions: Electron.OpenDialogOptions = {
      title: 'Install Unpacked Extension',
      properties: ['openDirectory'],
    }
    const mainWindow = getMainWindow()
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, openOptions)
      : await dialog.showOpenDialog(openOptions)
    const sourcePath = result.filePaths[0]

    if (result.canceled || !sourcePath) {
      return { canceled: true }
    }

    const validation = await validateExtensionManifest(sourcePath)

    if (!validation.valid) {
      return {
        canceled: false,
        validation,
      }
    }

    const workspace = await loadWorkspace()
    const probePartition = workspace.roleProfiles.find((roleProfile) => roleProfile.sessionPartition)?.sessionPartition
    const extension = await extensionManager.installExtension(sourcePath, probePartition)

    return {
      canceled: false,
      extension,
      validation,
    }
  })

  ipcMain.handle('extensions:remove', async (event, extensionId: string) => {
    assertTrustedSender(event)
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
    await extensionManager.removeExtension(extensionId)
  })

  ipcMain.handle('extensions:set-global-enabled', async (event, extensionId: string, enabled: boolean) => {
    assertTrustedSender(event)
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')

    if (typeof enabled !== 'boolean') {
      throw new Error('Global enabled value must be boolean.')
    }

    return extensionManager.setGlobalEnabled(extensionId, enabled)
  })

  ipcMain.handle(
    'extensions:set-role-enabled',
    async (event, extensionId: string, roleId: string, enabled: boolean) => {
      assertTrustedSender(event)
      assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
      assertSafeIdentifier(roleId, 'Invalid role identifier.')

      if (typeof enabled !== 'boolean') {
        throw new Error('Role enabled value must be boolean.')
      }

      const roleProfile = await getRoleProfile(roleId)

      return extensionManager.setRoleEnabled(extensionId, roleId, roleProfile.sessionPartition, enabled)
    },
  )

  ipcMain.handle('extensions:load-for-role', async (event, roleId: string) => {
    assertTrustedSender(event)
    assertSafeIdentifier(roleId, 'Invalid role identifier.')
    const roleProfile = await getRoleProfile(roleId)

    return extensionManager.loadExtensionsForRole(roleId, roleProfile.sessionPartition)
  })

  ipcMain.handle('extensions:reload-for-role', async (event, extensionId: string, roleId: string) => {
    assertTrustedSender(event)
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
    assertSafeIdentifier(roleId, 'Invalid role identifier.')
    const roleProfile = await getRoleProfile(roleId)

    return extensionManager.reloadExtensionForRole(extensionId, roleId, roleProfile.sessionPartition)
  })

  ipcMain.handle('extensions:open-folder', async (event, extensionId: string) => {
    assertTrustedSender(event)
    assertSafeIdentifier(extensionId, 'Invalid extension identifier.')
    await extensionManager.openExtensionFolder(extensionId)
  })
}

async function getRoleProfile(roleId: string) {
  const workspace = await loadWorkspace()
  const roleProfile = workspace.roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === roleId)

  if (!roleProfile) {
    throw new Error('Role profile is no longer available.')
  }

  return roleProfile
}

function assertSafeIdentifier(value: string, message: string): void {
  if (typeof value !== 'string' || !safeIdentifierPattern.test(value)) {
    throw new Error(message)
  }
}
