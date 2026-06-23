'use client'

import { useState, useEffect } from 'react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountType, NormalBalance } from '@/types/database'

// ────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────
export interface Account {
  id: string
  code: string
  name: string
  account_type: AccountType
  account_subtype: string | null
  normal_balance: NormalBalance
  is_system: boolean
  is_active: boolean
  description: string | null
}

interface FormData {
  code: string
  name: string
  account_type: AccountType
  account_subtype: string
  normal_balance: NormalBalance
  description: string
}

// ────────────────────────────────────────────────────────────
// 상수
// ────────────────────────────────────────────────────────────
const ACCOUNT_TYPE_ORDER: AccountType[] = ['자산', '부채', '자본', '수익', '비용']

const SUBTYPES: Record<AccountType, string[]> = {
  자산: ['유동자산', '비유동자산'],
  부채: ['유동부채', '비유동부채'],
  자본: ['자본금', '이익잉여금'],
  수익: ['영업수익', '영업외수익'],
  비용: ['영업비용', '영업외비용', '세금과공과', '일반관리비'],
}

const DEFAULT_NORMAL: Record<AccountType, NormalBalance> = {
  자산: '차변', 비용: '차변',
  부채: '대변', 자본: '대변', 수익: '대변',
}

const TYPE_BADGE: Record<AccountType, string> = {
  자산: 'bg-blue-50 text-blue-700',
  부채: 'bg-orange-50 text-orange-700',
  자본: 'bg-purple-50 text-purple-700',
  수익: 'bg-green-50 text-green-700',
  비용: 'bg-red-50 text-red-700',
}

const EMPTY_FORM: FormData = {
  code: '', name: '', account_type: '자산',
  account_subtype: '', normal_balance: '차변', description: '',
}

// ────────────────────────────────────────────────────────────
// T계정 한 쪽 목록 서브컴포넌트
// ────────────────────────────────────────────────────────────
interface SideProps {
  groups: { type: AccountType; accounts: Account[] }[]
  onEdit: (a: Account) => void
  onDelete: (a: Account) => void
  onToggle: (a: Account) => void
  togglingId: string | null
}

function TAccountSide({ groups, onEdit, onDelete, onToggle, togglingId }: SideProps) {
  return (
    <div className="divide-y divide-gray-100">
      {groups.map(({ type, accounts }) => (
        <div key={type}>
          {/* 유형 소헤더 */}
          <div className={cn('px-4 py-1.5 text-xs font-semibold flex items-center gap-2', TYPE_BADGE[type])}>
            {type}
            <span className="font-normal text-gray-400 ml-auto">{accounts.length}개</span>
          </div>

          {accounts.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-300">등록된 계정 없음</p>
          ) : (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-50">
                {accounts.map(acc => (
                  <tr
                    key={acc.id}
                    className={cn('hover:bg-gray-50/60 transition-colors', !acc.is_active && 'opacity-50')}
                  >
                    {/* 코드 */}
                    <td className="px-3 py-2 font-mono text-gray-400 w-12 shrink-0 whitespace-nowrap">
                      {acc.code}
                    </td>
                    {/* 계정명 + 세부유형 */}
                    <td className="px-2 py-2 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          'font-medium text-gray-800 truncate',
                          !acc.is_active && 'line-through text-gray-400',
                        )}>
                          {acc.name}
                        </span>
                        {acc.is_system && (
                          <span title="시스템 계정"><Lock className="w-3 h-3 text-gray-300 shrink-0" /></span>
                        )}
                      </div>
                      {acc.account_subtype && (
                        <span className="text-[10px] text-gray-400">{acc.account_subtype}</span>
                      )}
                    </td>
                    {/* 활성 토글 + 관리 */}
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onToggle(acc)}
                          disabled={togglingId === acc.id}
                          className={cn(
                            'text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors disabled:cursor-wait',
                            acc.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                          )}
                        >
                          {acc.is_active ? '활성' : '비활성'}
                        </button>
                        {!acc.is_system && (
                          <>
                            <button
                              onClick={() => onEdit(acc)}
                              className="p-1 rounded text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="수정"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDelete(acc)}
                              className="p-1 rounded text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// T계정 레이아웃 카드
// ────────────────────────────────────────────────────────────
function TAccountCard({
  title,
  debitLabel, debitGroups,
  creditLabel, creditGroups,
  onEdit, onDelete, onToggle, togglingId,
}: {
  title: string
  debitLabel: string
  debitGroups: { type: AccountType; accounts: Account[] }[]
  creditLabel: string
  creditGroups: { type: AccountType; accounts: Account[] }[]
  onEdit: (a: Account) => void
  onDelete: (a: Account) => void
  onToggle: (a: Account) => void
  togglingId: string | null
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-1">
        <div className="mx-4 mb-4 rounded-lg border border-gray-200 overflow-hidden">
          {/* T계정 헤더 */}
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="px-4 py-2 bg-blue-50 text-sm font-bold text-blue-700">
              차변 (Debit) · {debitLabel}
            </div>
            <div className="px-4 py-2 bg-red-50 text-sm font-bold text-red-700">
              대변 (Credit) · {creditLabel}
            </div>
          </div>

          {/* 양쪽 내용 */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-gray-100 border-t border-gray-100">
            <TAccountSide
              groups={debitGroups}
              onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} togglingId={togglingId}
            />
            <TAccountSide
              groups={creditGroups}
              onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} togglingId={togglingId}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────
export function ChartOfAccountsClient({ initial }: { initial: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initial)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!editId) {
      setForm(f => ({ ...f, normal_balance: DEFAULT_NORMAL[f.account_type] }))
    }
  }, [form.account_type, editId])

  function grouped() {
    const g: Record<AccountType, Account[]> = { 자산: [], 부채: [], 자본: [], 수익: [], 비용: [] }
    for (const a of accounts) g[a.account_type].push(a)
    return g
  }

  function openAdd() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(null); setDialogOpen(true)
  }
  function openEdit(account: Account) {
    setEditId(account.id)
    setForm({
      code: account.code, name: account.name,
      account_type: account.account_type,
      account_subtype: account.account_subtype ?? '',
      normal_balance: account.normal_balance,
      description: account.description ?? '',
    })
    setFormError(null); setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true); setFormError(null)
    try {
      if (editId) {
        const res = await fetch(`/api/accounting/chart-of-accounts/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name, account_subtype: form.account_subtype,
            normal_balance: form.normal_balance, description: form.description,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setAccounts(prev => prev.map(a => a.id === editId ? json.data : a))
      } else {
        const res = await fetch('/api/accounting/chart-of-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setAccounts(prev => [...prev, json.data].sort((a, b) => a.code.localeCompare(b.code)))
      }
      setDialogOpen(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(account: Account) {
    setTogglingId(account.id)
    try {
      const res = await fetch(`/api/accounting/chart-of-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !account.is_active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAccounts(prev => prev.map(a => a.id === account.id ? json.data : a))
    } catch (e) {
      alert(e instanceof Error ? e.message : '변경에 실패했습니다.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/accounting/chart-of-accounts/${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const g = grouped()

  return (
    <div className="space-y-5">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">계정과목</h2>
          <p className="text-sm text-gray-500 mt-1">
            계정과목을 추가·수정·삭제하거나 활성 여부를 설정합니다.
            <span className="ml-2 text-xs text-amber-600">
              <Lock className="inline w-3 h-3 mr-0.5" />시스템 계정은 활성/비활성만 변경 가능합니다.
            </span>
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="w-4 h-4" />계정과목 추가
        </Button>
      </div>

      {/* ── 재무상태표 (대차대조표) ── */}
      <TAccountCard
        title="재무상태표 (대차대조표)"
        debitLabel="자산"
        debitGroups={[{ type: '자산', accounts: g['자산'] }]}
        creditLabel="부채 / 자본"
        creditGroups={[
          { type: '부채', accounts: g['부채'] },
          { type: '자본', accounts: g['자본'] },
        ]}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onToggle={handleToggle}
        togglingId={togglingId}
      />

      {/* ── 손익계산서 ── */}
      <TAccountCard
        title="손익계산서"
        debitLabel="비용"
        debitGroups={[{ type: '비용', accounts: g['비용'] }]}
        creditLabel="수익"
        creditGroups={[{ type: '수익', accounts: g['수익'] }]}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onToggle={handleToggle}
        togglingId={togglingId}
      />

      {/* ── 추가 / 편집 다이얼로그 ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? '계정과목 수정' : '계정과목 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>계정코드 <span className="text-red-500">*</span></Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="예: 701"
                disabled={!!editId}
                className={cn(editId && 'bg-gray-50')}
              />
              {editId && <p className="text-xs text-gray-400">코드는 변경할 수 없습니다.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>계정명 <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 기타비용"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>계정유형 <span className="text-red-500">*</span></Label>
                <Select
                  value={form.account_type}
                  onValueChange={v => setForm(f => ({
                    ...f,
                    account_type: v as AccountType,
                    normal_balance: DEFAULT_NORMAL[v as AccountType],
                    account_subtype: '',
                  }))}
                  disabled={!!editId}
                >
                  <SelectTrigger className={cn(editId && 'bg-gray-50')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPE_ORDER.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>잔액방향 <span className="text-red-500">*</span></Label>
                <Select
                  value={form.normal_balance}
                  onValueChange={v => setForm(f => ({ ...f, normal_balance: v as NormalBalance }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="차변">차변</SelectItem>
                    <SelectItem value="대변">대변</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>세부유형</Label>
              <Input
                list={`subtype-list-${form.account_type}`}
                value={form.account_subtype}
                onChange={e => setForm(f => ({ ...f, account_subtype: e.target.value }))}
                placeholder="예: 영업비용"
              />
              <datalist id={`subtype-list-${form.account_type}`}>
                {SUBTYPES[form.account_type].map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>설명</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="선택사항"
                rows={2}
                className="resize-none"
              />
            </div>
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : editId ? '수정 저장' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 삭제 확인 다이얼로그 ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>계정과목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.code} — {deleteTarget?.name}</strong> 계정과목을 삭제합니다.
              <br />분개 내역에 사용된 경우 삭제가 거부됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
