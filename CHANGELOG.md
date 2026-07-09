# Changelog

All notable changes to RolesTab are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Release CI now builds and uploads a macOS Intel x64 installer artifact.

### Fixed

- macOS installer app bundles now include the RolesTab brand icon instead of
  the generic Finder document icon.

## [0.2.1] - 2026-07-09

### Fixed

- Dark appearance now applies across the app shell instead of leaving light
  backgrounds in panels, tabs, controls, and status surfaces.
- Native window titlebar controls now match the selected appearance, including
  System mode changes.

## [0.2.0] - 2026-07-09

### Added

- Automatic updates (Windows and Linux AppImage): the app checks for new
  releases on launch, downloads them in the background, and offers a
  restart-to-install action. Unsupported on macOS until the builds are signed.
- About section in Settings showing the app version, platform, and engine
  versions, with a "Check for updates" control, a link to the releases page,
  and a copy-diagnostics button.
- Release workflow now publishes update metadata and fails a tagged release
  when the tag does not match the version in `package.json`.

### Fixed

- Sidebar brand logo now renders in packaged builds (referenced via a bundled
  asset instead of an absolute public path).

## [0.1.3] - 2026-07-08

### Added

- GitHub release download stats script.

### Changed

- Browser-style window chrome and brand logo in the sidebar.
- Improved tab rename and address-bar editing, with the tab title draft state
  moved into a dedicated `RenameTabInput` component.
- Side panels stay above webviews; webviews use a browser user agent.
- More reliable Electron dev process and a clearer load-timeout error message.

## [0.1.2] - Prior release

### Changed

- Improved the console error overlay.
- Documentation updates.

## [0.1.1] - Prior release

### Changed

- Release assets are published after installer builds; disabled electron-builder
  implicit publishing.
- Build the app before running smoke tests.

## [0.1.0] - Initial release

### Added

- Project management, role profile management, isolated browser tabs, and
  browser navigation controls.

[Unreleased]: https://github.com/Usenmfon/rolestab/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Usenmfon/rolestab/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Usenmfon/rolestab/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/Usenmfon/rolestab/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Usenmfon/rolestab/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Usenmfon/rolestab/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Usenmfon/rolestab/releases/tag/v0.1.0
