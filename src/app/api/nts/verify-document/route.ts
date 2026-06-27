import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyTaxInvoice, verifyCashReceipt } from '@/lib/nts-api'

const BodySchema = z.object({
  journal_entry_id: z.string().uuid('전표 ID가 올바르지 않습니다.'),
  approval_number: z.string().min(1, '승인번호를 입력하세요.'),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { journal_entry_id, approval_number } = parsed.data

  // 전표 조회 (조직 소속 확인 + evidence_type + vendor 정보)
  // 조직 권한 확인을 먼저 수행
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (profile.role === 'viewer') {
    return NextResponse.json({ error: '조회 권한만 있습니다.' }, { status: 403 })
  }

  const { data: entry, error: entryErr } = await supabase
    .from('journal_entries')
    .select('id, organization_id, evidence_type, vendor_id')
    .eq('id', journal_entry_id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (entryErr || !entry) {
    return NextResponse.json({ error: '전표를 찾을 수 없습니다.' }, { status: 404 })
  }

  // vendor의 사업자번호 별도 조회
  let supplierBizNo = ''
  if (entry.vendor_id) {
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_number')
      .eq('id', entry.vendor_id as string)
      .single()
    supplierBizNo = vendor?.business_number ?? ''
  }

  const evidenceType = entry.evidence_type as string | null

  let result
  if (evidenceType === '세금계산서') {
    result = await verifyTaxInvoice({
      approvalNo: approval_number,
      supplierBizNo,
    })
  } else if (evidenceType === '현금영수증') {
    result = await verifyCashReceipt({ approvalNo: approval_number })
  } else {
    return NextResponse.json(
      { error: '세금계산서 또는 현금영수증 유형의 전표에서만 사용 가능합니다.' },
      { status: 400 }
    )
  }

  // 검증 결과를 DB에 저장
  const { error: updateErr } = await supabase
    .from('journal_entries')
    .update({
      nts_approval_number: approval_number,
      nts_verified: result.verified,
      nts_verified_at: result.verified ? new Date().toISOString() : null,
      nts_verification_result: result as unknown as Record<string, unknown>,
    })
    .eq('id', journal_entry_id)

  if (updateErr) {
    return NextResponse.json({ error: '검증 결과 저장 실패: ' + updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ...result, approval_number })
}
