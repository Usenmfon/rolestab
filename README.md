# RolesTab

RolesTab is a desktop mini-browser for testing the same web application as multiple user roles at once. Each role profile opens in its own persistent Electron session partition, so cookies, localStorage, IndexedDB, cache, and login state stay isolated.

## Current Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Local JSON workspace storage
- Electron Builder

## Development

Install dependencies:

```bash
npm install
```

Run the desktop app in development:

```bash
npm run dev
```

Build the renderer and Electron main/preload bundles:

```bash
npm run build
```

Create a distributable package:

```bash
npm run dist
```

Create an unpacked app for release inspection:

```bash
npm run dist:dir
```

See [docs/release-checklist.md](docs/release-checklist.md) before publishing installers.

## Project Structure

```txt
src/
  main/       Electron main process, window setup, sessions, workspace storage
  preload/    Safe IPC bridge exposed to the renderer
  renderer/   React app, layouts, components, browser webviews
  shared/     Shared TypeScript types
public/       Browser and app icon assets
```

## MVP Capabilities

- Create, edit, delete, and persist projects.
- Create reusable role profiles per project.
- Open isolated browser tabs per role profile.
- Restore recent tabs and URLs.
- Clear one role session, project sessions, or all role sessions.
- Use browser controls for navigation, reload, home, external open, copy URL, and DevTools.

## Local Data

Workspace data is stored as JSON under Electron's `userData` directory. Role browser sessions use persistent Electron partitions named with this pattern:

```txt
persist:<projectId>-<roleProfileId>
```

The app stores role/session metadata, not passwords.
