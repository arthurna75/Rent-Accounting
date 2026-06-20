/**
 * 파일 업로드 API
 * POST /api/upload
 * FormData: file (이미지 또는 문서)
 * 반환: { url: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'attachments'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) return NextResponse.json({ error: '파일 크기는 20MB 이하여야 합니다.' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const safeName = `${profile.organization_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  // 버킷이 없으면 생성 시도 (이미 있으면 무시됨)
  await supabase.storage.createBucket(BUCKET, { public: true })

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(safeName, file, { upsert: false, contentType: file.type || 'application/octet-stream' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json() as { url?: string }
  if (!url) return NextResponse.json({ error: 'url 필드가 필요합니다.' }, { status: 400 })

  // URL에서 파일 경로 추출 (버킷명 이후)
  const bucketPrefix = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(bucketPrefix)
  if (idx === -1) return NextResponse.json({ error: '잘못된 URL입니다.' }, { status: 400 })
  const path = decodeURIComponent(url.slice(idx + bucketPrefix.length))

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
