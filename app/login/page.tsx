'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-[var(--color-card)] p-6 rounded-2xl shadow-lg"
      >
        <h1 className="text-2xl font-bold text-center mb-6">
          bubob finance
        </h1>

        <div className="mb-4">
          <label className="block text-sm text-[var(--color-muted)] mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2
              focus:outline-none focus:ring-2
              focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-[var(--color-muted)] mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2
              focus:outline-none focus:ring-2
              focus:ring-[var(--color-primary)]"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--color-danger)] mb-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="
            w-full mt-4 py-3 rounded-xl font-semibold text-white
            bg-[var(--color-primary)]
            hover:bg-[var(--color-primary-glow)]
            transition
            disabled:opacity-50
          "
        >
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
