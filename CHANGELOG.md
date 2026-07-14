# Changelog

All notable changes to RolesTab are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-07-14

### Changed

- Use role group icon for common roles
- Fix startup settings spacing
- Fix Electron input focus handling

## [0.2.0] - 2026-07-13

### Changed

- Harden analytics privacy and add explicit consent
- Focus active webviews after loading
- Instrument browser usage analytics
- Add durable anonymous analytics pipeline
- Update package author metadata
- Show update ready badge on settings
- Show copied state for URL copy button
- Update Electron build artifacts
- Cover extension validation and isolation contracts
- Add extension management UI
- Add isolated extension manager

## [0.1.2] - 2026-07-10

### Changed

- Add release prep automation
- Improve form focus responsiveness

## [0.1.1] - 2026-07-10

### Fixed

- Role tabs are now isolated by project, so selecting a role opens or focuses
  the correct project's URL and port.
- Project switching now displays only the selected project's active role tabs.
- Restored tabs and recent URLs now verify that each role belongs to the saved
  project before loading it.

## [0.1.0] - 2026-07-10

### Added

- Project management, role profile management, isolated browser tabs, and
  browser navigation controls.
- Persistent role sessions across app restarts, plus recent tabs and recent URL
  restore support.
- Import and export of project configurations as JSON.
- Automatic updates for Windows and Linux AppImage builds.
- An About section in Settings showing the app version, platform, and engine
  versions, with update and diagnostics controls.
- Browser-style window chrome and a branded sidebar header.
- Release CI that builds and uploads a macOS Intel x64 installer artifact.

### Fixed

- Sidebar brand logo now renders in packaged builds.
- macOS installer app bundles now include the RolesTab brand icon instead of
  the generic Finder document icon.
- Dark appearance now applies across the app shell instead of leaving light
  backgrounds in panels, tabs, controls, and status surfaces.
- Native window titlebar controls now match the selected appearance.

[0.2.1]: https://github.com/Usenmfon/rolestab/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Usenmfon/rolestab/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/Usenmfon/rolestab/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Usenmfon/rolestab/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Usenmfon/rolestab/releases/tag/v0.1.0



