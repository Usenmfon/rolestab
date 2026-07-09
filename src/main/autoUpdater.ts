import electron from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log/main'
import { logInternalError } from './errorLogger.js'
import { updateStatusChannel, type UpdateStatus } from '../shared/update.js'

const { app } = electron

type AppBrowserWindow = InstanceType<typeof electron.BrowserWindow>

let currentStatus: UpdateStatus = { state: 'idle' }
let statusWindow: AppBrowserWindow | null = null
let listenersBound = false

function getUpdateErrorMessage(error: Error): string {
  const message = error.message.trim()

  if (/504|gateway time-?out/i.test(message)) {
    return 'GitHub is temporarily unavailable. Please try again in a few minutes.'
  }

  if (/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|network|timeout/i.test(message)) {
    return 'Unable to reach GitHub. Check your internet connection and try again.'
  }

  return message.split(/\r?\n/)[0] || 'Unable to check for updates.'
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus
}

function setStatus(status: UpdateStatus): void {
  currentStatus = status

  if (statusWindow && !statusWindow.isDestroyed()) {
    statusWindow.webContents.send(updateStatusChannel, status)
  }
}

function updatesSupported(): { supported: boolean; reason: string } {
  if (!app.isPackaged) {
    return { supported: false, reason: 'Updates are only available in the installed app.' }
  }

  if (process.platform === 'darwin') {
    return { supported: false, reason: 'Automatic updates are not yet available on macOS.' }
  }

  return { supported: true, reason: '' }
}

function bindListeners(): void {
  if (listenersBound) {
    return
  }

  listenersBound = true
  log.transports.file.level = 'info'
  autoUpdater.logger = log
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => setStatus({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', (info) => setStatus({ state: 'not-available', version: info.version }))
  autoUpdater.on('download-progress', (progress) =>
    setStatus({ state: 'downloading', percent: Math.round(progress.percent) }),
  )
  autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (error) => {
    setStatus({ state: 'error', message: getUpdateErrorMessage(error) })
    void logInternalError({ scope: 'auto-updater', message: error.message, stack: error.stack })
  })
}

/**
 * Wire the window that should receive status updates and kick off a background
 * check on launch. Silent on platforms/builds where updates are unsupported.
 */
export function initAutoUpdater(window: AppBrowserWindow): void {
  statusWindow = window

  const support = updatesSupported()
  if (!support.supported) {
    setStatus({ state: 'unsupported', reason: support.reason })
    return
  }

  bindListeners()
  void autoUpdater.checkForUpdates().catch(() => {
    // Failures are surfaced through the 'error' event handler.
  })
}

/** Triggered by the renderer's "Check for updates" button. */
export async function checkForUpdates(): Promise<UpdateStatus> {
  const support = updatesSupported()
  if (!support.supported) {
    setStatus({ state: 'unsupported', reason: support.reason })
    return currentStatus
  }

  bindListeners()
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // Failures are surfaced through the 'error' event handler.
  }

  return currentStatus
}

export function quitAndInstall(): void {
  if (currentStatus.state !== 'downloaded') {
    return
  }

  autoUpdater.quitAndInstall()
}
