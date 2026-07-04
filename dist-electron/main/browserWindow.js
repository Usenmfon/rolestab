"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppWindow = createAppWindow;
const electron_1 = __importDefault(require("electron"));
const node_path_1 = __importDefault(require("node:path"));
const { app, BrowserWindow } = electron_1.default;
const { shell } = electron_1.default;
const currentDirectory = __dirname;
const rendererDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
const rendererIndexPath = node_path_1.default.join(currentDirectory, '../../dist/index.html');
const preloadPath = node_path_1.default.join(currentDirectory, '../preload/index.js');
const appIconPath = app.isPackaged
    ? node_path_1.default.join(currentDirectory, '../../dist/favicon.ico')
    : node_path_1.default.join(currentDirectory, '../../public/favicon.ico');
function isSafeExternalUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function isExpectedAppUrl(url) {
    if (app.isPackaged) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'file:' && node_path_1.default.normalize(parsed.pathname).endsWith(node_path_1.default.normalize('/dist/index.html'));
        }
        catch {
            return false;
        }
    }
    try {
        const parsedUrl = new URL(url);
        const expectedUrl = new URL(rendererDevServerUrl);
        return parsedUrl.origin === expectedUrl.origin;
    }
    catch {
        return false;
    }
}
function createAppWindow() {
    const window = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 980,
        minHeight: 640,
        show: false,
        title: 'RolesTab',
        icon: appIconPath,
        backgroundColor: '#f5f7fb',
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
    });
    window.once('ready-to-show', () => {
        window.show();
    });
    window.webContents.setWindowOpenHandler(({ url }) => {
        if (isSafeExternalUrl(url)) {
            void shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
        if (!isExpectedAppUrl(url)) {
            event.preventDefault();
        }
    });
    if (app.isPackaged) {
        void window.loadFile(rendererIndexPath);
    }
    else {
        void window.loadURL(rendererDevServerUrl);
        window.webContents.openDevTools({ mode: 'detach' });
    }
    return window;
}
//# sourceMappingURL=browserWindow.js.map