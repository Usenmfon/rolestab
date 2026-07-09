"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTitleBarTheme = applyTitleBarTheme;
exports.createAppWindow = createAppWindow;
const electron_1 = __importDefault(require("electron"));
const node_path_1 = __importDefault(require("node:path"));
const { app, BrowserWindow } = electron_1.default;
const { shell } = electron_1.default;
const currentDirectory = __dirname;
const rendererDevServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5174';
const rendererIndexPath = node_path_1.default.join(currentDirectory, '../../dist/index.html');
const preloadPath = node_path_1.default.join(currentDirectory, '../preload/index.js');
const appIconPath = app.isPackaged
    ? node_path_1.default.join(currentDirectory, '../../dist/favicon.ico')
    : node_path_1.default.join(currentDirectory, '../../public/favicon.ico');
const titleBarThemes = {
    light: {
        color: '#e8eaed',
        symbolColor: '#334155',
    },
    dark: {
        color: '#111827',
        symbolColor: '#e2e8f0',
    },
};
function applyTitleBarTheme(window, theme) {
    window.setTitleBarOverlay({
        ...titleBarThemes[theme],
        height: 40,
    });
    window.setBackgroundColor(theme === 'dark' ? '#0f172a' : '#f5f7fb');
}
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
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            ...titleBarThemes.light,
            height: 40,
        },
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
    window.setMenuBarVisibility(false);
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