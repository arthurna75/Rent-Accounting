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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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

const EMPTY_FORM: FormData = {
  code: '', name: '', account_type: '자산',
  account_subtype: '', normal_balance: '차변', description: '',
}

// ────────────────────────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────────────────────────
export function ChartOfAccountsClient({ initial }: { initial: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initial)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)   // null = 추가 모드
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // 계정유형 변경 시 잔액방향 자동 변경
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

  // ── 추가 다이얼로그 열기 ──
  function openAdd() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  // ── 편집 다이얼로그 열기 ──
  function openEdit(account: Account) {
    setEditId(account.id)
    setForm({
      code:            account.code,
      name:            account.name,
      account_type:    account.account_type,
      account_subtype: account.account_subtype ?? '',
      normal_balance:  account.normal_balance,
      description:     account.description ?? '',
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // ── 저장 (추가 or 편집) ──
  async function handleSave() {
    setSaving(true)
    setFormError(null)
    try {
      if (editId) {
        // 편집
        const res = await fetch(`/api/accounting/chart-of-accounts/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:            form.name,
            account_subtype: form.account_subtype,
            normal_balance:  form.normal_balance,
            description:     form.description,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setAccounts(prev => prev.map(a => a.id === editId ? json.data : a))
      } else {
        // 추가
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

  // ── 활성/비활성 토글 ──
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

  // ── 삭제 확인 ──
  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/accounting/chart-of-accounts/${deleteTarget.id}`, {
        method: 'DELETE',
      })
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
    <div className="space-y-6">
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
          <Plus className="w-4 h-4" />
          계정과목 추가
        </Button>
      </div>

      {/* 유형별 테이블 */}
      {ACCOUNT_TYPE_ORDER.map(type => {
        const list = g[type]
        if (list.length === 0) return null
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {type}
                <span className="text-xs font-normal text-gray-400">{list.length}개</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">코드</TableHead>
                    <TableHead>계정명</TableHead>
                    <TableHead className="hidden sm:table-cell">세부유형</TableHead>
                    <TableHead className="text-center w-20 hidden sm:table-cell">잔액방향</TableHead>
                    <TableHead className="text-center w-20">활성</TableHead>
                    <TableHead className="w-24 text-right pr-4">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map(account => (
                    <TableRow
                      key={account.id}
                      className={cn(!account.is_active && 'opacity-50')}
                    >
                      <TableCell className="font-mono text-sm">{account.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('font-medium', !account.is_active && 'line-through text-gray-400')}>
                            {account.name}
                          </span>
                          {account.is_system && (
                            <span title="시스템 계정">
                              <Lock className="w-3 h-3 text-gray-300 shrink-0" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 hidden sm:table-cell">
                        {account.account_subtype ?? '—'}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span className={cn(
                          'text-sm font-medium',
                          account.normal_balance === '차변' ? 'text-blue-600' : 'text-orange-500',
                        )}>
                          {account.normal_balance}
                        </span>
                      </TableCell>
                      {/* 활성 토글 */}
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggle(account)}
                          disabled={togglingId === account.id}
                          className={cn(
                            'text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:cursor-wait',
                            account.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                          )}
                        >
                          {account.is_active ? '활성' : '비활성'}
                        </button>
                      </TableCell>
                      {/* 편집 / 삭제 */}
                      <TableCell className="text-right pr-3">
                        <div className="flex items-center justify-end gap-1">
                          {!account.is_system && (
                            <>
                              <button
                                onClick={() => openEdit(account)}
                                className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="수정"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(account)}
                                className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}

      {/* ── 추가 / 편집 다이얼로그 ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? '계정과목 수정' : '계정과목 추가'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 코드 (추가 시에만 편집 가능) */}
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

            {/* 계정명 */}
            <div className="space-y-1.5">
              <Label>계정명 <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 기타비용"
              />
            </div>

            {/* 계정유형 (추가 시에만 편집) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>계정유형 <span className="text-red-500">*</span></Label>
                <Select
                  value={form.account_type}
                  onValueChange={v => setForm(f => ({
                    ...f,
                    account_type:    v as AccountType,
                    normal_balance:  DEFAULT_NORMAL[v as AccountType],
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

              {/* 잔액방향 */}
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

            {/* 세부유형 (datalist로 제안) */}
            <div className="space-y-1.5">
              <Label>세부유형</Label>
              <Input
                list={`subtype-list-${form.account_type}`}
                value={form.account_subtype}
                onChange={e => setForm(f => ({ ...f, account_subtype: e.target.value }))}
                placeholder="예: 영업비용"
              />
              <datalist id={`subtype-list-${form.account_type}`}>
                {SUBTYPES[form.account_type].map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {/* 설명 */}
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              취소
            </Button>
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
              <br />
              분개 내역에 사용된 경우 삭제가 거부됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
