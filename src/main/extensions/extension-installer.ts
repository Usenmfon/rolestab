import { cp, lstat, mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import type { ExtensionManifest } from '../../shared/extensions.js'
import { getManagedExtensionsDirectory, isPathInsideManagedDirectory } from './extension-persistence.js'
import { validateExtensionManifest } from './extension-manifest-validator.js'

export async function prepareManagedExtensionDirectory(sourcePath: string, internalId: string): Promise<{
  destinationPath: string
  manifest: ExtensionManifest
  warnings: string[]
}> {
  const resolvedSourcePath = path.resolve(sourcePath)
  const sourceStats = await lstat(resolvedSourcePath)

  if (!sourceStats.isDirectory()) {
    throw new Error('Choose a folder that contains an unpacked extension.')
  }

  if (sourceStats.isSymbolicLink()) {
    throw new Error('Symbolic links cannot be installed as extension folders.')
  }

  await assertDirectoryHasNoSymlinks(resolvedSourcePath, resolvedSourcePath)

  const validation = await validateExtensionManifest(resolvedSourcePath)

  if (!validation.valid || !validation.manifest) {
    throw new Error(validation.errors[0] ?? 'Choose a valid unpacked Chromium extension folder.')
  }

  const destinationPath = path.join(getManagedExtensionsDirectory(), internalId)

  if (!isPathInsideManagedDirectory(destinationPath)) {
    throw new Error('Extension destination is outside the managed extensions directory.')
  }

  await mkdir(getManagedExtensionsDirectory(), { recursive: true })
  await rm(destinationPath, { recursive: true, force: true })
  await cp(resolvedSourcePath, destinationPath, {
    recursive: true,
    dereference: false,
    errorOnExist: false,
    force: true,
  })

  return {
    destinationPath,
    manifest: validation.manifest,
    warnings: validation.warnings,
  }
}

async function assertDirectoryHasNoSymlinks(directoryPath: string, rootPath: string): Promise<void> {
  const entries = await readdir(directoryPath, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name)
    const entryStats = await lstat(entryPath)

    if (entryStats.isSymbolicLink()) {
      throw new Error('Extension folders containing symbolic links cannot be installed.')
    }

    if (entryStats.isDirectory()) {
      const resolvedEntryPath = path.resolve(entryPath)

      if (!isPathInsideRoot(rootPath, resolvedEntryPath)) {
        throw new Error('Extension folder contains a path outside the selected directory.')
      }

      await assertDirectoryHasNoSymlinks(resolvedEntryPath, rootPath)
    }
  }
}

function isPathInsideRoot(rootPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(path.resolve(rootPath), path.resolve(candidatePath))
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}
