import { useEffect, useRef, useState } from 'react'
import type { BrowserCommand } from '../../shared/browser'
import type { BrowserTab } from '../../shared/workspace'

type WebviewDomElement = HTMLElement & {
  getTitle?: () => string
  getURL?: () => string
  canGoBack?: () => boolean
  canGoForward?: () => boolean
  goBack?: () => void
  goForward?: () => void
  reload?: () => void
  stop?: () => void
  loadURL?: (url: string) => void
  openDevTools?: () => void
}

type PageTitleEvent = Event & {
  title?: string
}

type NavigationEvent = Event & {
  url?: string
}

type FaviconEvent = Event & {
  favicons?: string[]
}

type FailLoadEvent = Event & {
  errorCode?: number
  errorDescription?: string
  validatedURL?: string
}

type BrowserWebviewProps = {
  tab: BrowserTab
  active: boolean
  command: BrowserCommand | null
  onUpdate: (tabId: string, updates: Partial<BrowserTab>) => void
}

export function BrowserWebview({ tab, active, command, onUpdate }: BrowserWebviewProps) {
  const webviewRef = useRef<WebviewDomElement | null>(null)
  const [initialUrl] = useState(tab.url)
  const lastCommandIdRef = useRef<number | null>(null)

  useEffect(() => {
    const webview = webviewRef.current

    if (!webview) {
      return undefined
    }

    const webviewElement = webview

    function updateFromWebview() {
      const title = webviewElement.getTitle?.()
      const url = webviewElement.getURL?.()

      onUpdate(tab.id, {
        ...(title ? { title } : {}),
        ...(url ? { url } : {}),
        canGoBack: webviewElement.canGoBack?.() ?? false,
        canGoForward: webviewElement.canGoForward?.() ?? false,
      })
    }

    function handleStartLoading() {
      onUpdate(tab.id, { loading: true, loadError: undefined })
    }

    function handleStopLoading() {
      onUpdate(tab.id, { loading: false })
      updateFromWebview()
    }

    function handleTitle(event: Event) {
      const title = (event as PageTitleEvent).title

      if (title) {
        onUpdate(tab.id, { title })
      }
    }

    function handleNavigation(event: Event) {
      const url = (event as NavigationEvent).url ?? webviewElement.getURL?.()

      if (url) {
        onUpdate(tab.id, { url, loadError: undefined })
      }
    }

    function handleFavicon(event: Event) {
      const favicons = (event as FaviconEvent).favicons
      const faviconUrl = favicons?.[0]

      if (faviconUrl) {
        onUpdate(tab.id, { faviconUrl })
      }
    }

    function handleFailLoad(event: Event) {
      const loadEvent = event as FailLoadEvent

      if (loadEvent.errorCode === -3) {
        return
      }

      onUpdate(tab.id, {
        loading: false,
        loadError: loadEvent.errorDescription ?? 'Page failed to load.',
        ...(loadEvent.validatedURL ? { url: loadEvent.validatedURL } : {}),
      })
    }

    webviewElement.addEventListener('did-start-loading', handleStartLoading)
    webviewElement.addEventListener('did-stop-loading', handleStopLoading)
    webviewElement.addEventListener('page-title-updated', handleTitle)
    webviewElement.addEventListener('did-navigate', handleNavigation)
    webviewElement.addEventListener('did-navigate-in-page', handleNavigation)
    webviewElement.addEventListener('page-favicon-updated', handleFavicon)
    webviewElement.addEventListener('did-fail-load', handleFailLoad)

    return () => {
      webviewElement.removeEventListener('did-start-loading', handleStartLoading)
      webviewElement.removeEventListener('did-stop-loading', handleStopLoading)
      webviewElement.removeEventListener('page-title-updated', handleTitle)
      webviewElement.removeEventListener('did-navigate', handleNavigation)
      webviewElement.removeEventListener('did-navigate-in-page', handleNavigation)
      webviewElement.removeEventListener('page-favicon-updated', handleFavicon)
      webviewElement.removeEventListener('did-fail-load', handleFailLoad)
    }
  }, [onUpdate, tab.id])

  useEffect(() => {
    const webview = webviewRef.current

    if (!active || !command || !webview || lastCommandIdRef.current === command.id) {
      return
    }

    lastCommandIdRef.current = command.id

    switch (command.type) {
      case 'back':
        if (webview.canGoBack?.()) {
          webview.goBack?.()
        }
        break
      case 'forward':
        if (webview.canGoForward?.()) {
          webview.goForward?.()
        }
        break
      case 'reload':
        webview.reload?.()
        break
      case 'stop':
        webview.stop?.()
        onUpdate(tab.id, { loading: false })
        break
      case 'home':
      case 'navigate':
        webview.loadURL?.(command.url)
        onUpdate(tab.id, { url: command.url, loading: true, loadError: undefined })
        break
      case 'open-devtools':
        webview.openDevTools?.()
        break
    }
  }, [active, command, onUpdate, tab.id])

  return (
    <webview
      ref={webviewRef}
      src={initialUrl}
      partition={tab.sessionPartition}
      webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes"
      className={`h-full w-full ${active ? 'block' : 'hidden'}`}
    />
  )
}
