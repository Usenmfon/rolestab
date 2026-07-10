# Release Checklist

Run this checklist before publishing a RolesTab installer.

## Version & Changelog

1. Bump `version` in `package.json`. The release CI fails if the pushed
   `vX.Y.Z` tag does not match this value.
2. Keep the `CHANGELOG.md` entry for the release you are publishing current,
   and update any comparison links at the bottom of the file if you add a new
   release entry later.
3. Commit, then tag and push:

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   The tag push builds installers, publishes a GitHub release with the
   installers plus `latest*.yml` update metadata, and auto-generates release
   notes. Installed Windows and Linux apps pick up the update on next launch.

## Automated Gate

```bash
npm run lint
npm run build
npm test
```

## Package Commands

Create an unpacked app for quick inspection:

```bash
npm run dist:dir
```

Create platform packages:

```bash
npm run dist:win
npm run dist:mac
npm run dist:mac:x64
npm run dist:linux
```

The release output is written to:

```txt
release/
```

## Installer Validation

1. Install the generated package on the target OS.
2. Launch RolesTab from the installer-created shortcut or app launcher.
3. Create a project and role profile.
4. Open a role tab and confirm navigation works.
5. Restart the installed app and confirm workspace data restores.
6. Run the MVP checklist in `docs/mvp-test-checklist.md`.
7. Uninstall the app and confirm the uninstaller completes.

## Signing Notes

Unsigned builds are acceptable for local MVP testing. Public distribution should add OS-specific code signing before release:

- Windows: Authenticode certificate for NSIS installer.
- macOS: Developer ID signing and notarization.
- Linux: optional package signing for repository distribution.

## Icon Notes

The current MVP keeps its favicon.io asset set in `public/`. Before public distribution, confirm platform-native icon assets are present:

- `public/favicon.ico` for Windows installer icons.
- `public/android-chrome-512x512.png` as the source for macOS and Linux packaging icons.
- `public/apple-touch-icon.png` and `public/site.webmanifest` for browser and mobile install surfaces.
