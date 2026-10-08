// Browser-local presentation utility, shared safely with the public demo.
export interface PendingPreview { file: File; src: string }

export class PendingPreviewFiles {
  selection: PendingPreview | null = null
  revision = 0
  private urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
  constructor(urls: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL) { this.urls = urls }
  invalidate() { this.revision++ }
  replace(file: File | null) {
    // Allocate before releasing the prior image; a failed allocation leaves
    // the previous preview usable. No file/blob URL enters the text draft.
    const next = file ? { file, src: this.urls.createObjectURL(file) } : null
    if (this.selection) this.urls.revokeObjectURL(this.selection.src)
    this.selection = next
    this.revision++
    return next
  }
  dispose() { if (this.selection) this.urls.revokeObjectURL(this.selection.src); this.selection = null; this.revision++ }
}
