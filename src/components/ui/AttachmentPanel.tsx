'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, X, FileText, ImageIcon, Plus, Loader2 } from 'lucide-react'

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(url)
}

async function resizeImage(file: File, maxWidth = 800): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const ratio = img.width > maxWidth ? maxWidth / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', 0.85,
        )
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

interface Props {
  urls: string[]
  onChange: (urls: string[]) => void
  onError?: (msg: string) => void
}

export function AttachmentPanel({ urls, onChange, onError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    const newUrls: string[] = []
    try {
      for (const raw of files) {
        const file = await resizeImage(raw, 800)
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '업로드 실패')
        newUrls.push(json.url)
      }
      onChange([...urls, ...newUrls])
    } catch (err) {
      onError?.(err instanceof Error ? err.message : '파일 업로드 실패')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeAttachment(url: string) {
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    } catch {
      // 무시
    }
    onChange(urls.filter(u => u !== url))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">첨부 파일</span>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              업로드 중...
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="w-4 h-4" />
            파일 추가
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {urls.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400 cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-6 h-6" />
          <p className="text-xs">이미지(가로 800px 자동조정) 또는 문서 첨부</p>
          <p className="text-xs text-gray-300">JPG · PNG · PDF · HWP · DOC · XLS 등</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {urls.map((url, i) => (
            <div key={i} className="relative group rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              {isImageUrl(url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`첨부 ${i + 1}`} className="w-full h-24 object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-24 gap-1 text-gray-400">
                  <FileText className="w-8 h-8" />
                  <span className="text-xs truncate px-2">{url.split('/').pop()?.split('_').pop()}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(url)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                title="삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {isImageUrl(url) && (
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-black/40 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImageIcon className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          ))}
          <div
            className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-300 hover:text-blue-400 text-gray-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">추가</span>
          </div>
        </div>
      )}
    </div>
  )
}
