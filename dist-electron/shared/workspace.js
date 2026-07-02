"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAppSettings = exports.defaultKeyboardShortcuts = exports.defaultRoleColors = void 0;
exports.defaultRoleColors = ['#2563eb', '#059669', '#f59e0b', '#e11d48', '#7c3aed', '#0891b2'];
exports.defaultKeyboardShortcuts = {
    newTab: 'Ctrl+T',
    closeTab: 'Ctrl+W',
    reload: 'Ctrl+R',
    focusUrlBar: 'Ctrl+L',
    openDevTools: 'Ctrl+Shift+I',
    nextTab: 'Ctrl+Tab',
    previousTab: 'Ctrl+Shift+Tab',
    openAllRoles: 'Ctrl+Shift+O',
    clearActiveRoleSession: 'Ctrl+Shift+Backspace',
};
exports.defaultAppSettings = {
    restoreTabsOnStartup: true,
    confirmBeforeClearingSessions: true,
    defaultHomepage: '',
    theme: 'system',
    defaultProjectId: null,
    defaultRoleColors: exports.defaultRoleColors,
    keyboardShortcuts: exports.defaultKeyboardShortcuts,
};
//# sourceMappingURL=workspace.js.map