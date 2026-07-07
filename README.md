# RolesTab

RolesTab is a desktop mini-browser for testing the same web application as multiple user roles at once. Each role profile runs in its own persistent Electron session partition, so cookies, localStorage, IndexedDB, cache, and login state stay isolated between roles.

It is useful for QA, support, demos, and development workflows where you need to compare how one product behaves for admins, staff, customers, or other account types without constantly signing in and out.

## Features

- Create and manage projects.
- Create reusable role profiles per project.
- Open isolated browser tabs for each role profile.
- Keep role sessions persistent across app restarts.
- Restore recent tabs and recently visited URLs.
- Clear a single role session, project sessions, or all role sessions.
- Import and export project configurations as JSON.
- Use browser controls for navigation, reload, home, external open, copy URL, and DevTools.
- Build installers for Windows, macOS, and Linux.

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Electron Builder
- Node.js test runner
- Local JSON workspace storage

## Requirements

- Node.js 24 or newer
- npm

For installer builds, use the target operating system when possible:

- Windows installer: Windows
- macOS DMG/ZIP: macOS
- Linux AppImage/DEB: Linux

The repository includes a GitHub Actions workflow that builds installers on native GitHub-hosted runners.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app in development mode:

```bash
npm run dev
```

Build the renderer, main process, and preload bundles:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Run smoke tests:

```bash
npm test
```

## Packaging

Create a platform package for the current operating system:

```bash
npm run dist
```

Create an unpacked app for inspection:

```bash
npm run dist:dir
```

Build platform-specific installers:

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Generated installers are written to:

```txt
release/
```

Current targets:

- Windows: NSIS installer
- macOS: DMG and ZIP
- Linux: AppImage and DEB

macOS builds are currently unsigned, so macOS may show a security warning on first launch.

## Releases

GitHub Actions builds installers automatically when a version tag is pushed.

Typical release flow:

```bash
git tag v0.1.1
git push origin v0.1.1
```

The release workflow:

1. Installs dependencies with `npm ci`.
2. Runs linting.
3. Runs smoke tests.
4. Builds installers on Windows, macOS, and Linux runners.
5. Uploads installer artifacts.
6. Attaches the installer files to the GitHub Release for the tag.

Review [docs/release-checklist.md](docs/release-checklist.md) before publishing installers.

Check GitHub Release download counts:

```bash
npm run stats:downloads
```

For a different repository, pass `owner/name`:

```bash
npm run stats:downloads -- owner/repo
```

## Project Structure

```txt
src/
  main/       Electron main process, window setup, sessions, IPC, storage
  preload/    Safe IPC bridge exposed to the renderer
  renderer/   React app, layouts, components, browser webviews
  shared/     Shared TypeScript types and defaults
public/       Browser and app icon assets
tests/        Smoke tests for build, packaging, and app contracts
docs/         Release and manual test checklists
```

## Local Data

Workspace data is stored as JSON under Electron's `userData` directory. Role browser sessions use persistent Electron partitions named with this pattern:

```txt
persist:<projectId>-<roleProfileId>
```

RolesTab stores project, role, tab, URL, and settings metadata. Browser login state is kept inside Electron session storage for each role partition.

## Security Notes

- Renderer code runs with `contextIsolation` enabled.
- Renderer windows use sandboxed web preferences.
- IPC calls are exposed through a preload bridge.
- Role webviews use isolated persistent partitions.
- Session clearing is handled through Electron session APIs.

## Documentation

- [Release checklist](docs/release-checklist.md)
- [MVP test checklist](docs/mvp-test-checklist.md)
