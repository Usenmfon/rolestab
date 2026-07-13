"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePlatform = normalizePlatform;
exports.normalizeArchitecture = normalizeArchitecture;
function normalizePlatform(platform) {
    switch (platform) {
        case 'win32':
            return 'windows';
        case 'darwin':
            return 'macos';
        case 'linux':
            return 'linux';
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
function normalizeArchitecture(architecture) {
    switch (architecture) {
        case 'x64':
            return 'x64';
        case 'arm64':
            return 'arm64';
        case 'ia32':
            return 'ia32';
        case 'universal':
            return 'universal';
        default:
            return 'unknown';
    }
}
//# sourceMappingURL=analytics-platform.js.map