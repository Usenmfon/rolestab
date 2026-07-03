# Release Checklist

Run this checklist before publishing a RolesTab installer.

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

The current MVP uses `public/favicon.svg` as the source icon. Before public distribution, add platform-native icon assets:

- `public/favicon.ico` for Windows.
- `public/favicon.icns` for macOS.
- PNG icon sizes for Linux desktop integration.
