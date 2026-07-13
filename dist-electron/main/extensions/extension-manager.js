"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionManager = void 0;
const electron_1 = __importDefault(require("electron"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const errorLogger_js_1 = require("../errorLogger.js");
const sessionManager_js_1 = require("../sessionManager.js");
const extension_compatibility_js_1 = require("./extension-compatibility.js");
const extension_installer_js_1 = require("./extension-installer.js");
const extension_persistence_js_1 = require("./extension-persistence.js");
const { shell } = electron_1.default;
const safeIdentifierPattern = /^[\w-]+$/;
class ExtensionManager {
    runtimeStates = new Map();
    async installExtension(sourcePath, probePartition) {
        const internalId = `ext-${crypto.randomUUID()}`;
        await logExtensionEvent('extension-install-attempt', `Installing unpacked extension from ${sourcePath}.`);
        const prepared = await (0, extension_installer_js_1.prepareManagedExtensionDirectory)(sourcePath, internalId);
        const now = new Date().toISOString();
        const compatibility = (0, extension_compatibility_js_1.determineExtensionCompatibility)(prepared.manifest);
        const installedExtension = {
            id: internalId,
            internalId,
            name: prepared.manifest.name,
            version: prepared.manifest.version,
            description: prepared.manifest.description,
            path: prepared.destinationPath,
            manifestVersion: prepared.manifest.manifest_version,
            iconPath: getLargestIconPath(prepared.destinationPath, prepared.manifest),
            permissions: prepared.manifest.permissions ?? [],
            hostPermissions: prepared.manifest.host_permissions ?? [],
            globallyEnabled: true,
            compatibility: compatibility.compatibility,
            compatibilityWarnings: [...prepared.warnings, ...compatibility.warnings],
            installedAt: now,
            updatedAt: now,
            roleSettings: {},
            action: prepared.manifest.action ?? prepared.manifest.browser_action ?? prepared.manifest.page_action,
        };
        if (probePartition && isSafePartition(probePartition)) {
            try {
                const probeSession = (0, sessionManager_js_1.getRoleSession)(probePartition);
                const loadedExtension = await probeSession.extensions.loadExtension(prepared.destinationPath, {
                    allowFileAccess: false,
                });
                installedExtension.id = loadedExtension.id;
                installedExtension.name = loadedExtension.name || installedExtension.name;
                installedExtension.version = loadedExtension.version || installedExtension.version;
                installedExtension.compatibility = mergeCompatibility(installedExtension.compatibility, 'compatible');
                probeSession.extensions.removeExtension(loadedExtension.id);
            }
            catch (error) {
                installedExtension.installError = getSafeErrorMessage(error);
                installedExtension.compatibility = mergeCompatibility(installedExtension.compatibility, 'partially-supported');
                await logExtensionEvent('extension-install-load-failed', `Extension copied but failed initial Electron load: ${installedExtension.installError}`);
            }
        }
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const nextState = {
            ...state,
            extensions: [installedExtension, ...state.extensions.filter((extension) => extension.id !== installedExtension.id)],
        };
        await (0, extension_persistence_js_1.writeExtensionsState)(nextState);
        await logExtensionEvent('extension-install-complete', `Installed extension ${installedExtension.name}.`);
        return installedExtension;
    }
    async removeExtension(extensionId) {
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId);
        if (!extension) {
            return;
        }
        for (const runtimeState of this.runtimeStates.values()) {
            if (runtimeState.extensionId === extensionId && runtimeState.status === 'loaded') {
                await this.unloadExtensionForRole(extensionId, runtimeState.roleId, extension.path);
            }
        }
        if (!(0, extension_persistence_js_1.isPathInsideManagedDirectory)(extension.path)) {
            throw new Error('Refusing to delete an extension folder outside the managed extensions directory.');
        }
        try {
            await (0, promises_1.rm)(extension.path, { recursive: true, force: true });
        }
        catch (error) {
            await logExtensionEvent('extension-remove-delete-failed', getSafeErrorMessage(error));
        }
        this.deleteRuntimeStatesForExtension(extensionId);
        await (0, extension_persistence_js_1.writeExtensionsState)({
            ...state,
            extensions: state.extensions.filter((currentExtension) => currentExtension.id !== extensionId),
        });
        await logExtensionEvent('extension-removed', `Removed extension ${extension.name}.`);
    }
    async setGlobalEnabled(extensionId, enabled) {
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const now = new Date().toISOString();
        const extensions = state.extensions.map((extension) => extension.id === extensionId ? { ...extension, globallyEnabled: enabled, updatedAt: now } : extension);
        if (!enabled) {
            const disabledExtension = state.extensions.find((extension) => extension.id === extensionId);
            for (const runtimeState of this.runtimeStates.values()) {
                if (runtimeState.extensionId === extensionId && runtimeState.status === 'loaded') {
                    await this.unloadExtensionForRole(extensionId, runtimeState.roleId, disabledExtension?.path);
                }
            }
        }
        const nextState = await (0, extension_persistence_js_1.writeExtensionsState)({ ...state, extensions });
        await logExtensionEvent('extension-global-toggle', `${enabled ? 'Enabled' : 'Disabled'} extension ${extensionId} globally.`);
        return nextState.extensions;
    }
    async setRoleEnabled(extensionId, roleId, partition, enabled) {
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        assertSafeIdentifier(roleId, 'Invalid role identifier.');
        if (!isSafePartition(partition)) {
            throw new Error('Invalid role session partition.');
        }
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId);
        if (!extension) {
            throw new Error('Extension is no longer installed.');
        }
        const now = new Date().toISOString();
        const extensions = state.extensions.map((currentExtension) => currentExtension.id === extensionId
            ? {
                ...currentExtension,
                updatedAt: now,
                roleSettings: {
                    ...currentExtension.roleSettings,
                    [roleId]: {
                        ...currentExtension.roleSettings[roleId],
                        enabled,
                        allowFileAccess: currentExtension.roleSettings[roleId]?.allowFileAccess ?? false,
                    },
                },
            }
            : currentExtension);
        await (0, extension_persistence_js_1.writeExtensionsState)({ ...state, extensions });
        if (enabled) {
            return this.loadExtensionForRole(extensionId, roleId, partition);
        }
        await this.unloadExtensionForRole(extensionId, roleId, extension.path);
        const runtimeState = this.setRuntimeState(extensionId, roleId, {
            extensionId,
            roleId,
            sessionPartition: partition,
            status: 'disabled',
            reloadRequired: true,
        });
        await logExtensionEvent('extension-role-disabled', `Disabled extension ${extensionId} for role ${roleId}.`);
        return runtimeState;
    }
    async loadExtensionsForRole(roleId, partition) {
        assertSafeIdentifier(roleId, 'Invalid role identifier.');
        if (!isSafePartition(partition)) {
            throw new Error('Invalid role session partition.');
        }
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const runtimeStates = [];
        await logExtensionEvent('extension-role-load-start', `Loading role extensions for ${roleId} in ${partition}.`);
        for (const extension of state.extensions) {
            const roleSetting = extension.roleSettings[roleId];
            if (!extension.globallyEnabled || !roleSetting?.enabled) {
                runtimeStates.push(this.setRuntimeState(extension.id, roleId, {
                    extensionId: extension.id,
                    roleId,
                    sessionPartition: partition,
                    status: 'disabled',
                }));
                continue;
            }
            runtimeStates.push(await this.loadExtensionForRole(extension.id, roleId, partition));
        }
        return runtimeStates;
    }
    async reloadExtensionForRole(extensionId, roleId, partition) {
        await this.unloadExtensionForRole(extensionId, roleId);
        return this.loadExtensionForRole(extensionId, roleId, partition);
    }
    async getInstalledExtensions() {
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const extensions = await Promise.all(state.extensions.map(async (extension) => ({
            ...extension,
            installError: (await directoryExists(extension.path))
                ? extension.installError
                : 'Extension folder is missing from the managed extensions directory.',
        })));
        return {
            extensions,
            runtimeStates: [...this.runtimeStates.values()],
        };
    }
    async openExtensionFolder(extensionId) {
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId);
        if (!extension || !(0, extension_persistence_js_1.isPathInsideManagedDirectory)(extension.path)) {
            throw new Error('Extension folder is unavailable.');
        }
        await shell.openPath(extension.path);
    }
    async loadExtensionForRole(extensionId, roleId, partition) {
        const state = await (0, extension_persistence_js_1.loadExtensionsState)();
        const extension = state.extensions.find((currentExtension) => currentExtension.id === extensionId);
        if (!extension) {
            throw new Error('Extension is no longer installed.');
        }
        const roleSetting = extension.roleSettings[roleId];
        if (!extension.globallyEnabled || !roleSetting?.enabled) {
            return this.setRuntimeState(extensionId, roleId, {
                extensionId,
                roleId,
                sessionPartition: partition,
                status: 'disabled',
            });
        }
        if (!(await directoryExists(extension.path))) {
            return this.setRuntimeState(extensionId, roleId, {
                extensionId,
                roleId,
                sessionPartition: partition,
                status: 'failed',
                error: 'Extension folder is missing.',
            });
        }
        this.setRuntimeState(extensionId, roleId, {
            extensionId,
            roleId,
            sessionPartition: partition,
            status: 'loading',
        });
        try {
            const roleSession = (0, sessionManager_js_1.getRoleSession)(partition);
            const alreadyLoaded = roleSession.extensions
                .getAllExtensions()
                .find((loadedExtension) => loadedExtension.id === extension.id || loadedExtension.path === extension.path);
            if (!alreadyLoaded) {
                await roleSession.extensions.loadExtension(extension.path, {
                    allowFileAccess: roleSetting.allowFileAccess ?? false,
                });
            }
            await logExtensionEvent('extension-role-loaded', `Loaded extension ${extension.id} for ${roleId} in ${partition}.`);
            return this.setRuntimeState(extensionId, roleId, {
                extensionId,
                roleId,
                sessionPartition: partition,
                status: 'loaded',
            });
        }
        catch (error) {
            const message = getSafeErrorMessage(error);
            await logExtensionEvent('extension-role-load-failed', `${extension.id} for ${roleId}: ${message}`);
            return this.setRuntimeState(extensionId, roleId, {
                extensionId,
                roleId,
                sessionPartition: partition,
                status: 'failed',
                error: message,
            });
        }
    }
    async unloadExtensionForRole(extensionId, roleId, extensionPath) {
        for (const partition of getLikelyLoadedPartitions(this.runtimeStates, extensionId, roleId)) {
            try {
                const roleSession = (0, sessionManager_js_1.getRoleSession)(partition);
                const loadedExtension = roleSession.extensions
                    .getAllExtensions()
                    .find((extension) => extension.id === extensionId || extension.path === extensionPath);
                if (loadedExtension) {
                    roleSession.extensions.removeExtension(loadedExtension.id);
                }
            }
            catch (error) {
                await logExtensionEvent('extension-role-unload-failed', getSafeErrorMessage(error));
            }
        }
    }
    setRuntimeState(extensionId, roleId, runtimeState) {
        this.runtimeStates.set(`${roleId}:${extensionId}`, runtimeState);
        return runtimeState;
    }
    deleteRuntimeStatesForExtension(extensionId) {
        for (const key of this.runtimeStates.keys()) {
            if (key.endsWith(`:${extensionId}`)) {
                this.runtimeStates.delete(key);
            }
        }
    }
}
exports.ExtensionManager = ExtensionManager;
function getLargestIconPath(extensionPath, manifest) {
    const iconEntry = Object.entries(manifest.icons ?? {})
        .map(([size, iconPath]) => ({ size: Number(size), iconPath }))
        .filter((entry) => Number.isFinite(entry.size) && entry.iconPath)
        .sort((first, second) => second.size - first.size)[0];
    return iconEntry ? node_path_1.default.join(extensionPath, iconEntry.iconPath) : undefined;
}
function mergeCompatibility(currentCompatibility, loadCompatibility) {
    if (currentCompatibility === 'unsupported') {
        return 'unsupported';
    }
    if (currentCompatibility === 'partially-supported') {
        return 'partially-supported';
    }
    return loadCompatibility;
}
async function directoryExists(directoryPath) {
    try {
        const directoryStats = await (0, promises_1.stat)(directoryPath);
        return directoryStats.isDirectory();
    }
    catch {
        return false;
    }
}
function getLikelyLoadedPartitions(runtimeStates, extensionId, roleId) {
    const runtimeState = runtimeStates.get(`${roleId}:${extensionId}`);
    if (!runtimeState || runtimeState.status !== 'loaded') {
        return [];
    }
    return runtimeState.sessionPartition ? [runtimeState.sessionPartition] : [];
}
function assertSafeIdentifier(value, message) {
    if (!safeIdentifierPattern.test(value)) {
        throw new Error(message);
    }
}
function isSafePartition(partition) {
    return /^persist:[\w-]+-[\w-]+$/.test(partition);
}
function getSafeErrorMessage(error) {
    const message = error instanceof Error ? error.message : 'Extension operation failed.';
    return message.split(/\r?\n/)[0]?.slice(0, 240) || 'Extension operation failed.';
}
async function logExtensionEvent(scope, message) {
    await (0, errorLogger_js_1.logInternalError)({ scope, message }).catch(() => {
        // Extension logging must never break browsing.
    });
}
//# sourceMappingURL=extension-manager.js.map