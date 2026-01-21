'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Account = {
  id: string
  name: string
  type: string
  balance: number | string | null
}

type Tx = {
  id: string
  type: 'income' | 'expense' | string
  amount: number | string
  category: string
  note: string | null
  occurred_at?: string | null
  created_at: string
  account_id: string
}

function toNum(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function rupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

function normType(t: string) {
  const x = (t ?? '').toLowerCase()
  if (x.includes('cash')) return 'cash'
  if (x.includes('ewallet') || x.includes('e-wallet') || x.includes('wallet')) return 'ewallet'
  return 'other'
}

function fmtDateTimeID(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)

      const accRes = await supabase
        .from('accounts')
        .select('id,name,type,balance')
        .order('name')

      if (accRes.error) {
        setError(accRes.error.message)
        return
      }
      setAccounts((accRes.data ?? []) as Account[])

      const txRes = await supabase
        .from('transactions')
        .select('id,type,amount,category,note,occurred_at,created_at,account_id')
        .order('occurred_at', { ascending: false })
        .limit(8)

      if (txRes.error) {
        setError(txRes.error.message)
        return
      }
      setTxs((txRes.data ?? []) as Tx[])
    }

    load()
  }, [])

  const accountNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const a of accounts) m[a.id] = a.name
    return m
  }, [accounts])

  const totals = useMemo(() => {
    let total = 0
    let cash = 0
    let ewallet = 0

    for (const a of accounts) {
      const b = toNum(a.balance)
      total += b
      const t = normType(a.type)
      if (t === 'cash') cash += b
      else if (t === 'ewallet') ewallet += b
    }

    return { total, cash, ewallet }
  }, [accounts])

  const topAccounts = useMemo(() => {
    const sorted = [...accounts].sort((a, b) => toNum(b.balance) - toNum(a.balance))
    return sorted.slice(0, 3)
  }, [accounts])

  return (
    <div className="min-h-screen px-4 pt-6 pb-24 bg-slate-50">
      <div className="mx-auto max-w-md space-y-5">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">bubob finance</div>
            <h1 className="text-xl font-extrabold tracking-tight">Dashboard</h1>
          </div>

          {/* avatar dummy biar keliatan app */}
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center text-sm font-bold">
            BF
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* HERO NAVY GLOSSY */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
          {/* glossy blob */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-sky-400/10 blur-2xl" />

          <div className="text-xs opacity-80">Total saldo</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight">
            {rupiah(totals.total)}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
              <div className="text-[11px] opacity-80">Cash</div>
              <div className="mt-1 text-sm font-semibold">{rupiah(totals.cash)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
              <div className="text-[11px] opacity-80">E-Wallet</div>
              <div className="mt-1 text-sm font-semibold">{rupiah(totals.ewallet)}</div>
            </div>
          </div>
        </div>

        {/* ACCOUNTS MINI */}
        <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Top Accounts</div>
            <div className="text-xs text-slate-400">by saldo</div>
          </div>

          <div className="mt-4 space-y-3">
            {topAccounts.length === 0 ? (
              <div className="text-sm text-slate-400">Belum ada akun.</div>
            ) : (
              topAccounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-slate-500">{normType(a.type)}</div>
                  </div>
                  <div className="text-sm font-semibold">{rupiah(toNum(a.balance))}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RECENT */}
        <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Recent</div>
            <div className="text-xs text-slate-400">last 8</div>
          </div>

          <div className="mt-4 space-y-2">
            {txs.length === 0 ? (
              <div className="text-sm text-slate-400">Belum ada transaksi.</div>
            ) : (
              txs.map((t) => {
                const isExpense = String(t.type) === 'expense'
                const dt = t.occurred_at || t.created_at
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {t.category || (isExpense ? 'Expense' : 'Income')}
                        <span className="text-xs text-slate-400"> • {accountNameMap[t.account_id] ?? 'Unknown'}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{fmtDateTimeID(dt)}</div>
                      {t.note && (
                        <div className="mt-1 text-xs text-slate-400 truncate">{t.note}</div>
                      )}
                    </div>

                    <div className={`text-sm font-semibold whitespace-nowrap ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isExpense ? '-' : '+'}{rupiah(toNum(t.amount))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
