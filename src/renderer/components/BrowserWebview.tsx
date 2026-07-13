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
  reloadIgnoringCache?: () => void
  stop?: () => void
  loadURL?: (url: string) => void
  openDevTools?: () => void
  inspectElement?: (x: number, y: number) => void
}

type PageTitleEvent = Event & {
  title?: string
}

type NavigationEvent = Event & {
  url?: string
}

type WindowOpenEvent = Event & {
  url?: string
}

type FaviconEvent = Event & {
  favicons?: string[]
}

type FailLoadEvent = Event & {
  errorCode?: number
  errorDescription?: string
  validatedURL?: string
  isMainFrame?: boolean
}

type ConsoleMessageEvent = Event & {
  level?: number
  message?: string
  line?: number
  sourceId?: string
}

type ContextMenuEvent = Event & {
  params?: {
    x: number
    y: number
  }
}

type RenderProcessGoneEvent = Event & {
  details?: {
    reason?: string
    exitCode?: number
  }
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
  const [browserUserAgent] = useState(getBrowserUserAgent)
  const [domReady, setDomReady] = useState(false)
  const lastCommandIdRef = useRef<number | null>(null)
  const lastInspectPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const webview = webviewRef.current

    if (!webview) {
      return undefined
    }

    const webviewElement = webview

    function updateFromWebview() {
      if (!domReady) {
        return
      }

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
      onUpdate(tab.id, { loading: true, loadError: undefined, loadErrorDetails: undefined })
    }

    function handleDomReady() {
      setDomReady(true)
      updateFromWebview()
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
        onUpdate(tab.id, { url, loadError: undefined, loadErrorDetails: undefined })
      }
    }

    function handleWillNavigate(event: Event) {
      const navigationEvent = event as NavigationEvent
      const url = navigationEvent.url

      if (!url || isSafeWebUrl(url)) {
        return
      }

      event.preventDefault()
      onUpdate(tab.id, {
        loading: false,
        loadError: 'Blocked unsafe navigation. Only http and https URLs are allowed.',
        loadErrorDetails: url,
      })
    }

    function handleWindowOpen(event: Event) {
      const windowEvent = event as WindowOpenEvent

      event.preventDefault()

      onUpdate(tab.id, {
        loadError: windowEvent.url
          ? `Blocked pop-up window: ${windowEvent.url}`
          : 'Blocked pop-up window.',
        loadErrorDetails: windowEvent.url,
      })
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
        loadError: getFriendlyLoadError(loadEvent.errorDescription),
        loadErrorDetails: getLoadErrorDetails(loadEvent),
        ...(loadEvent.validatedURL ? { url: loadEvent.validatedURL } : {}),
      })
    }

    function handleConsoleMessage(event: Event) {
      const consoleEvent = event as ConsoleMessageEvent

      if (
        consoleEvent.level !== 3 ||
        !consoleEvent.message ||
        shouldIgnorePageConsoleError(consoleEvent.message)
      ) {
        return
      }

      const location = consoleEvent.sourceId
        ? ` (${consoleEvent.sourceId}${consoleEvent.line ? `:${consoleEvent.line}` : ''})`
        : ''
      const nextError = `${consoleEvent.message}${location}`

      onUpdate(tab.id, {
        consoleErrors: [nextError, ...(tab.consoleErrors ?? [])].slice(0, 5),
      })
    }

    function handleContextMenu(event: Event) {
      const contextEvent = event as ContextMenuEvent

      if (contextEvent.params) {
        lastInspectPointRef.current = {
          x: contextEvent.params.x,
          y: contextEvent.params.y,
        }
      }
    }

    function handleRenderProcessGone(event: Event) {
      const goneEvent = event as RenderProcessGoneEvent
      const reason = goneEvent.details?.reason ?? 'unknown'
      const exitCode = goneEvent.details?.exitCode

      onUpdate(tab.id, {
        loading: false,
        loadError: 'The page renderer stopped unexpectedly.',
        loadErrorDetails: `Reason: ${reason}${typeof exitCode === 'number' ? `, exit code: ${exitCode}` : ''}`,
      })
    }

    webviewElement.addEventListener('dom-ready', handleDomReady)
    webviewElement.addEventListener('did-start-loading', handleStartLoading)
    webviewElement.addEventListener('did-stop-loading', handleStopLoading)
    webviewElement.addEventListener('page-title-updated', handleTitle)
    webviewElement.addEventListener('did-navigate', handleNavigation)
    webviewElement.addEventListener('did-navigate-in-page', handleNavigation)
    webviewElement.addEventListener('will-navigate', handleWillNavigate)
    webviewElement.addEventListener('new-window', handleWindowOpen)
    webviewElement.addEventListener('page-favicon-updated', handleFavicon)
    webviewElement.addEventListener('did-fail-load', handleFailLoad)
    webviewElement.addEventListener('console-message', handleConsoleMessage)
    webviewElement.addEventListener('context-menu', handleContextMenu)
    webviewElement.addEventListener('render-process-gone', handleRenderProcessGone)

    return () => {
      webviewElement.removeEventListener('dom-ready', handleDomReady)
      webviewElement.removeEventListener('did-start-loading', handleStartLoading)
      webviewElement.removeEventListener('did-stop-loading', handleStopLoading)
      webviewElement.removeEventListener('page-title-updated', handleTitle)
      webviewElement.removeEventListener('did-navigate', handleNavigation)
      webviewElement.removeEventListener('did-navigate-in-page', handleNavigation)
      webviewElement.removeEventListener('will-navigate', handleWillNavigate)
      webviewElement.removeEventListener('new-window', handleWindowOpen)
      webviewElement.removeEventListener('page-favicon-updated', handleFavicon)
      webviewElement.removeEventListener('did-fail-load', handleFailLoad)
      webviewElement.removeEventListener('console-message', handleConsoleMessage)
      webviewElement.removeEventListener('context-menu', handleContextMenu)
      webviewElement.removeEventListener('render-process-gone', handleRenderProcessGone)
    }
  }, [domReady, onUpdate, tab.consoleErrors, tab.id])

  useEffect(() => {
    const webview = webviewRef.current

    if (!active || !command || !webview || !domReady || lastCommandIdRef.current === command.id) {
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
      case 'hard-reload':
        webview.reloadIgnoringCache?.()
        break
      case 'stop':
        webview.stop?.()
        onUpdate(tab.id, { loading: false })
        break
      case 'home':
      case 'navigate':
        if (isSafeWebUrl(command.url)) {
          webview.loadURL?.(command.url)
          onUpdate(tab.id, {
            url: command.url,
            loading: true,
            loadError: undefined,
            loadErrorDetails: undefined,
          })
        } else {
          onUpdate(tab.id, {
            loading: false,
            loadError: 'Blocked unsafe navigation. Only http and https URLs are allowed.',
            loadErrorDetails: command.url,
          })
        }
        break
      case 'open-devtools':
        webview.openDevTools?.()
        break
      case 'inspect-element': {
        const point = lastInspectPointRef.current ?? getWebviewCenterPoint(webview)
        webview.inspectElement?.(point.x, point.y)
        break
      }
    }
  }, [active, command, domReady, onUpdate, tab.id])

  useEffect(() => {
    const webview = webviewRef.current

    if (!active || !domReady || !webview) {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      if (!isEditableHostElement(document.activeElement)) {
        webview.focus()
      }
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [active, domReady])

  return (
    <webview
      ref={webviewRef}
      src={initialUrl}
      partition={tab.sessionPartition}
      useragent={browserUserAgent}
      webpreferences="contextIsolation=yes,nodeIntegration=no,sandbox=yes,webSecurity=yes,allowRunningInsecureContent=no"
      className={`roles-tab-webview ${active ? 'block' : 'hidden'}`}
    />
  )
}

function isEditableHostElement(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  )
}

function getWebviewCenterPoint(webview: HTMLElement): { x: number; y: number } {
  const bounds = webview.getBoundingClientRect()

  return {
    x: Math.floor(bounds.width / 2),
    y: Math.floor(bounds.height / 2),
  }
}

function getBrowserUserAgent(): string {
  const chromeVersion = window.rolesTab?.app.versions.chrome ?? '120.0.0.0'

  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
}

function getFriendlyLoadError(errorDescription: string | undefined): string {
  if (!errorDescription) {
    return 'Page failed to load.'
  }

  if (errorDescription.includes('ERR_CONNECTION_REFUSED')) {
    return 'Connection refused. Check that the local app is running.'
  }

  if (errorDescription.includes('ERR_INTERNET_DISCONNECTED')) {
    return 'Network is unavailable.'
  }

  if (errorDescription.includes('ERR_CONNECTION_TIMED_OUT')) {
    return 'Connection timed out. The host resolved, but this machine could not reach it before Chromium gave up.'
  }

  if (errorDescription.includes('ERR_NAME_NOT_RESOLVED')) {
    return 'Host could not be resolved.'
  }

  return errorDescription
}

function getLoadErrorDetails(loadEvent: FailLoadEvent): string {
  const details = [
    loadEvent.validatedURL ? `URL: ${loadEvent.validatedURL}` : null,
    typeof loadEvent.errorCode === 'number' ? `Error code: ${loadEvent.errorCode}` : null,
    loadEvent.errorDescription ? `Description: ${loadEvent.errorDescription}` : null,
    typeof loadEvent.isMainFrame === 'boolean' ? `Main frame: ${loadEvent.isMainFrame ? 'yes' : 'no'}` : null,
  ].filter(Boolean)

  return details.join(' | ')
}

function isSafeWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function shouldIgnorePageConsoleError(message: string): boolean {
  return [
    "Hydration failed because the server rendered text didn't match the client",
    "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties",
  ].some((ignoredMessage) => message.includes(ignoredMessage))
}
