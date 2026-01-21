'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }
      setReady(true)
    }
    run()
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-muted">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
