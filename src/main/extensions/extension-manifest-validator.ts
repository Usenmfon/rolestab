import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type {
  ExtensionActionMetadata,
  ExtensionManifest,
  ExtensionValidationResult,
} from '../../shared/extensions.js'
import { determineExtensionCompatibility } from './extension-compatibility.js'

type ManifestRecord = Record<string, unknown>

export async function validateExtensionManifest(extensionDirectory: string): Promise<ExtensionValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const manifestPath = path.join(extensionDirectory, 'manifest.json')

  try {
    const directoryStats = await stat(extensionDirectory)

    if (!directoryStats.isDirectory()) {
      return invalidResult(['Choose a folder that contains an unpacked Chromium extension.'], warnings)
    }

    await access(extensionDirectory)
  } catch {
    return invalidResult(['Extension folder does not exist or is not readable.'], warnings)
  }

  let rawManifest: string

  try {
    rawManifest = await readFile(manifestPath, 'utf8')
  } catch {
    return invalidResult(['manifest.json was not found in the selected folder.'], warnings)
  }

  let parsed: ManifestRecord

  try {
    parsed = JSON.parse(rawManifest) as ManifestRecord
  } catch {
    return invalidResult(['manifest.json is not valid JSON.'], warnings)
  }

  if (typeof parsed.name !== 'string' || parsed.name.trim().length === 0) {
    errors.push('manifest.json must include a non-empty name.')
  }

  if (typeof parsed.version !== 'string' || parsed.version.trim().length === 0) {
    errors.push('manifest.json must include a non-empty version.')
  }

  if (typeof parsed.manifest_version !== 'number') {
    errors.push('manifest.json must include a numeric manifest_version.')
  }

  const manifest = toExtensionManifest(parsed)

  if (manifest.background && typeof manifest.background !== 'object') {
    errors.push('manifest.json background must be an object when provided.')
  }

  const iconErrors = await validateIcons(extensionDirectory, manifest.icons)
  errors.push(...iconErrors)

  const compatibility = determineExtensionCompatibility(manifest)
  warnings.push(...compatibility.warnings)
  errors.push(...compatibility.errors)

  return {
    valid: errors.length === 0,
    manifest: errors.length === 0 ? manifest : undefined,
    warnings,
    errors,
    compatibility: compatibility.compatibility,
  }
}

function invalidResult(errors: string[], warnings: string[]): ExtensionValidationResult {
  return {
    valid: false,
    warnings,
    errors,
    compatibility: 'unsupported',
  }
}

function toExtensionManifest(parsed: ManifestRecord): ExtensionManifest {
  return {
    manifest_version: typeof parsed.manifest_version === 'number' ? parsed.manifest_version : 0,
    name: typeof parsed.name === 'string' ? parsed.name : '',
    version: typeof parsed.version === 'string' ? parsed.version : '',
    description: typeof parsed.description === 'string' ? parsed.description : undefined,
    icons: isStringRecord(parsed.icons) ? parsed.icons : undefined,
    permissions: toStringArray(parsed.permissions),
    host_permissions: toStringArray(parsed.host_permissions),
    optional_permissions: toStringArray(parsed.optional_permissions),
    background: parsed.background,
    action: toActionMetadata(parsed.action),
    browser_action: toActionMetadata(parsed.browser_action),
    page_action: toActionMetadata(parsed.page_action),
  }
}

async function validateIcons(extensionDirectory: string, icons: Record<string, string> | undefined): Promise<string[]> {
  if (!icons) {
    return []
  }

  const errors: string[] = []

  for (const [size, iconPath] of Object.entries(icons)) {
    if (!/^\d+$/.test(size) || !iconPath || path.isAbsolute(iconPath) || iconPath.includes('..')) {
      errors.push(`Icon "${size}" must reference a relative file inside the extension folder.`)
      continue
    }

    const absoluteIconPath = path.resolve(extensionDirectory, iconPath)

    if (!isPathInside(extensionDirectory, absoluteIconPath)) {
      errors.push(`Icon "${size}" points outside the extension folder.`)
      continue
    }

    try {
      const iconStats = await stat(absoluteIconPath)

      if (!iconStats.isFile()) {
        errors.push(`Icon "${size}" does not point to a file.`)
      }
    } catch {
      errors.push(`Icon "${size}" file is missing.`)
    }
  }

  return errors
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.entries(value).every(([key, recordValue]) => typeof key === 'string' && typeof recordValue === 'string')
  )
}

function toActionMetadata(value: unknown): ExtensionActionMetadata | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const record = value as Record<string, unknown>
  const defaultIcon = record.default_icon

  return {
    defaultTitle: typeof record.default_title === 'string' ? record.default_title : undefined,
    defaultPopup: typeof record.default_popup === 'string' ? record.default_popup : undefined,
    defaultIcon:
      typeof defaultIcon === 'string' || isStringRecord(defaultIcon) ? defaultIcon : undefined,
  }
}

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : undefined
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(path.resolve(parentPath), path.resolve(childPath))
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}
