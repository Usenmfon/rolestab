"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExtensionIpcHandlers = registerExtensionIpcHandlers;
const electron_1 = __importDefault(require("electron"));
const workspaceStore_js_1 = require("../workspaceStore.js");
const extension_manifest_validator_js_1 = require("./extension-manifest-validator.js");
const { dialog, ipcMain } = electron_1.default;
const safeIdentifierPattern = /^[\w-]+$/;
function registerExtensionIpcHandlers(options) {
    const { extensionManager, getMainWindow, assertTrustedSender } = options;
    ipcMain.handle('extensions:list', async (event) => {
        assertTrustedSender(event);
        return extensionManager.getInstalledExtensions();
    });
    ipcMain.handle('extensions:install', async (event) => {
        assertTrustedSender(event);
        const openOptions = {
            title: 'Install Unpacked Extension',
            properties: ['openDirectory'],
        };
        const mainWindow = getMainWindow();
        const result = mainWindow
            ? await dialog.showOpenDialog(mainWindow, openOptions)
            : await dialog.showOpenDialog(openOptions);
        const sourcePath = result.filePaths[0];
        if (result.canceled || !sourcePath) {
            return { canceled: true };
        }
        const validation = await (0, extension_manifest_validator_js_1.validateExtensionManifest)(sourcePath);
        if (!validation.valid) {
            return {
                canceled: false,
                validation,
            };
        }
        const workspace = await (0, workspaceStore_js_1.loadWorkspace)();
        const probePartition = workspace.roleProfiles.find((roleProfile) => roleProfile.sessionPartition)?.sessionPartition;
        const extension = await extensionManager.installExtension(sourcePath, probePartition);
        return {
            canceled: false,
            extension,
            validation,
        };
    });
    ipcMain.handle('extensions:remove', async (event, extensionId) => {
        assertTrustedSender(event);
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        await extensionManager.removeExtension(extensionId);
    });
    ipcMain.handle('extensions:set-global-enabled', async (event, extensionId, enabled) => {
        assertTrustedSender(event);
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        if (typeof enabled !== 'boolean') {
            throw new Error('Global enabled value must be boolean.');
        }
        return extensionManager.setGlobalEnabled(extensionId, enabled);
    });
    ipcMain.handle('extensions:set-role-enabled', async (event, extensionId, roleId, enabled) => {
        assertTrustedSender(event);
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        assertSafeIdentifier(roleId, 'Invalid role identifier.');
        if (typeof enabled !== 'boolean') {
            throw new Error('Role enabled value must be boolean.');
        }
        const roleProfile = await getRoleProfile(roleId);
        return extensionManager.setRoleEnabled(extensionId, roleId, roleProfile.sessionPartition, enabled);
    });
    ipcMain.handle('extensions:load-for-role', async (event, roleId) => {
        assertTrustedSender(event);
        assertSafeIdentifier(roleId, 'Invalid role identifier.');
        const roleProfile = await getRoleProfile(roleId);
        return extensionManager.loadExtensionsForRole(roleId, roleProfile.sessionPartition);
    });
    ipcMain.handle('extensions:reload-for-role', async (event, extensionId, roleId) => {
        assertTrustedSender(event);
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        assertSafeIdentifier(roleId, 'Invalid role identifier.');
        const roleProfile = await getRoleProfile(roleId);
        return extensionManager.reloadExtensionForRole(extensionId, roleId, roleProfile.sessionPartition);
    });
    ipcMain.handle('extensions:open-folder', async (event, extensionId) => {
        assertTrustedSender(event);
        assertSafeIdentifier(extensionId, 'Invalid extension identifier.');
        await extensionManager.openExtensionFolder(extensionId);
    });
}
async function getRoleProfile(roleId) {
    const workspace = await (0, workspaceStore_js_1.loadWorkspace)();
    const roleProfile = workspace.roleProfiles.find((currentRoleProfile) => currentRoleProfile.id === roleId);
    if (!roleProfile) {
        throw new Error('Role profile is no longer available.');
    }
    return roleProfile;
}
function assertSafeIdentifier(value, message) {
    if (typeof value !== 'string' || !safeIdentifierPattern.test(value)) {
        throw new Error(message);
    }
}
//# sourceMappingURL=extension-ipc.js.map