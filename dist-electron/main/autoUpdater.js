"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpdateStatus = getUpdateStatus;
exports.initAutoUpdater = initAutoUpdater;
exports.checkForUpdates = checkForUpdates;
exports.quitAndInstall = quitAndInstall;
const electron_1 = __importDefault(require("electron"));
const electron_updater_1 = require("electron-updater");
const errorLogger_js_1 = require("./errorLogger.js");
const update_js_1 = require("../shared/update.js");
const { app, BrowserWindow } = electron_1.default;
let currentStatus = { state: 'idle' };
let statusWindow = null;
let listenersBound = false;
function getUpdateStatus() {
    return currentStatus;
}
function setStatus(status) {
    currentStatus = status;
    if (statusWindow && !statusWindow.isDestroyed()) {
        statusWindow.webContents.send(update_js_1.updateStatusChannel, status);
    }
}
function updatesSupported() {
    if (!app.isPackaged) {
        return { supported: false, reason: 'Updates are only available in the installed app.' };
    }
    if (process.platform === 'darwin') {
        return { supported: false, reason: 'Automatic updates are not yet available on macOS.' };
    }
    return { supported: true, reason: '' };
}
function bindListeners() {
    if (listenersBound) {
        return;
    }
    listenersBound = true;
    electron_updater_1.autoUpdater.autoDownload = true;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    electron_updater_1.autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }));
    electron_updater_1.autoUpdater.on('update-available', (info) => setStatus({ state: 'available', version: info.version }));
    electron_updater_1.autoUpdater.on('update-not-available', (info) => setStatus({ state: 'not-available', version: info.version }));
    electron_updater_1.autoUpdater.on('download-progress', (progress) => setStatus({ state: 'downloading', percent: Math.round(progress.percent) }));
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'downloaded', version: info.version }));
    electron_updater_1.autoUpdater.on('error', (error) => {
        setStatus({ state: 'error', message: error.message });
        void (0, errorLogger_js_1.logInternalError)({ scope: 'auto-updater', message: error.message, stack: error.stack });
    });
}
/**
 * Wire the window that should receive status updates and kick off a background
 * check on launch. Silent on platforms/builds where updates are unsupported.
 */
function initAutoUpdater(window) {
    statusWindow = window;
    const support = updatesSupported();
    if (!support.supported) {
        setStatus({ state: 'unsupported', reason: support.reason });
        return;
    }
    bindListeners();
    void electron_updater_1.autoUpdater.checkForUpdates().catch(() => {
        // Failures are surfaced through the 'error' event handler.
    });
}
/** Triggered by the renderer's "Check for updates" button. */
async function checkForUpdates() {
    const support = updatesSupported();
    if (!support.supported) {
        setStatus({ state: 'unsupported', reason: support.reason });
        return currentStatus;
    }
    bindListeners();
    try {
        await electron_updater_1.autoUpdater.checkForUpdates();
    }
    catch {
        // Failures are surfaced through the 'error' event handler.
    }
    return currentStatus;
}
function quitAndInstall() {
    if (currentStatus.state !== 'downloaded') {
        return;
    }
    electron_updater_1.autoUpdater.quitAndInstall();
}
//# sourceMappingURL=autoUpdater.js.map