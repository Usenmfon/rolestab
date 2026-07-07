const defaultRepository = 'Usenmfon/rolestab'
const repository = process.argv[2] ?? process.env.GITHUB_REPOSITORY ?? defaultRepository
const token = process.env.GITHUB_TOKEN

if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
  console.error(`Expected repository as owner/name, received: ${repository}`)
  process.exit(1)
}

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'rolestab-release-downloads',
  'X-GitHub-Api-Version': '2022-11-28',
}

if (token) {
  headers.Authorization = `Bearer ${token}`
}

async function fetchJson(url) {
  const response = await fetch(url, { headers })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`GitHub API request failed (${response.status}): ${message}`)
  }

  return response.json()
}

async function getReleases() {
  const releases = []
  let page = 1

  while (true) {
    const url = `https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`
    const batch = await fetchJson(url)

    releases.push(...batch)

    if (batch.length < 100) {
      return releases
    }

    page += 1
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

function printRelease(release) {
  const assets = release.assets ?? []
  const totalDownloads = assets.reduce((total, asset) => total + asset.download_count, 0)

  console.log(`${release.tag_name} - ${formatNumber(totalDownloads)} downloads`)

  if (release.name && release.name !== release.tag_name) {
    console.log(`  ${release.name}`)
  }

  for (const asset of assets) {
    console.log(`  ${formatNumber(asset.download_count).padStart(8)}  ${asset.name}`)
  }

  console.log('')
}

try {
  const releases = await getReleases()

  if (releases.length === 0) {
    console.log(`No GitHub Releases found for ${repository}.`)
    process.exit(0)
  }

  const totalDownloads = releases.reduce((total, release) => {
    return total + (release.assets ?? []).reduce((assetTotal, asset) => assetTotal + asset.download_count, 0)
  }, 0)

  console.log(`${repository} release downloads`)
  console.log(`${formatNumber(totalDownloads)} total downloads across ${releases.length} releases`)
  console.log('')

  for (const release of releases) {
    printRelease(release)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
