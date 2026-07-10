import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const packageLockPath = path.join(projectRoot, 'package-lock.json')
const changelogPath = path.join(projectRoot, 'CHANGELOG.md')

const [bumpArg = 'patch', ...noteParts] = process.argv.slice(2)
const releaseNote = noteParts.join(' ').trim()

try {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
  const currentVersion = packageJson.version

  if (typeof currentVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(currentVersion)) {
    throw new Error(`Expected a semantic version in package.json, received: ${currentVersion}`)
  }

  const nextVersion = resolveNextVersion(currentVersion, bumpArg)
  const today = new Date().toISOString().slice(0, 10)
  const releaseTitle = `## [${nextVersion}] - ${today}`
  const changelogSections = buildChangelogSections({
    currentVersion,
    nextVersion,
    releaseNote,
  })

  await fs.writeFile(
    packageJsonPath,
    `${JSON.stringify({ ...packageJson, version: nextVersion }, null, 2)}\n`,
    'utf8',
  )

  const packageLockText = await fs.readFile(packageLockPath, 'utf8')
  const updatedPackageLockText = replaceRootVersion(packageLockText, currentVersion, nextVersion)
  await fs.writeFile(packageLockPath, updatedPackageLockText, 'utf8')

  const changelogText = await fs.readFile(changelogPath, 'utf8')
  const updatedChangelogText = updateChangelog(changelogText, releaseTitle, changelogSections, nextVersion, currentVersion)
  await fs.writeFile(changelogPath, updatedChangelogText, 'utf8')

  console.log(`Prepared release ${nextVersion}.`)
  console.log('Updated package.json, package-lock.json, and CHANGELOG.md.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

function resolveNextVersion(currentVersion, bumpArg) {
  if (/^\d+\.\d+\.\d+$/.test(bumpArg)) {
    return bumpArg
  }

  if (!['patch', 'minor', 'major'].includes(bumpArg)) {
    throw new Error(
      `Expected a semver bump (patch, minor, major) or an explicit version, received: ${bumpArg}`,
    )
  }

  const [major, minor, patch] = currentVersion.split('.').map(Number)

  if (bumpArg === 'major') {
    return `${major + 1}.0.0`
  }

  if (bumpArg === 'minor') {
    return `${major}.${minor + 1}.0`
  }

  return `${major}.${minor}.${patch + 1}`
}

function buildChangelogSections({ currentVersion, nextVersion, releaseNote }) {
  const messages = releaseNote
    ? [releaseNote]
    : getCommitSubjectsSinceLatestTag(currentVersion)

  const groupedMessages = groupMessages(messages)
  const sections = []

  for (const [sectionTitle, entries] of groupedMessages) {
    if (entries.length === 0) {
      continue
    }

    sections.push(`### ${sectionTitle}`)
    sections.push('')

    for (const entry of entries) {
      sections.push(`- ${entry}`)
    }

    sections.push('')
  }

  if (sections.length === 0) {
    sections.push('### Changed', '', `- Prepared release ${nextVersion}.`, '')
  }

  return sections.join('\n').trimEnd()
}

function groupMessages(messages) {
  const sections = new Map([
    ['Added', []],
    ['Changed', []],
    ['Fixed', []],
    ['Removed', []],
  ])

  for (const message of messages) {
    const { sectionTitle, summary } = categorizeMessage(message)
    sections.get(sectionTitle)?.push(summary)
  }

  return sections
}

function categorizeMessage(message) {
  const trimmedMessage = message.trim()
  const conventionalMatch = trimmedMessage.match(/^([a-z]+)(\([^)]+\))?:\s*(.+)$/i)

  if (!conventionalMatch) {
    return { sectionTitle: 'Changed', summary: trimmedMessage }
  }

  const type = conventionalMatch[1].toLowerCase()
  const summary = conventionalMatch[3].trim()

  if (type === 'feat') {
    return { sectionTitle: 'Added', summary }
  }

  if (type === 'fix') {
    return { sectionTitle: 'Fixed', summary }
  }

  if (type === 'remove' || type === 'revert') {
    return { sectionTitle: 'Removed', summary }
  }

  return { sectionTitle: 'Changed', summary }
}

function getCommitSubjectsSinceLatestTag(currentVersion) {
  const tagName = findLatestReleaseTag(currentVersion)

  if (!tagName) {
    return []
  }

  try {
    const output = runGit(['log', '--pretty=format:%s', `${tagName}..HEAD`]).trim()

    return output ? output.split(/\r?\n/).filter(Boolean) : []
  } catch {
    return []
  }
}

function findLatestReleaseTag(currentVersion) {
  const candidateTags = [`v${currentVersion}`, currentVersion]

  for (const tag of candidateTags) {
    try {
      runGit(['rev-parse', '--verify', tag])
      return tag
    } catch {
      // Try the next tag candidate.
    }
  }

  try {
    return runGit(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*']).trim()
  } catch {
    return null
  }
}

function replaceRootVersion(lockfileText, currentVersion, nextVersion) {
  let replacements = 0

  return lockfileText.replace(/"version":\s*"([^"]+)"/g, (match, version) => {
    if (version !== currentVersion || replacements >= 2) {
      return match
    }

    replacements += 1
    return `"version": "${nextVersion}"`
  })
}

function updateChangelog(changelogText, releaseTitle, releaseSections, nextVersion, currentVersion) {
  const lineBreak = changelogText.includes('\r\n') ? '\r\n' : '\n'
  const lines = changelogText.split(/\r?\n/)
  const releaseLines = [releaseTitle, '', ...releaseSections.split(/\r?\n/), '']
  const versionReference = `[${nextVersion}]: https://github.com/Usenmfon/rolestab/compare/v${currentVersion}...v${nextVersion}`
  const releaseSectionIndex = lines.findIndex((line) => line.startsWith('## ['))
  const referenceIndex = lines.findIndex(
    (line) => line.startsWith('[') && line.includes(`https://github.com/Usenmfon/rolestab/`),
  )
  const nextLines = [...lines]

  if (releaseSectionIndex >= 0) {
    nextLines.splice(releaseSectionIndex, 0, ...releaseLines)
  } else {
    nextLines.push('', ...releaseLines)
  }

  if (referenceIndex >= 0) {
    const adjustedReferenceIndex = referenceIndex + (releaseSectionIndex >= 0 ? releaseLines.length : releaseLines.length + 1)
    nextLines.splice(adjustedReferenceIndex, 0, versionReference)
  } else {
    nextLines.push('', versionReference)
  }

  return `${nextLines.join(lineBreak)}${lineBreak}`
}

function runGit(args) {
  return execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}
