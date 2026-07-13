import type { AnalyticsArchitecture, AnalyticsPlatform } from './analytics-types.js'

export function normalizePlatform(platform: NodeJS.Platform): AnalyticsPlatform {
  switch (platform) {
    case 'win32':
      return 'windows'
    case 'darwin':
      return 'macos'
    case 'linux':
      return 'linux'
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

export function normalizeArchitecture(architecture: string): AnalyticsArchitecture {
  switch (architecture) {
    case 'x64':
      return 'x64'
    case 'arm64':
      return 'arm64'
    case 'ia32':
      return 'ia32'
    case 'universal':
      return 'universal'
    default:
      return 'unknown'
  }
}
