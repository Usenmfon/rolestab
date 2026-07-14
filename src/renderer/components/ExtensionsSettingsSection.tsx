import { FolderOpen, PackagePlus, Puzzle, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type {
  ExtensionCompatibility,
  InstalledExtension,
  RoleExtensionRuntimeState,
} from '../../shared/extensions'
import type { RoleProfile } from '../../shared/workspace'
import type { ConfirmationRequest } from './ConfirmationDialog'

type ExtensionsSettingsSectionProps = {
  roleProfiles: RoleProfile[]
  onRequestConfirmation: (request: ConfirmationRequest) => Promise<boolean>
}

export function ExtensionsSettingsSection({
  roleProfiles,
  onRequestConfirmation,
}: ExtensionsSettingsSectionProps) {
  const [extensions, setExtensions] = useState<InstalledExtension[]>([])
  const [runtimeStates, setRuntimeStates] = useState<RoleExtensionRuntimeState[]>([])
  const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null)
  const [busyExtensionId, setBusyExtensionId] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void refreshExtensions()
  }, [])

  async function refreshExtensions() {
    const result = await window.rolesTab?.extensions.list()

    if (result) {
      setExtensions(result.extensions)
      setRuntimeStates(result.runtimeStates)
      window.dispatchEvent(new CustomEvent('rolestab-extensions-changed'))
    }
  }

  async function installExtension() {
    setInstalling(true)
    setMessage(null)

    try {
      const result = await window.rolesTab?.extensions.install()

      if (!result || result.canceled) {
        return
      }

      if (result.validation && !result.validation.valid) {
        setMessage(result.validation.errors[0] ?? 'This folder is not a valid unpacked extension.')
        return
      }

      if (result.extension) {
        setSelectedExtensionId(result.extension.id)
        setMessage('Extension installed. Choose the roles that should use it.')
      }

      await refreshExtensions()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to install extension.')
    } finally {
      setInstalling(false)
    }
  }

  async function toggleGlobal(extension: InstalledExtension) {
    setBusyExtensionId(extension.id)
    setMessage(null)

    try {
      const nextExtensions = await window.rolesTab?.extensions.setGlobalEnabled(
        extension.id,
        !extension.globallyEnabled,
      )

      if (nextExtensions) {
        setExtensions(nextExtensions)
      }

      await refreshExtensions()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update extension.')
    } finally {
      setBusyExtensionId(null)
    }
  }

  async function toggleRole(extension: InstalledExtension, roleProfile: RoleProfile) {
    setBusyExtensionId(extension.id)
    setMessage(null)

    try {
      const enabled = !extension.roleSettings[roleProfile.id]?.enabled
      const runtimeState = await window.rolesTab?.extensions.setRoleEnabled(
        extension.id,
        roleProfile.id,
        enabled,
      )

      setExtensions((currentExtensions) =>
        currentExtensions.map((currentExtension) =>
          currentExtension.id === extension.id
            ? {
                ...currentExtension,
                roleSettings: {
                  ...currentExtension.roleSettings,
                  [roleProfile.id]: {
                    ...currentExtension.roleSettings[roleProfile.id],
                    enabled,
                    allowFileAccess: currentExtension.roleSettings[roleProfile.id]?.allowFileAccess ?? false,
                  },
                },
              }
            : currentExtension,
        ),
      )

      if (runtimeState) {
        setRuntimeStates((currentStates) => [
          runtimeState,
          ...currentStates.filter(
            (currentState) =>
              currentState.extensionId !== extension.id || currentState.roleId !== roleProfile.id,
          ),
        ])
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update role extension setting.')
    } finally {
      setBusyExtensionId(null)
    }
  }

  async function reloadForRole(extension: InstalledExtension, roleProfile: RoleProfile) {
    setBusyExtensionId(extension.id)
    setMessage(null)

    try {
      const runtimeState = await window.rolesTab?.extensions.reloadForRole(extension.id, roleProfile.id)

      if (runtimeState) {
        setRuntimeStates((currentStates) => [
          runtimeState,
          ...currentStates.filter(
            (currentState) =>
              currentState.extensionId !== extension.id || currentState.roleId !== roleProfile.id,
          ),
        ])
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reload extension for this role.')
    } finally {
      setBusyExtensionId(null)
    }
  }

  async function removeExtension(extension: InstalledExtension) {
    const confirmed = await onRequestConfirmation({
      title: `Remove ${extension.name}?`,
      message: 'The extension and all of its role-specific settings will be removed from RolesTab.',
      confirmLabel: 'Remove Extension',
    })

    if (!confirmed) {
      return
    }

    setBusyExtensionId(extension.id)
    setMessage(null)

    try {
      await window.rolesTab?.extensions.remove(extension.id)
      setExtensions((currentExtensions) =>
        currentExtensions.filter((currentExtension) => currentExtension.id !== extension.id),
      )
      setRuntimeStates((currentStates) =>
        currentStates.filter((runtimeState) => runtimeState.extensionId !== extension.id),
      )
      setSelectedExtensionId((currentSelectedExtensionId) =>
        currentSelectedExtensionId === extension.id ? null : currentSelectedExtensionId,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to remove extension.')
    } finally {
      setBusyExtensionId(null)
    }
  }

  function openFolder(extension: InstalledExtension) {
    void window.rolesTab?.extensions.openFolder(extension.id).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Unable to open extension folder.')
    })
  }

  return (
    <section className="space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Extensions</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Manage unpacked Chromium extensions and choose which isolated role sessions can use them.
          </p>
        </div>
        <button
          type="button"
          onClick={installExtension}
          disabled={installing}
          className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <PackagePlus aria-hidden="true" size={15} />
          {installing ? 'Installing' : 'Install'}
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        <span className="font-semibold">Extension warning:</span> enabled extensions can read and modify
        pages inside selected role tabs. RolesTab never loads them into the internal app UI session.
      </div>

      {message ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {message}
        </div>
      ) : null}

      {extensions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-500">
            <Puzzle aria-hidden="true" size={18} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800">No extensions installed</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Install an unpacked extension folder with a valid manifest.json.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {extensions.map((extension) => (
            <article key={extension.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  <Puzzle aria-hidden="true" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-slate-950">{extension.name}</h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        v{extension.version}
                        {extension.manifestVersion ? ` / Manifest V${extension.manifestVersion}` : ''}
                      </p>
                    </div>
                    <CompatibilityBadge compatibility={extension.compatibility} />
                  </div>
                  {extension.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                      {extension.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {countEnabledRoles(extension)} role{countEnabledRoles(extension) === 1 ? '' : 's'} enabled
                  </p>
                  {extension.installError ? (
                    <p className="mt-2 flex items-start gap-2 rounded-md bg-red-50 px-2 py-1.5 text-xs leading-5 text-red-700">
                      <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={14} />
                      {extension.installError}
                    </p>
                  ) : null}
                  {extension.compatibilityWarnings.length > 0 ? (
                    <p className="mt-2 text-xs leading-5 text-amber-700">
                      {extension.compatibilityWarnings[0]}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void toggleGlobal(extension)
                      }}
                      disabled={busyExtensionId === extension.id}
                      className={`h-8 rounded-lg border px-3 text-xs font-semibold ${
                        extension.globallyEnabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      {extension.globallyEnabled ? 'Globally enabled' : 'Globally disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedExtensionId(selectedExtensionId === extension.id ? null : extension.id)
                      }
                      className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Configure roles
                    </button>
                    <button
                      type="button"
                      onClick={() => openFolder(extension)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      title="Open extension folder"
                      aria-label="Open extension folder"
                    >
                      <FolderOpen aria-hidden="true" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void removeExtension(extension)
                      }}
                      disabled={busyExtensionId === extension.id}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                      title="Remove extension"
                      aria-label="Remove extension"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedExtensionId === extension.id ? (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {roleProfiles.length === 0 ? (
                    <p className="text-xs text-slate-500">Create a role profile before enabling extensions.</p>
                  ) : (
                    roleProfiles.map((roleProfile) => {
                      const runtimeState = getRuntimeState(runtimeStates, extension.id, roleProfile.id)
                      const roleEnabled = extension.roleSettings[roleProfile.id]?.enabled ?? false

                      return (
                        <div
                          key={roleProfile.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: roleProfile.color }}
                            />
                            <span className="truncate text-sm font-medium text-slate-700">
                              {roleProfile.name}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <RuntimeBadge runtimeState={runtimeState} />
                            <button
                              type="button"
                              onClick={() => {
                                void reloadForRole(extension, roleProfile)
                              }}
                              disabled={!roleEnabled || busyExtensionId === extension.id}
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-300"
                              title="Reload for role"
                              aria-label="Reload for role"
                            >
                              <RefreshCw aria-hidden="true" size={13} />
                            </button>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={roleEnabled}
                                disabled={!extension.globallyEnabled || busyExtensionId === extension.id}
                                onChange={() => {
                                  void toggleRole(extension, roleProfile)
                                }}
                                className="h-4 w-4"
                              />
                              Enabled
                            </label>
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function CompatibilityBadge({ compatibility }: { compatibility: ExtensionCompatibility }) {
  const className =
    compatibility === 'compatible'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : compatibility === 'unsupported'
        ? 'bg-red-50 text-red-700 border-red-200'
        : compatibility === 'partially-supported'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-slate-50 text-slate-600 border-slate-200'

  return (
    <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${className}`}>
      {compatibility.replace('-', ' ')}
    </span>
  )
}

function RuntimeBadge({ runtimeState }: { runtimeState?: RoleExtensionRuntimeState }) {
  const status = runtimeState?.status ?? 'disabled'
  const className =
    status === 'loaded'
      ? 'text-emerald-700'
      : status === 'failed'
        ? 'text-red-700'
        : status === 'loading'
          ? 'text-blue-700'
          : status === 'reload-required'
            ? 'text-amber-700'
            : 'text-slate-500'

  return (
    <span className={`max-w-28 truncate text-[11px] font-semibold ${className}`} title={runtimeState?.error}>
      {runtimeState?.error ?? status.replace('-', ' ')}
    </span>
  )
}

function countEnabledRoles(extension: InstalledExtension): number {
  return Object.values(extension.roleSettings).filter((setting) => setting.enabled).length
}

function getRuntimeState(
  runtimeStates: RoleExtensionRuntimeState[],
  extensionId: string,
  roleId: string,
): RoleExtensionRuntimeState | undefined {
  return runtimeStates.find(
    (runtimeState) => runtimeState.extensionId === extensionId && runtimeState.roleId === roleId,
  )
}
