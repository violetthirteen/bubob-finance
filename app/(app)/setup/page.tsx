'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const defaultAccounts = [
  { name: 'Cash', type: 'cash' },
  { name: 'E-Wallet', type: 'ewallet' },
] as const

const defaultCategories = [
  // expense
  { name: 'Makan', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Belanja', type: 'expense' },
  { name: 'Tagihan', type: 'expense' },
  { name: 'Pulsa/Internet', type: 'expense' },
  { name: 'Paylater', type: 'expense' },
  { name: 'Kesehatan', type: 'expense' },
  { name: 'Lainnya', type: 'expense' },
  // income
  { name: 'Gaji', type: 'income' },
  { name: 'Bonus', type: 'income' },
  { name: 'Transfer Masuk', type: 'income' },
] as const

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const seed = async () => {
    setLoading(true)
    setMsg('')

    const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
    if (sessErr) {
      setMsg(`Session error: ${sessErr.message}`)
      setLoading(false)
      return
    }

    const userId = sessionData.session?.user.id
    if (!userId) {
      setMsg('Belum login.')
      setLoading(false)
      return
    }

    // ---- ACCOUNTS: cek dulu biar ga dobel
    const { data: existingAcc, error: accReadErr } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (accReadErr) {
      setMsg(`Read accounts error: ${accReadErr.message}`)
      setLoading(false)
      return
    }

    if (!existingAcc || existingAcc.length === 0) {
      const { error: accInsErr } = await supabase
        .from('accounts')
        .insert(defaultAccounts.map(a => ({ ...a, user_id: userId, opening_balance: 0 })))

      if (accInsErr) {
        setMsg(`Insert accounts error: ${accInsErr.message}`)
        setLoading(false)
        return
      }
    }

    // ---- CATEGORIES: cek dulu biar ga dobel
    const { data: existingCat, error: catReadErr } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (catReadErr) {
      setMsg(`Read categories error: ${catReadErr.message}`)
      setLoading(false)
      return
    }

    if (!existingCat || existingCat.length === 0) {
      const { error: catInsErr } = await supabase
        .from('categories')
        .insert(defaultCategories.map(c => ({ ...c, user_id: userId })))

      if (catInsErr) {
        setMsg(`Insert categories error: ${catInsErr.message}`)
        setLoading(false)
        return
      }
    }

    setMsg('✅ Setup sukses! Accounts & Categories siap.')
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto p-5">
      <div className="bg-card rounded-2xl shadow p-5">
        <h1 className="text-xl font-semibold text-text">Setup (sekali aja)</h1>
        <p className="text-muted mt-1">
          Bikin dompet default + kategori biar bubob finance langsung bisa dipake.
        </p>

        {msg && (
          <p className="mt-3 text-sm text-text">{msg}</p>
        )}

        <button
          onClick={seed}
          disabled={loading}
          className="mt-4 w-full bg-primary text-white py-2 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? 'Nge-setup...' : 'Jalankan Setup'}
        </button>
      </div>
    </div>
  )
}
