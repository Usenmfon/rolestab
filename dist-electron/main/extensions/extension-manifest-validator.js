"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExtensionManifest = validateExtensionManifest;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const extension_compatibility_js_1 = require("./extension-compatibility.js");
async function validateExtensionManifest(extensionDirectory) {
    const errors = [];
    const warnings = [];
    const manifestPath = node_path_1.default.join(extensionDirectory, 'manifest.json');
    try {
        const directoryStats = await (0, promises_1.stat)(extensionDirectory);
        if (!directoryStats.isDirectory()) {
            return invalidResult(['Choose a folder that contains an unpacked Chromium extension.'], warnings);
        }
        await (0, promises_1.access)(extensionDirectory);
    }
    catch {
        return invalidResult(['Extension folder does not exist or is not readable.'], warnings);
    }
    let rawManifest;
    try {
        rawManifest = await (0, promises_1.readFile)(manifestPath, 'utf8');
    }
    catch {
        return invalidResult(['manifest.json was not found in the selected folder.'], warnings);
    }
    let parsed;
    try {
        parsed = JSON.parse(rawManifest);
    }
    catch {
        return invalidResult(['manifest.json is not valid JSON.'], warnings);
    }
    if (typeof parsed.name !== 'string' || parsed.name.trim().length === 0) {
        errors.push('manifest.json must include a non-empty name.');
    }
    if (typeof parsed.version !== 'string' || parsed.version.trim().length === 0) {
        errors.push('manifest.json must include a non-empty version.');
    }
    if (typeof parsed.manifest_version !== 'number') {
        errors.push('manifest.json must include a numeric manifest_version.');
    }
    const manifest = toExtensionManifest(parsed);
    if (manifest.background && typeof manifest.background !== 'object') {
        errors.push('manifest.json background must be an object when provided.');
    }
    const iconErrors = await validateIcons(extensionDirectory, manifest.icons);
    errors.push(...iconErrors);
    const compatibility = (0, extension_compatibility_js_1.determineExtensionCompatibility)(manifest);
    warnings.push(...compatibility.warnings);
    errors.push(...compatibility.errors);
    return {
        valid: errors.length === 0,
        manifest: errors.length === 0 ? manifest : undefined,
        warnings,
        errors,
        compatibility: compatibility.compatibility,
    };
}
function invalidResult(errors, warnings) {
    return {
        valid: false,
        warnings,
        errors,
        compatibility: 'unsupported',
    };
}
function toExtensionManifest(parsed) {
    return {
        manifest_version: typeof parsed.manifest_version === 'number' ? parsed.manifest_version : 0,
        name: typeof parsed.name === 'string' ? parsed.name : '',
        version: typeof parsed.version === 'string' ? parsed.version : '',
        description: typeof parsed.description === 'string' ? parsed.description : undefined,
        icons: isStringRecord(parsed.icons) ? parsed.icons : undefined,
        permissions: toStringArray(parsed.permissions),
        host_permissions: toStringArray(parsed.host_permissions),
        optional_permissions: toStringArray(parsed.optional_permissions),
        background: parsed.background,
        action: toActionMetadata(parsed.action),
        browser_action: toActionMetadata(parsed.browser_action),
        page_action: toActionMetadata(parsed.page_action),
    };
}
async function validateIcons(extensionDirectory, icons) {
    if (!icons) {
        return [];
    }
    const errors = [];
    for (const [size, iconPath] of Object.entries(icons)) {
        if (!/^\d+$/.test(size) || !iconPath || node_path_1.default.isAbsolute(iconPath) || iconPath.includes('..')) {
            errors.push(`Icon "${size}" must reference a relative file inside the extension folder.`);
            continue;
        }
        const absoluteIconPath = node_path_1.default.resolve(extensionDirectory, iconPath);
        if (!isPathInside(extensionDirectory, absoluteIconPath)) {
            errors.push(`Icon "${size}" points outside the extension folder.`);
            continue;
        }
        try {
            const iconStats = await (0, promises_1.stat)(absoluteIconPath);
            if (!iconStats.isFile()) {
                errors.push(`Icon "${size}" does not point to a file.`);
            }
        }
        catch {
            errors.push(`Icon "${size}" file is missing.`);
        }
    }
    return errors;
}
function isStringRecord(value) {
    return (typeof value === 'object' &&
        value !== null &&
        Object.entries(value).every(([key, recordValue]) => typeof key === 'string' && typeof recordValue === 'string'));
}
function toActionMetadata(value) {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }
    const record = value;
    const defaultIcon = record.default_icon;
    return {
        defaultTitle: typeof record.default_title === 'string' ? record.default_title : undefined,
        defaultPopup: typeof record.default_popup === 'string' ? record.default_popup : undefined,
        defaultIcon: typeof defaultIcon === 'string' || isStringRecord(defaultIcon) ? defaultIcon : undefined,
    };
}
function toStringArray(value) {
    return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : undefined;
}
function isPathInside(parentPath, childPath) {
    const relativePath = node_path_1.default.relative(node_path_1.default.resolve(parentPath), node_path_1.default.resolve(childPath));
    return Boolean(relativePath) && !relativePath.startsWith('..') && !node_path_1.default.isAbsolute(relativePath);
}
//# sourceMappingURL=extension-manifest-validator.js.map