'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import TransactionDetailSheet from '@/components/tx/TransactionDetailSheet'

type TxType = 'income' | 'expense'

type TxRow = {
  id: string
  user_id: string
  type: TxType
  amount: number
  category: string
  note: string | null
  occurred_at: string
  created_at?: string | null
  account_id: string | null
  photo_url?: string | null
  receipt_url?: string | null
}

type Account = { id: string; name: string; type: string }

function fmtRp(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

// ✅ paksa timezone Jakarta biar gak geser
const TZ = 'Asia/Jakarta'

function fmtDateTimeID(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function fmtDateKey(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

// ✅ bikin batas filter dari input date TANPA geser timezone
// trick: kita bikin ISO UTC dari tanggal lokal yang lo mau (range inclusive)
function dayStartIso(dateStr: string) {
  // dateStr: YYYY-MM-DD -> 00:00:00 UTC (biar aman)
  return `${dateStr}T00:00:00.000Z`
}
function dayEndIso(dateStr: string) {
  // dateStr: YYYY-MM-DD -> 23:59:59.999 UTC
  return `${dateStr}T23:59:59.999Z`
}

export default function HistoryPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, `${a.name} (${a.type})`])),
    [accounts]
  )

  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | TxType>('all')

  const [from, setFrom] = useState<string>('') // YYYY-MM-DD
  const [to, setTo] = useState<string>('') // YYYY-MM-DD

  const [txs, setTxs] = useState<TxRow[]>([])
  const [selected, setSelected] = useState<TxRow | null>(null)

  // deep link: /history?id=...
  useEffect(() => {
    const id = sp.get('id')
    if (!id) return
    const found = txs.find((t) => t.id === id)
    if (found) setSelected(found)
  }, [sp, txs])

  useEffect(() => {
    const boot = async () => {
      setLoading(true)
      setPageError(null)

      const { data: userRes } = await supabase.auth.getUser()
      if (!userRes?.user) {
        router.replace('/login')
        return
      }

      const accRes = await supabase
        .from('accounts')
        .select('id,name,type')
        .order('name', { ascending: true })

      if (accRes.error) {
        setPageError(accRes.error.message)
        setLoading(false)
        return
      }

      setAccounts((accRes.data ?? []) as Account[])
      setLoading(false)
    }

    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadTx = async () => {
    setPageError(null)
    setLoading(true)

    try {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) {
        router.replace('/login')
        return
      }

      let query = supabase
        .from('transactions')
        .select(
          'id,user_id,type,amount,category,note,occurred_at,account_id,photo_url,receipt_url,created_at'
        )
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false })
        .limit(500)

      if (type !== 'all') query = query.eq('type', type)

      // ✅ date filter inclusive, gak pake new Date().toISOString() biar gak geser
      if (from) query = query.gte('occurred_at', dayStartIso(from))
      if (to) query = query.lte('occurred_at', dayEndIso(to))

      // search: category + note (OR)
      const qq = q.trim()
      if (qq) {
        const safe = qq.replace(/%/g, '\\%').replace(/_/g, '\\_')
        query = query.or(`category.ilike.%${safe}%,note.ilike.%${safe}%`)
      }

      const res = await query
      if (res.error) throw res.error

      setTxs((res.data ?? []) as TxRow[])
    } catch (e: any) {
      setPageError(e?.message ?? 'Gagal load history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      loadTx()
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, from, to])

  const grouped = useMemo(() => {
    const map = new Map<string, TxRow[]>()
    for (const t of txs) {
      const key = fmtDateKey(t.occurred_at)
      const arr = map.get(key) ?? []
      arr.push(t)
      map.set(key, arr)
    }
    return Array.from(map.entries())
  }, [txs])

  return (
    <div className="min-h-screen px-4 pt-6 pb-24">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">History</h1>
          <Button variant="ghost" onClick={() => router.push('/add')}>
            + Add
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 rounded-2xl bg-[var(--color-card)] border border-slate-100 shadow p-4 space-y-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari: jajan / niflix / transport / dll…"
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />

          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="all">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>

            <Button
              variant="ghost"
              onClick={() => {
                setQ('')
                setType('all')
                setFrom('')
                setTo('')
              }}
            >
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[var(--color-muted)] mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-muted)] mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        </div>

        {pageError && <div className="mt-4 text-sm text-[var(--color-danger)]">{pageError}</div>}

        {/* List */}
        {loading ? (
          <div className="mt-6 text-sm text-[var(--color-muted)]">Loading...</div>
        ) : txs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-[var(--color-muted)]">
            Belum ada transaksi yang cocok.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="text-xs font-semibold text-[var(--color-muted)] mb-2">
                  {dateLabel}
                </div>

                <div className="space-y-2">
                  {items.map((t) => {
                    const isIncome = t.type === 'income'
                    const accLabel = t.account_id
                      ? accountMap.get(t.account_id) ?? 'Unknown Account'
                      : 'All Accounts'

                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelected(t)}
                        className="w-full text-left rounded-2xl bg-[var(--color-card)] border border-slate-100 shadow p-4 active:scale-[0.99] transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">
                              {t.category || (isIncome ? 'Income' : 'Expense')}
                            </div>
                            <div className="mt-1 text-xs text-[var(--color-muted)]">
                              {fmtDateTimeID(t.occurred_at)} • {accLabel}
                            </div>
                            {t.note && (
                              <div className="mt-2 text-xs text-slate-600 line-clamp-2">
                                {t.note}
                              </div>
                            )}
                          </div>

                          <div
                            className={`text-sm font-bold ${
                              isIncome ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {fmtRp(t.amount)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <TransactionDetailSheet
        open={!!selected}
        tx={selected}
        onClose={() => setSelected(null)}
        accountLabel={(id) => (id ? accountMap.get(id) ?? 'Unknown Account' : 'All Accounts')}
      />
    </div>
  )
}
