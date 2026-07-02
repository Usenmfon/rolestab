export type BrowserCommand =
  | { id: number; type: 'back' }
  | { id: number; type: 'forward' }
  | { id: number; type: 'reload' }
  | { id: number; type: 'stop' }
  | { id: number; type: 'home'; url: string }
  | { id: number; type: 'navigate'; url: string }
  | { id: number; type: 'open-devtools' }

export type BrowserCommandInput = BrowserCommand extends infer Command
  ? Command extends BrowserCommand
    ? Omit<Command, 'id'>
    : never
  : never
