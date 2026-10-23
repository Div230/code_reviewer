import type { ParsedDiff, ParsedDiffFile, ParsedDiffHunk, ParsedDiffLine } from '../types/review.js'

const hunkRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

function cleanPath(path: string) {
  return path.replace(/^a\//, '').replace(/^b\//, '').trim()
}

export class DiffService {
  parseUnifiedDiff(content: string): ParsedDiff {
    const files: ParsedDiffFile[] = []
    let currentFile: ParsedDiffFile | undefined
    let currentHunk: ParsedDiffHunk | undefined
    let oldLine = 0
    let newLine = 0

    for (const rawLine of content.split(/\r?\n/)) {
      if (rawLine.startsWith('diff --git ')) {
        const parts = rawLine.split(' ')
        const oldPath = cleanPath(parts[2] ?? '')
        const newPath = cleanPath(parts[3] ?? oldPath)
        currentFile = { oldPath, newPath, filePath: newPath || oldPath, hunks: [] }
        files.push(currentFile)
        currentHunk = undefined
        continue
      }

      if (rawLine.startsWith('--- ') && currentFile) {
        currentFile.oldPath = cleanPath(rawLine.slice(4))
        continue
      }

      if (rawLine.startsWith('+++ ') && currentFile) {
        currentFile.newPath = cleanPath(rawLine.slice(4))
        currentFile.filePath = currentFile.newPath === '/dev/null' ? currentFile.oldPath : currentFile.newPath
        continue
      }

      const hunkMatch = rawLine.match(hunkRegex)
      if (hunkMatch && currentFile) {
        oldLine = Number(hunkMatch[1])
        newLine = Number(hunkMatch[3])
        currentHunk = {
          oldStart: oldLine,
          oldLines: Number(hunkMatch[2] ?? 1),
          newStart: newLine,
          newLines: Number(hunkMatch[4] ?? 1),
          header: rawLine,
          lines: [],
        }
        currentFile.hunks.push(currentHunk)
        continue
      }

      if (!currentHunk) continue

      const marker = rawLine[0]
      const contentLine = rawLine.slice(1)
      let parsedLine: ParsedDiffLine | undefined

      if (marker === '+') {
        parsedLine = { kind: 'add', content: contentLine, newLineNumber: newLine++ }
      } else if (marker === '-') {
        parsedLine = { kind: 'delete', content: contentLine, oldLineNumber: oldLine++ }
      } else if (marker === ' ') {
        parsedLine = { kind: 'context', content: contentLine, oldLineNumber: oldLine++, newLineNumber: newLine++ }
      }

      if (parsedLine) currentHunk.lines.push(parsedLine)
    }

    return { files }
  }

  normalizeForPrompt(inputType: 'CODE' | 'DIFF' | 'FILE', content: string) {
    if (inputType !== 'DIFF') return content
    const parsed = this.parseUnifiedDiff(content)
    return JSON.stringify(parsed, null, 2)
  }
}
