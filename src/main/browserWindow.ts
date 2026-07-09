import electron from 'electron'
import path from 'node:path'

const { app, BrowserWindow } = electron
const { shell } = electron
const currentDirectory = __dirname

const rendererDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5174'
const rendererIndexPath = path.join(currentDirectory, '../../dist/index.html')
const preloadPath = path.join(currentDirectory, '../preload/index.js')
const appIconPath =
  app.isPackaged
    ? path.join(currentDirectory, '../../dist/favicon.ico')
    : path.join(currentDirectory, '../../public/favicon.ico')

type AppBrowserWindow = InstanceType<typeof BrowserWindow>

type TitleBarTheme = 'light' | 'dark'

const titleBarThemes: Record<TitleBarTheme, { color: string; symbolColor: string }> = {
  light: {
    color: '#e8eaed',
    symbolColor: '#334155',
  },
  dark: {
    color: '#111827',
    symbolColor: '#e2e8f0',
  },
}

export function applyTitleBarTheme(window: AppBrowserWindow, theme: TitleBarTheme): void {
  window.setTitleBarOverlay({
    ...titleBarThemes[theme],
    height: 40,
  })
  window.setBackgroundColor(theme === 'dark' ? '#0f172a' : '#f5f7fb')
}

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isExpectedAppUrl(url: string): boolean {
  if (app.isPackaged) {
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
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      ...titleBarThemes.light,
      height: 40,
    },
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
  window.setMenuBarVisibility(false)

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

  if (app.isPackaged) {
    void window.loadFile(rendererIndexPath)
  } else {
    void window.loadURL(rendererDevServerUrl)
    window.webContents.openDevTools({ mode: 'detach' })
  }

  return window
}
