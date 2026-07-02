import { Layers, Plus, Pencil, Play, Sparkles, Trash2 } from 'lucide-react'
import type { RoleProfile } from '../../shared/workspace'

type RoleProfileListProps = {
  roleProfiles: RoleProfile[]
  hasActiveProject: boolean
  onCreateRoleProfile: () => void
  onEditRoleProfile: (roleProfileId: string) => void
  onDeleteRoleProfile: (roleProfileId: string) => void
  onOpenRoleProfile: (roleProfileId: string) => void
  onCreateCommonRoles: () => void
  onOpenAllRoles: () => void
}

export function RoleProfileList({
  roleProfiles,
  hasActiveProject,
  onCreateRoleProfile,
  onEditRoleProfile,
  onDeleteRoleProfile,
  onOpenRoleProfile,
  onCreateCommonRoles,
  onOpenAllRoles,
}: RoleProfileListProps) {
  return (
    <section className="min-h-0">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Role Profiles
        </h2>
        <button
          type="button"
          title="New Role Profile"
          aria-label="New Role Profile"
          disabled={!hasActiveProject}
          onClick={onCreateRoleProfile}
          className="grid h-7 w-7 place-items-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          <Plus aria-hidden="true" size={14} />
        </button>
      </div>

      {hasActiveProject ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCreateCommonRoles}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Sparkles aria-hidden="true" size={14} />
            Common
          </button>
          <button
            type="button"
            onClick={onOpenAllRoles}
            disabled={roleProfiles.length === 0}
            className="flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
          >
            <Layers aria-hidden="true" size={14} />
            Open All
          </button>
        </div>
      ) : null}

      {!hasActiveProject ? (
        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
          Select a project before adding reusable role profiles.
        </div>
      ) : roleProfiles.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
          No roles yet. Add Admin, Staff, Customer, or any role you test often.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {roleProfiles.map((roleProfile) => (
            <div
              key={roleProfile.id}
              className="rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-700"
            >
              <button
                type="button"
                onClick={() => onOpenRoleProfile(roleProfile.id)}
                className="flex w-full min-w-0 items-center gap-2 text-left"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: roleProfile.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{roleProfile.name}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {roleProfile.startUrl}
                  </span>
                </span>
              </button>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  title="Open Role Tab"
                  aria-label={`Open ${roleProfile.name} role tab`}
                  onClick={() => onOpenRoleProfile(roleProfile.id)}
                  className="grid h-7 w-7 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  <Play aria-hidden="true" size={14} />
                </button>
                <button
                  type="button"
                  title="Edit Role Profile"
                  aria-label={`Edit ${roleProfile.name}`}
                  onClick={() => onEditRoleProfile(roleProfile.id)}
                  className="grid h-7 w-7 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  <Pencil aria-hidden="true" size={14} />
                </button>
                <button
                  type="button"
                  title="Delete Role Profile"
                  aria-label={`Delete ${roleProfile.name}`}
                  onClick={() => onDeleteRoleProfile(roleProfile.id)}
                  className="grid h-7 w-7 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
