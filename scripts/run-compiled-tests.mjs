import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve('.test-dist/test')
const testFiles = await collectTests(root)

if (testFiles.length === 0) {
  throw new Error(`No compiled test files found under ${root}.`)
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
})

if (result.error !== undefined) {
  throw result.error
}

process.exitCode = result.status ?? 1

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectTests(entryPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.test.js')) {
      files.push(entryPath)
    }
  }

  return files.sort()
}
