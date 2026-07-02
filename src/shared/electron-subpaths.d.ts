declare module 'electron/main' {
  const electron: typeof import('electron')
  export default electron
}

declare module 'electron/renderer' {
  const electron: typeof import('electron')
  export default electron
}

declare module 'electron/common' {
  const electron: typeof import('electron')
  export default electron
}
