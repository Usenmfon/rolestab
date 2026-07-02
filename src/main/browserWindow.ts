import electron from 'electron'
import path from 'node:path'

const { BrowserWindow } = electron
const { shell } = electron
const currentDirectory = __dirname

const rendererDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
const rendererIndexPath = path.join(currentDirectory, '../../dist/index.html')
const preloadPath = path.join(currentDirectory, '../preload/index.js')
const appIconPath =
  process.env.NODE_ENV === 'production'
    ? path.join(currentDirectory, '../../dist/favicon.svg')
    : path.join(currentDirectory, '../../public/favicon.svg')

type AppBrowserWindow = InstanceType<typeof BrowserWindow>

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isExpectedAppUrl(url: string): boolean {
  if (process.env.NODE_ENV === 'production') {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'file:' && path.normalize(parsed.pathname).endsWith(path.normalize('/dist/index.html'))
    } catch {
      return false
    }
  }

  try {
    const parsedUrl = new URL(url)
    const expectedUrl = new URL(rendererDevServerUrl)

    return parsedUrl.origin === expectedUrl.origin
  } catch {
    return false
  }
}

export function createAppWindow(): AppBrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'RolesTab',
    icon: appIconPath,
    backgroundColor: '#f5f7fb',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url)
    }

    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (!isExpectedAppUrl(url)) {
      event.preventDefault()
    }
  })

  if (process.env.NODE_ENV === 'production') {
    void window.loadFile(rendererIndexPath)
  } else {
    void window.loadURL(rendererDevServerUrl)
    window.webContents.openDevTools({ mode: 'detach' })
  }

  return window
}
