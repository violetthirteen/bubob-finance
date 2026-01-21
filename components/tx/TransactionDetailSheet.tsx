'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

type TxType = 'income' | 'expense'

type TxRow = {
  id: string
  type: TxType
  amount: number
  category: string
  note: string | null
  occurred_at: string
  account_id: string | null
  photo_url?: string | null
  receipt_url?: string | null
}

function fmtRp(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

function fmtDateTimeID(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export default function TransactionDetailSheet({
  open,
  tx,
  onClose,
  accountLabel,
}: {
  open: boolean
  tx: TxRow | null
  onClose: () => void
  accountLabel: (id: string | null) => string
}) {
  const [showImage, setShowImage] = useState(false)

  // ✅ lock body scroll pas sheet kebuka (biar ga “nyangkut”)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // reset viewer kalau sheet ketutup / tx ganti
  useEffect(() => {
    if (!open) setShowImage(false)
  }, [open, tx?.id])

  if (!open || !tx) return null

  const isIncome = tx.type === 'income'
  const title = isIncome ? 'Detail Pemasukan' : 'Detail Pengeluaran'
  const usageLine = isIncome ? 'Pemasukan dari' : 'Dipakai buat'
  const photoSrc = (tx.photo_url || tx.receipt_url) as string | undefined

  return (
    <div className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close detail"
      />

      {/* sheet wrapper */}
      <div className="absolute inset-0 flex items-end justify-center px-4 pb-6">
        <div
          className="
            w-full max-w-md
            rounded-3xl bg-[var(--color-card)]
            shadow-2xl border border-slate-100
            overflow-hidden
            max-h-[85vh]
            animate-in slide-in-from-bottom-6 fade-in duration-200
          "
          role="dialog"
          aria-modal="true"
        >
          {/* header (fixed) */}
          <div className="p-4 flex items-start justify-between gap-3 border-b border-slate-100">
            <div>
              <div className="text-base font-bold">{title}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">
                {fmtDateTimeID(tx.occurred_at)}
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Tutup
            </Button>
          </div>

          {/* ✅ content yang scroll */}
          <div className="px-4 py-4 overflow-y-auto overscroll-contain max-h-[calc(85vh-72px)]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="text-xs text-[var(--color-muted)]">{usageLine}</div>
                <div className="mt-1 text-sm font-semibold">{tx.category || '-'}</div>

                {tx.note && (
                  <>
                    <div className="mt-3 text-xs text-[var(--color-muted)]">Catatan</div>
                    <div className="mt-1 text-sm whitespace-pre-wrap break-words">{tx.note}</div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="text-xs text-[var(--color-muted)]">Akun</div>
                  <div className="mt-1 text-sm font-semibold break-words">
                    {accountLabel(tx.account_id)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="text-xs text-[var(--color-muted)]">Nominal</div>
                  <div
                    className={`mt-1 text-sm font-bold ${
                      isIncome ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {fmtRp(tx.amount)}
                  </div>
                </div>
              </div>

              {/* ✅ Photo kecil dulu, ga bikin ngunci scroll */}
              {photoSrc && (
                <div className="rounded-2xl border border-slate-100 p-4">
                  <div className="text-xs text-[var(--color-muted)] mb-2">Foto</div>

                  <button
                    type="button"
                    onClick={() => setShowImage(true)}
                    className="w-full"
                    aria-label="Open photo"
                  >
                    <img
                      src={photoSrc}
                      alt="Transaction photo"
                      className="
                        w-full rounded-2xl border border-slate-100
                        object-contain
                        max-h-[260px]
                        bg-white
                      "
                      loading="lazy"
                    />
                  </button>

                  <div className="mt-2 text-[11px] text-[var(--color-muted)]">
                    Tap foto buat lihat full.
                  </div>
                </div>
              )}

              <div className="h-2" />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Full image viewer */}
      {showImage && photoSrc && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
          <button
            className="absolute inset-0"
            onClick={() => setShowImage(false)}
            aria-label="Close photo"
          />
          <div className="relative z-[71] w-full max-w-md">
            <div className="flex justify-end mb-3">
              <Button variant="ghost" onClick={() => setShowImage(false)}>
                Tutup
              </Button>
            </div>
            <img
              src={photoSrc}
              alt="Transaction photo full"
              className="w-full max-h-[85vh] object-contain rounded-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  )
}
