'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, X, FileText, Plus, Loader2, Download, ExternalLink, ZoomIn } from 'lucide-react'

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(url)
}

function fileName(url: string) {
  return decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '파일').replace(/^\d+_/, '')
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

async function downloadFile(url: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName(url)
    a.click()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    window.open(url, '_blank')
  }
}

interface Props {
  urls: string[]
  onChange: (urls: string[]) => void
  onError?: (msg: string) => void
  readOnly?: boolean
}

export function AttachmentPanel({ urls, onChange, onError, readOnly = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

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
    } catch { /* 무시 */ }
    onChange(urls.filter(u => u !== url))
  }

  function openFile(url: string) {
    if (isImageUrl(url)) {
      setLightbox(url)
    } else {
      window.open(url, '_blank', 'noopener')
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">첨부 파일</span>
          <div className="flex items-center gap-2">
            {uploading && (
              <span className="flex items-center gap-1 text-xs text-blue-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />업로드 중...
              </span>
            )}
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="w-4 h-4" />파일 추가
              </Button>
            )}
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
          readOnly ? (
            <p className="text-xs text-gray-400 py-4 text-center">첨부 파일 없음</p>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-8 text-gray-400 cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-6 h-6" />
              <p className="text-xs">이미지(가로 800px 자동조정) 또는 문서 첨부</p>
              <p className="text-xs text-gray-300">JPG · PNG · PDF · HWP · DOC · XLS 등</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {urls.map((url, i) => (
              <div
                key={i}
                className="relative group rounded-lg border border-gray-200 overflow-hidden bg-gray-50 cursor-pointer"
                onClick={() => openFile(url)}
                title={fileName(url)}
              >
                {isImageUrl(url) ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`첨부 ${i + 1}`} className="w-full h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 gap-1 text-gray-400 group-hover:text-blue-500 transition-colors">
                    <FileText className="w-8 h-8" />
                    <span className="text-xs truncate px-2 max-w-full">{fileName(url)}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}

                {/* 삭제 버튼 */}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeAttachment(url) }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                    title="삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* 추가 버튼 */}
            {!readOnly && (
              <div
                className="flex flex-col items-center justify-center gap-1 h-24 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-300 hover:text-blue-400 text-gray-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs">추가</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 이미지 라이트박스 ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative flex flex-col items-center gap-4 p-4 max-w-5xl w-full max-h-[95vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* 닫기 */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 이미지 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="첨부 파일 원본"
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />

            {/* 파일명 + 버튼 */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-sm text-white/70 truncate max-w-xs">{fileName(lightbox)}</span>
              <button
                onClick={() => window.open(lightbox, '_blank', 'noopener')}
                className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors"
              >
                <ExternalLink className="w-4 h-4" />새 탭에서 보기
              </button>
              <button
                onClick={() => downloadFile(lightbox)}
                className="flex items-center gap-1.5 text-sm text-white font-medium bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
