export type ParsedDiffLine = {
  kind: 'add' | 'delete' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export type ParsedDiffHunk = {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: ParsedDiffLine[]
}

export type ParsedDiffFile = {
  oldPath: string
  newPath: string
  filePath: string
  hunks: ParsedDiffHunk[]
}

export type ParsedDiff = {
  files: ParsedDiffFile[]
}
