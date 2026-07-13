export type ExtensionCompatibility = 'compatible' | 'partially-supported' | 'unsupported' | 'unknown'

export type ExtensionRuntimeStatus = 'loaded' | 'disabled' | 'failed' | 'loading' | 'reload-required'

export type RoleExtensionSetting = {
  enabled: boolean
  allowFileAccess?: boolean
  incognitoEnabled?: boolean
}

export type RoleExtensionRuntimeState = {
  extensionId: string
  roleId: string
  status: ExtensionRuntimeStatus
  sessionPartition?: string
  error?: string
  reloadRequired?: boolean
}

export type ExtensionActionMetadata = {
  defaultTitle?: string
  defaultIcon?: Record<string, string> | string
  defaultPopup?: string
}

export type ExtensionManifest = {
  manifest_version: number
  name: string
  version: string
  description?: string
  icons?: Record<string, string>
  permissions?: string[]
  host_permissions?: string[]
  optional_permissions?: string[]
  background?: unknown
  action?: ExtensionActionMetadata
  browser_action?: ExtensionActionMetadata
  page_action?: ExtensionActionMetadata
}

export type ExtensionValidationResult = {
  valid: boolean
  manifest?: ExtensionManifest
  warnings: string[]
  errors: string[]
  compatibility: ExtensionCompatibility
}

export type InstalledExtension = {
  id: string
  internalId: string
  name: string
  version: string
  description?: string
  path: string
  manifestVersion?: number
  iconPath?: string
  permissions: string[]
  hostPermissions: string[]
  globallyEnabled: boolean
  compatibility: ExtensionCompatibility
  compatibilityWarnings: string[]
  installError?: string
  installedAt: string
  updatedAt: string
  roleSettings: Record<string, RoleExtensionSetting>
  action?: ExtensionActionMetadata
}

export type ExtensionsState = {
  schemaVersion: number
  extensions: InstalledExtension[]
}

export type ExtensionInstallResult = {
  canceled: boolean
  extension?: InstalledExtension
  validation?: ExtensionValidationResult
}

export type ExtensionListResult = {
  extensions: InstalledExtension[]
  runtimeStates: RoleExtensionRuntimeState[]
}
