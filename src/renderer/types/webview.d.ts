import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type WebviewElementAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string
  partition?: string
  useragent?: string
  webpreferences?: string
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: WebviewElementAttributes
    }
  }
}
