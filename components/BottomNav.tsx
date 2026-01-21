'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/add', label: 'Add', icon: '➕' },
  { href: '/history', label: 'History', icon: '📄' },
  { href: '/plans', label: 'Plans', icon: '🎯' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
<nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-40">
      <div className="max-w-md mx-auto px-4 py-2 flex justify-between">
        {tabs.map((t) => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition ${
                active ? 'text-primary font-semibold' : 'text-muted'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="text-xs">{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
