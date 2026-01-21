'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type PlanType = 'expense_limit' | 'saving_goal'

type Plan = {
  id: string
  user_id: string
  name: string
  type: PlanType
  amount: number
  period: 'monthly'
  account_id: string | null
  category: string | null
  start_month: string // date
  created_at: string
}

type Account = { id: string; name: string; type: string }

function toYM(dateStr: string) {
  // "YYYY-MM-01" -> "YYYY-MM"
  return String(dateStr || '').slice(0, 7)
}
function monthStartISO(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function EditPlanPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const id = sp.get('id') || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)

  const [type, setType] = useState<PlanType>('expense_limit')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [accountId, setAccountId] = useState<string>('') // '' = all
  const [category, setCategory] = useState<string>('') // '' = all

  const amountNumber = useMemo(() => {
    const n = Number(String(amount).replace(/[^\d]/g, ''))
    return Number.isFinite(n) ? n : 0
  }, [amount])

  useEffect(() => {
    const boot = async () => {
      setPageError(null)
      setLoading(true)

      const { data: userRes } = await supabase.auth.getUser()
      if (!userRes?.user) {
        router.replace('/login')
        return
      }
      if (!id) {
        setPageError('ID plan kosong.')
        setLoading(false)
        return
      }

      const [pRes, aRes] = await Promise.all([
        supabase
          .from('plans')
          .select('id,user_id,name,type,amount,period,account_id,category,start_month,created_at')
          .eq('id', id)
          .single(),
        supabase.from('accounts').select('id,name,type').order('name'),
      ])

      if (pRes.error) {
        setPageError(pRes.error.message)
        setLoading(false)
        return
      }
      if (aRes.error) {
        setPageError(aRes.error.message)
        setLoading(false)
        return
      }

      const p = pRes.data as Plan
      setPlan(p)
      setAccounts((aRes.data ?? []) as Account[])

      setType(p.type)
      setName(p.name)
      setAmount(String(p.amount ?? ''))
      setMonth(toYM(p.start_month))
      setAccountId(p.account_id ?? '')
      setCategory(p.category ?? '')

      setLoading(false)
    }

    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setPageError(null)

    try {
      if (!plan) throw new Error('Plan belum keload.')
      if (!name.trim()) throw new Error('Nama plan wajib diisi.')
      if (!amountNumber || amountNumber <= 0) throw new Error('Target amount harus > 0.')

      const { data: userRes } = await supabase.auth.getUser()
      if (!userRes?.user) throw new Error('Session hilang. Login ulang.')

      const payload = {
        name: name.trim(),
        type,
        amount: amountNumber,
        period: 'monthly',
        start_month: monthStartISO(month),
        account_id: accountId || null,
        category: category.trim() ? category.trim() : null,
      }

      const { error } = await supabase.from('plans').update(payload).eq('id', plan.id)
      if (error) throw error

      router.push('/plans')
    } catch (err: any) {
      setPageError(err?.message ?? 'Gagal update plan.')
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!plan) return
    const ok = confirm(`Yakin delete plan: "${plan.name}"?`)
    if (!ok) return

    setDeleting(true)
    setPageError(null)

    try {
      const { error } = await supabase.from('plans').delete().eq('id', plan.id)
      if (error) throw error
      router.push('/plans')
    } catch (err: any) {
      setPageError(err?.message ?? 'Gagal delete plan.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-6">
        <div className="mx-auto max-w-md text-sm text-[var(--color-muted)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-24">
      <div className="mx-auto max-w-md bg-[var(--color-card)] rounded-2xl shadow p-5 border border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Edit Plan</h1>
          <Button variant="ghost" onClick={() => router.push('/plans')}>
            Back
          </Button>
        </div>

        {pageError && <div className="mt-4 text-sm text-[var(--color-danger)]">{pageError}</div>}

        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PlanType)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="expense_limit">Budget Pengeluaran (Limit)</option>
              <option value="saving_goal">Target Nabung (Goal)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Target Amount</label>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Account (optional)</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Category (optional)</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="kosongin kalau mau semua kategori"
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="lg" full disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>

          <div className="pt-2">
            <Button variant="danger" full disabled={deleting} onClick={del} type="button">
              {deleting ? 'Deleting...' : 'Delete Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
