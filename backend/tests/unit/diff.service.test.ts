import { describe, expect, it } from 'vitest'
import { DiffService } from '../../src/services/diff.service.js'

describe('DiffService', () => {
  it('parses additions, deletions, hunks, multiple files, and line numbers', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 const a = 1
-const b = 2
+const b = 3
+const c = 4
 done()
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts
@@ -10,2 +10,2 @@
-old()
+new()`

    const parsed = new DiffService().parseUnifiedDiff(diff)

    expect(parsed.files).toHaveLength(2)
    expect(parsed.files[0].filePath).toBe('src/a.ts')
    expect(parsed.files[0].hunks[0].lines.map((line) => line.kind)).toEqual(['context', 'delete', 'add', 'add', 'context'])
    expect(parsed.files[0].hunks[0].lines[1].oldLineNumber).toBe(2)
    expect(parsed.files[0].hunks[0].lines[2].newLineNumber).toBe(2)
    expect(parsed.files[1].hunks[0].oldStart).toBe(10)
  })
})
