'use client'

import { useState, useTransition } from 'react'
import { ImageUploader } from '@/components/image-uploader'
import { saveThumbnail } from './project-actions'

export function ProjectThumbnail({
  projectId,
  thumbnailUrl,
  canManage,
}: {
  projectId: string
  thumbnailUrl: string | null
  canManage: boolean
}) {
  const [url, setUrl] = useState(thumbnailUrl)
  const [, startTransition] = useTransition()

  function handleUploaded(newUrl: string) {
    setUrl(newUrl)
    startTransition(() => { saveThumbnail(projectId, newUrl) })
  }

  if (!canManage && !url) return null

  return (
    <div className="glass p-6 rounded-2xl border-border/50 mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Thumbnail</h3>
      {canManage ? (
        <ImageUploader
          folder="project-thumbnails"
          currentUrl={url}
          onUploaded={handleUploaded}
          shape="wide"
          placeholder="Upload project thumbnail"
        />
      ) : url ? (
        <img src={url} alt="Project thumbnail" className="w-full h-48 object-cover rounded-xl" />
      ) : null}
    </div>
  )
}
