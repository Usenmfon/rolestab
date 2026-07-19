import { Layers, Plus, Pencil, Play, Trash2, UsersRound } from 'lucide-react'
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
    <section>
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 className="rt-eyebrow">Role Profiles</h2>
          <p className="mt-1 text-[11px] text-[var(--rt-text-soft)]">
            {hasActiveProject ? `${roleProfiles.length} isolated sessions` : 'Select a project'}
          </p>
        </div>
        <button
          type="button"
          title="New Role Profile"
          aria-label="New Role Profile"
          disabled={!hasActiveProject}
          onClick={onCreateRoleProfile}
          data-tour-id="new-role-profile"
          className="rt-icon-button h-8 w-8 border border-[var(--rt-border)] bg-[var(--rt-surface)]"
        >
          <Plus aria-hidden="true" size={15} />
        </button>
      </div>

      {hasActiveProject ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCreateCommonRoles} className="rt-button rt-button-secondary rt-button-small">
            <UsersRound aria-hidden="true" size={14} />
            Common
          </button>
          <button
            type="button"
            onClick={onOpenAllRoles}
            disabled={roleProfiles.length === 0}
            className="rt-button rt-button-secondary rt-button-small"
          >
            <Layers aria-hidden="true" size={14} />
            Open All
          </button>
        </div>
      ) : null}

      {!hasActiveProject ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--rt-border)] bg-[var(--rt-surface)] p-4 text-sm leading-6 text-[var(--rt-text-muted)]">
          Select a project before adding reusable role profiles.
        </div>
      ) : roleProfiles.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--rt-border)] bg-[var(--rt-surface)] p-4 text-sm leading-6 text-[var(--rt-text-muted)]">
          Add Admin, Staff, Customer, or any role you test often.
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {roleProfiles.map((roleProfile) => (
            <div
              key={roleProfile.id}
              className="group rounded-lg border border-transparent px-3 py-2.5 text-[var(--rt-text-muted)] transition hover:border-[var(--rt-border)] hover:bg-[var(--rt-surface)]"
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => onOpenRoleProfile(roleProfile.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-[var(--rt-surface)]"
                    style={{ backgroundColor: roleProfile.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--rt-text)]">
                      {roleProfile.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--rt-text-muted)]">
                      {roleProfile.startUrl}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    title="Open Role Tab"
                    aria-label={`Open ${roleProfile.name} role tab`}
                    onClick={() => onOpenRoleProfile(roleProfile.id)}
                    data-tour-id="open-role-tab"
                    className="rt-icon-button h-7 w-7"
                  >
                    <Play aria-hidden="true" size={14} />
                  </button>
                  <button
                    type="button"
                    title="Edit Role Profile"
                    aria-label={`Edit ${roleProfile.name}`}
                    onClick={() => onEditRoleProfile(roleProfile.id)}
                    className="rt-icon-button h-7 w-7"
                  >
                    <Pencil aria-hidden="true" size={14} />
                  </button>
                  <button
                    type="button"
                    title="Delete Role Profile"
                    aria-label={`Delete ${roleProfile.name}`}
                    onClick={() => onDeleteRoleProfile(roleProfile.id)}
                    className="rt-icon-button h-7 w-7"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}