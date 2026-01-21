'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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
  start_month: string
  created_at: string
}

type Account = {
  id: string
  name: string
  type: string
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function clamp(n: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, n))
}
function fmtRp(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

export default function PlansPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [plans, setPlans] = useState<Plan[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const monthRange = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, (m || 1) - 1, 1)
    return {
      from: startOfMonth(d).toISOString(),
      to: endOfMonth(d).toISOString(),
    }
  }, [month])

  const [stats, setStats] = useState<
    Record<string, { spent: number; income: number; net: number }>
  >({})

  useEffect(() => {
    const boot = async () => {
      setPageError(null)
      setLoading(true)

      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) {
        setPageError(userErr.message)
        setLoading(false)
        return
      }
      if (!userRes?.user) {
        router.replace('/login')
        return
      }

      const [plansRes, accRes] = await Promise.all([
        supabase
          .from('plans')
          .select('id,user_id,name,type,amount,period,account_id,category,start_month,created_at')
          .order('created_at', { ascending: false }),
        supabase.from('accounts').select('id,name,type').order('name', { ascending: true }),
      ])

      if (plansRes.error) {
        setPageError(plansRes.error.message)
        setLoading(false)
        return
      }
      if (accRes.error) {
        setPageError(accRes.error.message)
        setLoading(false)
        return
      }

      setPlans((plansRes.data ?? []) as Plan[])
      setAccounts((accRes.data ?? []) as Account[])
      setLoading(false)
    }

    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!plans.length) {
        setStats({})
        return
      }

      setPageError(null)

      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) return

      const txRes = await supabase
        .from('transactions')
        .select('type,amount,occurred_at,account_id,category')
        .eq('user_id', user.id)
        .gte('occurred_at', monthRange.from)
        .lte('occurred_at', monthRange.to)

      if (txRes.error) {
        setPageError(txRes.error.message)
        return
      }

      const txs = txRes.data ?? []

      const next: Record<string, { spent: number; income: number; net: number }> = {}

      for (const p of plans) {
        let spent = 0
        let income = 0

        for (const t of txs as any[]) {
          if (p.account_id && t.account_id !== p.account_id) continue
          if (p.category && (t.category ?? null) !== p.category) continue

          const amt = Number(t.amount || 0)
          if (t.type === 'expense') spent += amt
          if (t.type === 'income') income += amt
        }

        next[p.id] = { spent, income, net: income - spent }
      }

      setStats(next)
    }

    run()
  }, [plans, monthRange])

  const accountLabel = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, `${a.name} (${a.type})`]))
    return (id: string | null) => (id ? map.get(id) ?? 'Unknown Account' : 'All Accounts')
  }, [accounts])

  const statusLabel = (p: Plan, s: { spent: number; income: number; net: number }) => {
    if (p.type === 'expense_limit') {
      const ratio = p.amount ? s.spent / p.amount : 0
      if (ratio >= 1) return { text: 'Lewat', cls: 'text-[var(--color-danger)]' }
      if (ratio >= 0.8) return { text: 'Hampir lewat', cls: 'text-amber-600' }
      return { text: 'Aman', cls: 'text-emerald-600' }
    } else {
      const ratio = p.amount ? s.net / p.amount : 0
      if (ratio >= 1) return { text: 'Tercapai', cls: 'text-emerald-600' }
      if (ratio >= 0.8) return { text: 'Hampir', cls: 'text-amber-600' }
      return { text: 'Proses', cls: 'text-[var(--color-muted)]' }
    }
  }

  const progressValue = (p: Plan, s: { spent: number; income: number; net: number }) => {
    if (p.type === 'expense_limit') return clamp(s.spent / Number(p.amount || 1))
    return clamp(s.net / Number(p.amount || 1))
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Plans</h1>
          <Button onClick={() => router.push('/plans/add')}>+ Add</Button>
        </div>

        <div className="mt-3">
          <label className="block text-sm text-[var(--color-muted)] mb-1">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </div>

        {pageError && <div className="mt-4 text-sm text-[var(--color-danger)]">{pageError}</div>}

        {loading ? (
          <div className="mt-6 text-sm text-[var(--color-muted)]">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-[var(--color-muted)]">
            Belum ada plan. Klik <b>+ Add</b>.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {plans.map((p) => {
              const s = stats[p.id] ?? { spent: 0, income: 0, net: 0 }
              const prog = progressValue(p, s)
              const st = statusLabel(p, s)

              const leftText =
                p.type === 'expense_limit'
                  ? `${fmtRp(s.spent)} / ${fmtRp(p.amount)}`
                  : `${fmtRp(s.net)} / ${fmtRp(p.amount)}`

              const sub =
                p.type === 'expense_limit'
                  ? `Budget bulanan • ${accountLabel(p.account_id)}${p.category ? ` • ${p.category}` : ''}`
                  : `Target nabung • ${accountLabel(p.account_id)}${p.category ? ` • ${p.category}` : ''}`

              // ✅ warning hanya untuk expense_limit
              const warnRatio = p.amount
                ? (p.type === 'expense_limit' ? s.spent / p.amount : s.net / p.amount)
                : 0
              const showWarn = p.type === 'expense_limit' && warnRatio >= 0.8

              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-[var(--color-card)] shadow p-5 border border-slate-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{p.name}</div>
                      <div className="text-xs text-[var(--color-muted)] mt-1">{sub}</div>
                    </div>
                    <div className={`text-xs font-semibold ${st.cls}`}>{st.text}</div>
                  </div>

                  {showWarn && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {warnRatio >= 1
                        ? 'Budget lo udah LEWAT.'
                        : `Budget lo udah ${Math.round(warnRatio * 100)}%. Hati-hati kebablasan.`}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">{leftText}</div>
                    <div className="text-xs text-[var(--color-muted)]">{Math.round(prog * 100)}%</div>
                  </div>

                  <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-slate-900"
                      style={{ width: `${Math.round(prog * 100)}%` }}
                    />
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/plans/edit?id=${encodeURIComponent(p.id)}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/plans/detail?id=${encodeURIComponent(p.id)}`)}
                    >
                      Detail
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
