export const previewMaxBytes = 5 * 1024 * 1024
export const previewMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const

type PreviewMime = typeof previewMimeTypes[number]
export type PreviewExtension = 'jpg' | 'png' | 'webp'
type FileResult =
  | { success: true; file: File; contentType: PreviewMime; extension: PreviewExtension }
  | { success: false; message: string }

export function previewFileError(file: File): string | null {
  if (file.size === 0) return 'Choose a non-empty preview image.'
  if (file.size > previewMaxBytes) return 'Preview image must be 5 MB or smaller.'
  const extensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'],
  }
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
  if (!extensions[file.type]?.includes(extension)) return 'Choose a JPEG, PNG or WebP image.'
  return null
}

export async function validatePreviewFile(input: unknown): Promise<FileResult> {
  if (!(input instanceof File)) return { success: false, message: 'Choose a JPEG, PNG or WebP image.' }
  const error = previewFileError(input)
  if (error) return { success: false, message: error }
  try {
    const head = new Uint8Array(await input.slice(0, 32).arrayBuffer())
    const tail = new Uint8Array(await input.slice(-2).arrayBuffer())
    const isJpeg = head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
      && tail[0] === 0xff && tail[1] === 0xd9
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
    const isPng = input.size >= 33 && pngSignature.every((byte, index) => head[index] === byte)
      && head[8] === 0 && head[9] === 0 && head[10] === 0 && head[11] === 13
      && String.fromCharCode(...head.slice(12, 16)) === 'IHDR'
    const isWebp = head.length >= 20 && String.fromCharCode(...head.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...head.slice(8, 12)) === 'WEBP'
      && ['VP8 ', 'VP8L', 'VP8X'].includes(String.fromCharCode(...head.slice(12, 16)))
      && new DataView(head.buffer).getUint32(4, true) + 8 === input.size
    const contentType = input.type as PreviewMime
    const matches = contentType === 'image/jpeg' ? isJpeg : contentType === 'image/png' ? isPng : isWebp
    if (!matches) return { success: false, message: 'The file content must match its JPEG, PNG or WebP format.' }
    return { success: true, file: input, contentType, extension: contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : 'webp' }
  } catch {
    return { success: false, message: 'Unable to read the preview image. Choose the file again.' }
  }
}
