'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type PlanType = 'expense_limit' | 'saving_goal'

type Account = {
  id: string
  name: string
  type: string
}

function monthStartISO(ym: string) {
  // ym: YYYY-MM
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  // simpan sebagai date string "YYYY-MM-01"
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function AddPlanPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const now = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [type, setType] = useState<PlanType>('expense_limit')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('') // string input
  const [month, setMonth] = useState(now)
  const [accountId, setAccountId] = useState<string>('') // '' = all
  const [category, setCategory] = useState<string>('') // '' = all

  const amountNumber = useMemo(() => {
    const n = Number(String(amount).replace(/[^\d]/g, ''))
    return Number.isFinite(n) ? n : 0
  }, [amount])

  useEffect(() => {
    const load = async () => {
      setPageError(null)

      const { data: userRes } = await supabase.auth.getUser()
      if (!userRes?.user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase.from('accounts').select('id,name,type').order('name')
      if (error) {
        setPageError(error.message)
        return
      }
      setAccounts((data ?? []) as Account[])
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPageError(null)

    try {
      if (!name.trim()) throw new Error('Nama plan wajib diisi.')
      if (!amountNumber || amountNumber <= 0) throw new Error('Target amount harus > 0.')

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()
      if (userErr) throw userErr
      if (!user) throw new Error('Session login hilang. Coba login ulang.')

      const payload = {
        user_id: user.id,
        name: name.trim(),
        type,
        amount: amountNumber,
        period: 'monthly',
        start_month: monthStartISO(month),
        account_id: accountId || null,
        category: category.trim() ? category.trim() : null,
      }

      const { error } = await supabase.from('plans').insert(payload)
      if (error) throw error

      router.push('/plans')
    } catch (err: any) {
      setPageError(err?.message ?? 'Gagal simpan plan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-24">
      <div className="mx-auto max-w-md bg-[var(--color-card)] rounded-2xl shadow p-5 border border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Add Plan</h1>
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
              placeholder={type === 'expense_limit' ? 'Misal: Jajan Bulanan' : 'Misal: Nabung Darurat'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Target Amount</label>
            <input
              inputMode="numeric"
              placeholder="contoh: 500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
            <div className="mt-2 text-xs text-[var(--color-muted)]">
              Preview:{' '}
              <span className="font-semibold text-[var(--color-text)]">
                Rp {amountNumber.toLocaleString('id-ID')}
              </span>
            </div>
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
            <label className="block text-sm text-[var(--color-muted)] mb-1">
              Account (optional)
            </label>
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
            <label className="block text-sm text-[var(--color-muted)] mb-1">
              Category (optional)
            </label>
            <input
              placeholder="kosongin kalau mau semua kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
            <div className="mt-2 text-[11px] text-[var(--color-muted)]">
              Ini ngikutin kolom <b>transactions.category</b> (text).
            </div>
          </div>

          <Button type="submit" size="lg" full disabled={loading}>
            {loading ? 'Saving...' : 'Save Plan'}
          </Button>
        </form>
      </div>
    </div>
  )
}
