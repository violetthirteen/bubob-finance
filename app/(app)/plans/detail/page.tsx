'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type PlanType = 'expense_limit' | 'saving_goal'

type Plan = {
  id: string
  name: string
  type: PlanType
  amount: number
  period: 'monthly'
  account_id: string | null
  category: string | null
  start_month: string // date
}

type Tx = {
  id: string
  type: 'income' | 'expense'
  amount: number
  occurred_at: string
  account_id: string | null
  category: string
  note: string | null
  photo_url?: string | null
}

function fmtRp(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}
function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n))
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function ymFromDate(dateStr: string) {
  return String(dateStr || '').slice(0, 7)
}

export default function PlanDetailPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const id = sp.get('id') || ''

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [plan, setPlan] = useState<Plan | null>(null)
  const [month, setMonth] = useState<string>('') // YYYY-MM
  const [txs, setTxs] = useState<Tx[]>([])

  const monthRange = useMemo(() => {
    if (!month) return null
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, (m || 1) - 1, 1)
    return {
      from: startOfMonth(d).toISOString(),
      to: endOfMonth(d).toISOString(),
    }
  }, [month])

  const stats = useMemo(() => {
    let spent = 0
    let income = 0
    for (const t of txs) {
      if (t.type === 'expense') spent += Number(t.amount || 0)
      if (t.type === 'income') income += Number(t.amount || 0)
    }
    return { spent, income, net: income - spent }
  }, [txs])

  const progress = useMemo(() => {
    if (!plan) return 0
    const denom = Number(plan.amount || 1)
    if (plan.type === 'expense_limit') return clamp(stats.spent / denom)
    return clamp(stats.net / denom)
  }, [plan, stats])

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

      const pRes = await supabase
        .from('plans')
        .select('id,name,type,amount,period,account_id,category,start_month')
        .eq('id', id)
        .single()

      if (pRes.error) {
        setPageError(pRes.error.message)
        setLoading(false)
        return
      }

      const p = pRes.data as Plan
      setPlan(p)
      setMonth(ymFromDate(p.start_month))
      setLoading(false)
    }

    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const run = async () => {
      if (!plan || !monthRange) return

      setPageError(null)

      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) return

      let q = supabase
        .from('transactions')
        .select('id,type,amount,occurred_at,account_id,category,note,photo_url')
        .eq('user_id', user.id)
        .gte('occurred_at', monthRange.from)
        .lte('occurred_at', monthRange.to)
        .order('occurred_at', { ascending: false })

      if (plan.account_id) q = q.eq('account_id', plan.account_id)
      if (plan.category) q = q.eq('category', plan.category)

      // buat saving_goal, bisa lo masukin semua tx (income+expense) biar net kebaca
      // buat expense_limit sebenernya cukup expense doang, tapi gapapa ambil dua2nya biar konsisten
      const res = await q

      if (res.error) {
        setPageError(res.error.message)
        return
      }

      setTxs((res.data ?? []) as Tx[])
    }

    run()
  }, [plan, monthRange])

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-6">
        <div className="mx-auto max-w-md text-sm text-[var(--color-muted)]">Loading...</div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen px-4 pt-6">
        <div className="mx-auto max-w-md text-sm text-[var(--color-danger)]">
          Plan tidak ketemu.
        </div>
      </div>
    )
  }

  const headLeft =
    plan.type === 'expense_limit'
      ? `${fmtRp(stats.spent)} / ${fmtRp(plan.amount)}`
      : `${fmtRp(stats.net)} / ${fmtRp(plan.amount)}`

  const status =
    plan.type === 'expense_limit'
      ? progress >= 1
        ? 'LEWAT'
        : progress >= 0.8
          ? 'HAMPIR'
          : 'AMAN'
      : progress >= 1
        ? 'TERCAPAI'
        : progress >= 0.8
          ? 'HAMPIR'
          : 'PROSES'

  return (
    <div className="min-h-screen px-4 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Plan Detail</h1>
          <Button variant="ghost" onClick={() => router.push('/plans')}>
            Back
          </Button>
        </div>

        <div className="mt-4 rounded-2xl bg-[var(--color-card)] shadow p-5 border border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">{plan.name}</div>
              <div className="text-xs text-[var(--color-muted)] mt-1">
                {plan.type === 'expense_limit' ? 'Budget Pengeluaran' : 'Target Nabung'} • Monthly
                {plan.account_id ? ' • (account filtered)' : ''}{plan.category ? ` • ${plan.category}` : ''}
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-900">{status}</div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm font-semibold">{headLeft}</div>
            <div className="text-xs text-[var(--color-muted)]">{Math.round(progress * 100)}%</div>
          </div>

          <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-slate-900" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>

          <div className="mt-4">
            <label className="block text-sm text-[var(--color-muted)] mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        {pageError && <div className="mt-4 text-sm text-[var(--color-danger)]">{pageError}</div>}

        <div className="mt-4 rounded-2xl bg-[var(--color-card)] shadow border border-slate-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-semibold">Transactions</div>
            <div className="text-xs text-[var(--color-muted)]">{txs.length} items</div>
          </div>

          {txs.length === 0 ? (
            <div className="p-5 text-sm text-[var(--color-muted)]">Belum ada transaksi match plan ini.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {txs.map((t) => (
                <div key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {t.type === 'expense' ? '-' : '+'} {fmtRp(t.amount)}
                      </div>
                      <div className="text-xs text-[var(--color-muted)] mt-1">
                        {new Date(t.occurred_at).toLocaleString('id-ID')} • {t.category}
                      </div>
                      {t.note && <div className="text-xs mt-1 text-slate-700">{t.note}</div>}
                    </div>

                    {/* kalau nanti foto udah balik, ini muncul */}
                    {t.photo_url ? (
                      <a
                        href={t.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-900 underline"
                      >
                        View
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={() => router.push(`/plans/edit?id=${encodeURIComponent(plan.id)}`)} full>
            Edit Plan
          </Button>
        </div>
      </div>
    </div>
  )
}
