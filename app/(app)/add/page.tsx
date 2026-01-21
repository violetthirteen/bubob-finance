'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Account = {
  id: string
  name: string
  type: 'cash' | 'ewallet' | string
  balance: number
}

type TxType = 'income' | 'expense'

const INCOME_CATEGORIES = ['Bubob', 'Niflix Store', 'KKMP', 'Joki Tugas', 'Lainnya']
const EXPENSE_CATEGORIES = [
  'Jajan',
  'Checkout Olshop',
  'Beli Offline',
  'Makanan Haci',
  'Transport',
  'Tagihan',
  'Lainnya',
]

const BUCKET = 'tx-photos'

// ====== time helpers (LOCAL -> ISO) ======
const pad2 = (n: number) => String(n).padStart(2, '0')

function toLocalInputValue(d: Date) {
  // yyyy-mm-ddThh:mm (buat input datetime-local)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`
}

function toIsoFromLocalDateTime(local: string) {
  // local: "YYYY-MM-DDTHH:mm"  -> interpret as LOCAL time
  const [datePart, timePart] = local.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0)
  return dt.toISOString()
}
// =========================================

export default function AddPage() {
  const router = useRouter()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const [type, setType] = useState<TxType>('expense')
  const categories = useMemo(
    () => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES),
    [type]
  )

  const [accountId, setAccountId] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)

  // ✅ waktu transaksi (local)
  const [occurredAt, setOccurredAt] = useState(() => toLocalInputValue(new Date()))

  const amountNumber = useMemo(() => {
    const n = Number(String(amount).replace(/[^\d]/g, ''))
    return Number.isFinite(n) ? n : 0
  }, [amount])

  useEffect(() => {
    setCategory(categories[0] ?? 'Lainnya')
  }, [categories])

  useEffect(() => {
    const load = async () => {
      setPageError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('accounts')
        .select('id,name,type,balance')
        .order('name', { ascending: true })

      if (error) {
        setPageError(error.message)
        return
      }

      const list = (data ?? []) as Account[]
      setAccounts(list)
      if (!accountId && list[0]?.id) setAccountId(list[0].id)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uploadPhotoIfAny = async (userId: string, accountId: string) => {
    if (!photo) return null

    if (photo.size > 5 * 1024 * 1024) {
      throw new Error('Foto kebesaran. Max 5MB.')
    }

    const ext = (photo.name.split('.').pop() || 'jpg').toLowerCase()
    const filePath = `${userId}/${accountId}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, photo, {
      cacheControl: '3600',
      upsert: false,
      contentType: photo.type || 'image/jpeg',
    })

    if (error) throw error
    if (!data?.path) return null

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return pub.publicUrl || null
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPageError(null)

    try {
      if (!accountId) throw new Error('Pilih account dulu.')
      if (!amountNumber || amountNumber <= 0) throw new Error('Amount harus > 0.')
      if (!occurredAt) throw new Error('Tanggal & jam wajib diisi.')

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr) throw userErr
      if (!user) throw new Error('Session login hilang. Coba login ulang.')

      const acc = accounts.find((a) => a.id === accountId)
      if (!acc) throw new Error('Account tidak ketemu.')

      const delta = type === 'income' ? amountNumber : -amountNumber
      const newBalance = Number(acc.balance ?? 0) + delta

      // optional upload foto
      const photoUrl = await uploadPhotoIfAny(user.id, accountId)

      // ✅ FIX tanggal: pakai input local, convert aman
      const occurredIso = toIsoFromLocalDateTime(occurredAt)

      const { error: insertErr } = await supabase.from('transactions').insert({
        user_id: user.id,
        type,
        account_id: accountId,
        category,
        amount: amountNumber,
        note: note || null,
        occurred_at: occurredIso,
        photo_url: photoUrl,
      })

      if (insertErr) throw insertErr

      const { error: updErr } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', accountId)
        .eq('user_id', user.id)

      if (updErr) throw updErr

      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, balance: newBalance } : a))
      )

      // reset
      setAmount('')
      setNote('')
      setPhoto(null)
      setOccurredAt(toLocalInputValue(new Date()))
      router.push('/dashboard')
    } catch (err: any) {
      setPageError(err?.message ?? 'Gagal save.')
    } finally {
      setLoading(false)
    }
  }

  const selectedAcc = useMemo(
    () => accounts.find((a) => a.id === accountId) || null,
    [accounts, accountId]
  )

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      <div className="mx-auto max-w-md bg-[var(--color-card)] rounded-2xl shadow p-5">
        <h1 className="text-xl font-bold">Add Transaction</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">catat uang masuk / keluar</p>

        {pageError && <div className="mt-4 text-sm text-[var(--color-danger)]">{pageError}</div>}

        <form onSubmit={save} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TxType)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>

            {selectedAcc && (
              <div className="mt-2 text-xs text-[var(--color-muted)]">
                Saldo sekarang:{' '}
                <span className="font-semibold text-[var(--color-text)]">
                  Rp {Number(selectedAcc.balance ?? 0).toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Amount</label>
            <input
              inputMode="numeric"
              placeholder="contoh: 25000"
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

          {/* ✅ tanggal & jam */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm text-[var(--color-muted)] mb-1">Tanggal & Jam</label>
              <button
                type="button"
                onClick={() => setOccurredAt(toLocalInputValue(new Date()))}
                className="text-xs underline text-[var(--color-muted)]"
              >
                Set sekarang
              </button>
            </div>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
            <div className="mt-2 text-[11px] text-[var(--color-muted)]">
              Ini yang bakal tampil di History & Detail (waktu lokal).
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Note (optional)</label>
            <input
              placeholder={type === 'income' ? 'pemasukan dari siapa?' : 'buat apa?'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-1">Picture (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
            />
            {photo && (
              <div className="mt-2 text-xs text-[var(--color-muted)]">
                Selected:{' '}
                <span className="font-semibold text-[var(--color-text)]">{photo.name}</span>
              </div>
            )}
          </div>

          <div className="fixed left-0 right-0 bottom-16 z-40">
            <div className="mx-auto max-w-md px-4">
              <div className="bg-[var(--color-card)] rounded-2xl shadow-lg p-3 border border-slate-100">
                <Button type="submit" size="lg" full disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-24" />
        </form>

        <div className="mt-4 text-[11px] text-[var(--color-muted)]">
          Notes: pastiin Supabase Storage bucket <b>{BUCKET}</b> ada. Dan table <b>transactions</b> punya kolom{' '}
          <b>photo_url</b> (nullable).
        </div>
      </div>
    </div>
  )
}
