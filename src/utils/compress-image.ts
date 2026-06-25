// Downscale + re-encode an image in the browser before upload.
// Keeps storage/egress small; no server cost. Falls back to the original on any failure.
export async function compressImage(file: File, maxEdge = 1800, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const url = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    URL.revokeObjectURL(url)

    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', quality))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}
