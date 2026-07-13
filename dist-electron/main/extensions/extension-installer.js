"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareManagedExtensionDirectory = prepareManagedExtensionDirectory;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const extension_persistence_js_1 = require("./extension-persistence.js");
const extension_manifest_validator_js_1 = require("./extension-manifest-validator.js");
async function prepareManagedExtensionDirectory(sourcePath, internalId) {
    const resolvedSourcePath = node_path_1.default.resolve(sourcePath);
    const sourceStats = await (0, promises_1.lstat)(resolvedSourcePath);
    if (!sourceStats.isDirectory()) {
        throw new Error('Choose a folder that contains an unpacked extension.');
    }
    if (sourceStats.isSymbolicLink()) {
        throw new Error('Symbolic links cannot be installed as extension folders.');
    }
    await assertDirectoryHasNoSymlinks(resolvedSourcePath, resolvedSourcePath);
    const validation = await (0, extension_manifest_validator_js_1.validateExtensionManifest)(resolvedSourcePath);
    if (!validation.valid || !validation.manifest) {
        throw new Error(validation.errors[0] ?? 'Choose a valid unpacked Chromium extension folder.');
    }
    const destinationPath = node_path_1.default.join((0, extension_persistence_js_1.getManagedExtensionsDirectory)(), internalId);
    if (!(0, extension_persistence_js_1.isPathInsideManagedDirectory)(destinationPath)) {
        throw new Error('Extension destination is outside the managed extensions directory.');
    }
    await (0, promises_1.mkdir)((0, extension_persistence_js_1.getManagedExtensionsDirectory)(), { recursive: true });
    await (0, promises_1.rm)(destinationPath, { recursive: true, force: true });
    await (0, promises_1.cp)(resolvedSourcePath, destinationPath, {
        recursive: true,
        dereference: false,
        errorOnExist: false,
        force: true,
    });
    return {
        destinationPath,
        manifest: validation.manifest,
        warnings: validation.warnings,
    };
}
async function assertDirectoryHasNoSymlinks(directoryPath, rootPath) {
    const entries = await (0, promises_1.readdir)(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = node_path_1.default.join(directoryPath, entry.name);
        const entryStats = await (0, promises_1.lstat)(entryPath);
        if (entryStats.isSymbolicLink()) {
            throw new Error('Extension folders containing symbolic links cannot be installed.');
        }
        if (entryStats.isDirectory()) {
            const resolvedEntryPath = node_path_1.default.resolve(entryPath);
            if (!isPathInsideRoot(rootPath, resolvedEntryPath)) {
                throw new Error('Extension folder contains a path outside the selected directory.');
            }
            await assertDirectoryHasNoSymlinks(resolvedEntryPath, rootPath);
        }
    }
}
function isPathInsideRoot(rootPath, candidatePath) {
    const relativePath = node_path_1.default.relative(node_path_1.default.resolve(rootPath), node_path_1.default.resolve(candidatePath));
    return Boolean(relativePath) && !relativePath.startsWith('..') && !node_path_1.default.isAbsolute(relativePath);
}
//# sourceMappingURL=extension-installer.js.map