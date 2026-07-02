import type { RolesTabApi } from '../../preload/index'

declare global {
  interface Window {
    rolesTab?: RolesTabApi
  }
}

export {}
