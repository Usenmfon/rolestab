import electron from 'electron'
import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const { app } = electron

type ErrorLogEntry = {
  scope: string
  message: string
  stack?: string
  details?: string
  createdAt?: string
}

export async function logInternalError(entry: ErrorLogEntry): Promise<void> {
  const logDirectory = path.join(app.getPath('userData'), 'logs')
  const logPath = path.join(logDirectory, 'roles-tab.log')
  const safeEntry = {
    createdAt: entry.createdAt ?? new Date().toISOString(),
    scope: entry.scope,
    message: entry.message,
    stack: entry.stack,
    details: entry.details,
  }

  await mkdir(logDirectory, { recursive: true })
  await appendFile(logPath, `${JSON.stringify(safeEntry)}\n`, 'utf8')
}
