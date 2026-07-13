"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineExtensionCompatibility = determineExtensionCompatibility;
const unsupportedManifestPermissions = new Set([
    'declarativeNetRequestWithHostAccess',
    'enterprise.deviceAttributes',
    'enterprise.hardwarePlatform',
    'enterprise.networkingAttributes',
    'enterprise.platformKeys',
    'nativeMessaging',
]);
const partiallySupportedPermissions = new Set([
    'bookmarks',
    'browsingData',
    'chrome://favicon/',
    'debugger',
    'devtools',
    'downloads',
    'history',
    'management',
    'privacy',
    'proxy',
    'sessions',
    'system.cpu',
    'system.memory',
    'system.storage',
    'topSites',
]);
function determineExtensionCompatibility(manifest) {
    const warnings = [];
    const errors = [];
    const permissions = [
        ...(manifest.permissions ?? []),
        ...(manifest.optional_permissions ?? []),
    ];
    if (manifest.manifest_version !== 2 && manifest.manifest_version !== 3) {
        errors.push(`Manifest version ${manifest.manifest_version} is not supported by RolesTab.`);
    }
    for (const permission of permissions) {
        if (unsupportedManifestPermissions.has(permission)) {
            errors.push(`Permission "${permission}" is not supported by Electron extensions.`);
        }
        else if (partiallySupportedPermissions.has(permission)) {
            warnings.push(`Permission "${permission}" may only be partially supported in Electron.`);
        }
    }
    if (manifest.manifest_version === 3) {
        warnings.push('Manifest V3 extensions may have limited service worker support in Electron.');
    }
    if (errors.length > 0) {
        return { compatibility: 'unsupported', warnings, errors };
    }
    if (warnings.length > 0) {
        return { compatibility: 'partially-supported', warnings, errors };
    }
    return { compatibility: 'unknown', warnings, errors };
}
//# sourceMappingURL=extension-compatibility.js.map