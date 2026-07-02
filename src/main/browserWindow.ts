import electron from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { BrowserWindow, shell } = electron
const currentFile = fileURLToPath(import.meta.url)
const currentDirectory = path.dirname(currentFile)

const rendererDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
const rendererIndexPath = path.join(currentDirectory, '../../dist/index.html')
const preloadPath = path.join(currentDirectory, '../preload/index.js')

type AppBrowserWindow = InstanceType<typeof BrowserWindow>

export function createAppWindow(): AppBrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'RolesTab',
    backgroundColor: '#f5f7fb',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.NODE_ENV === 'production') {
    void window.loadFile(rendererIndexPath)
  } else {
    void window.loadURL(rendererDevServerUrl)
    window.webContents.openDevTools({ mode: 'detach' })
  }

  return window
}
