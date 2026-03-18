import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function getBuildDate(): string {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseGitStatusLines(): string[] {
  const output = execSync('git status --porcelain', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return output
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean)
}

function extractPathFromStatusLine(line: string): string | null {
  // Examples:
  //  " M content/articles/a.md"
  //  "M  content/articles/a.md"
  //  "A  content/articles/a.md"
  //  "R  content/articles/old.md -> content/articles/new.md"
  //  "R  content/articles/old.md -> \"content/articles/new name.md\""

  const afterStatus = line.slice(3).trim()
  if (!afterStatus) return null

  // rename
  const arrowIdx = afterStatus.indexOf('->')
  const rawPath = arrowIdx >= 0 ? afterStatus.slice(arrowIdx + 2).trim() : afterStatus

  // unquote if quoted
  const unquoted = rawPath.startsWith('"') && rawPath.endsWith('"') ? rawPath.slice(1, -1) : rawPath
  return unquoted
}

function isTargetArticleMarkdown(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/').toLowerCase()
  return normalized.startsWith('content/articles/') && normalized.endsWith('.md')
}

function updateFrontmatterUpdatedInPlace(fileContent: string, updated: string): { next: string; changed: boolean } {
  if (!fileContent.startsWith('---')) {
    return { next: fileContent, changed: false }
  }

  const lines = fileContent.split(/\r?\n/)
  // Find closing '---' for the first frontmatter block
  let endIdx = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i
      break
    }
  }
  if (endIdx === -1) {
    return { next: fileContent, changed: false }
  }

  // Search updated: line inside frontmatter
  let updatedLineIdx = -1
  for (let i = 1; i < endIdx; i++) {
    if (/^updated\s*:\s*/.test(lines[i])) {
      updatedLineIdx = i
      break
    }
  }

  const newLine = `updated: ${updated}`

  if (updatedLineIdx >= 0) {
    if (lines[updatedLineIdx] === newLine) {
      return { next: fileContent, changed: false }
    }
    lines[updatedLineIdx] = newLine
  } else {
    // Insert near the end of frontmatter, before closing ---
    lines.splice(endIdx, 0, newLine)
  }

  return {
    next: lines.join('\n'),
    changed: true,
  }
}

async function main() {
  const buildDate = getBuildDate()

  const statusLines = parseGitStatusLines()
  const relPaths = statusLines
    .map(extractPathFromStatusLine)
    .filter((p): p is string => !!p)
    .filter(isTargetArticleMarkdown)

  const uniqueRelPaths = Array.from(new Set(relPaths))

  if (uniqueRelPaths.length === 0) {
    console.log('ℹ️  No changed article markdown files found under content/articles/. Skip updating frontmatter.updated.')
    return
  }

  console.log(`🕒 Build date: ${buildDate}`)
  console.log(`📝 Updating frontmatter.updated for ${uniqueRelPaths.length} changed article(s)...`)

  let updatedCount = 0
  let skippedCount = 0

  for (const relPath of uniqueRelPaths) {
    const absPath = path.resolve(process.cwd(), relPath)

    if (!fs.existsSync(absPath)) {
      skippedCount++
      console.warn(`⚠️  Skip (not found): ${relPath}`)
      continue
    }

    const content = fs.readFileSync(absPath, 'utf8')
    const { next, changed } = updateFrontmatterUpdatedInPlace(content, buildDate)

    if (!changed) {
      skippedCount++
      console.log(`  ⏭️  No change needed: ${relPath}`)
      continue
    }

    fs.writeFileSync(absPath, next, 'utf8')
    updatedCount++
    console.log(`  ✅ Updated: ${relPath}`)
  }

  console.log(`\n✅ Done. Updated: ${updatedCount}, Skipped: ${skippedCount}`)
}

main().catch((err) => {
  console.error('❌ Failed to update frontmatter.updated:', err)
  process.exit(1)
})
