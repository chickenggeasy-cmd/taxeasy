import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { TaxInput, TaxResult, TaxRules } from '../engine/types'
import { askAssistant, buildContext, checkAssistant, SUGGESTIONS, type AssistantStatus, type ChatMessage } from '../lib/assistant'
import { readJSON, writeJSON } from '../lib/storage'
import { Art } from './Art'

const CONSENT_KEY = 'taxeasy:ai-consent'
const MAX_TURNS = 10

/** หน้าตาน้องภาษี: ใช้ images/assistant.png ถ้ามี ไม่มีก็ใช้ภาพวาดนี้แทน */
export function Mascot({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-art-white" style={{ width: size, height: size }}>
      <Art name="assistant" className="h-full w-full scale-[1.15] object-cover" fallback={<MascotSvg size={size} />} />
    </span>
  )
}

function MascotSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <line x1="24" y1="9" x2="24" y2="4" stroke="var(--refund)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="4" r="3.5" fill="var(--refund)" />
      <rect x="6" y="9" width="36" height="33" rx="12" fill="var(--accent)" />
      <rect x="11" y="15" width="26" height="20" rx="8" fill="var(--surface)" />
      <circle cx="19" cy="24" r="2.6" fill="var(--ink)" />
      <circle cx="29" cy="24" r="2.6" fill="var(--ink)" />
      <path d="M20.5 29.5q3.5 2.6 7 0" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Assistant({ input, result, rules, raised }: { input: TaxInput; result: TaxResult; rules: TaxRules; raised: boolean }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AssistantStatus>('checking')
  const [consent, setConsent] = useState<boolean | null>(() => readJSON<boolean>(CONSENT_KEY))
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && status === 'checking') void checkAssistant().then(setStatus)
  }, [open, status])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const chooseConsent = (v: boolean) => {
    setConsent(v)
    writeJSON(CONSENT_KEY, v)
  }

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setDraft('')
    setError(null)
    setBusy(true)
    try {
      const reply = await askAssistant(rules.taxYear, next, consent ? buildContext(input, result, rules) : null)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setError((e as Error).message)
      setMessages(messages)
      setDraft(q)
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const full = messages.length >= MAX_TURNS * 2

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ถามน้องภาษี AI ผู้ช่วย"
        className={`fixed z-30 grid h-14 w-14 place-items-center rounded-full bg-surface shadow-lg ring-1 ring-line transition-transform hover:-translate-y-0.5 md:bottom-6 ${
          open ? 'hidden' : ''
        } ${raised ? 'bottom-[calc(118px+env(safe-area-inset-bottom,0px))]' : 'bottom-[calc(76px+env(safe-area-inset-bottom,0px))]'}`}
        style={{ right: 'max(16px, calc(env(safe-area-inset-right, 0px) + 16px))' }}
      >
        <Mascot size={46} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-end md:items-stretch" role="dialog" aria-modal="true" aria-label="น้องภาษี AI ผู้ช่วย">
          <button type="button" aria-label="ปิด" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="relative flex h-[88%] w-full flex-col rounded-t-3xl bg-surface shadow-2xl md:h-full md:w-[420px] md:rounded-none md:border-l md:border-line">
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Mascot size={40} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-display text-lg font-semibold">น้องภาษี</p>
                <p className="text-xs text-muted">AI ผู้ช่วยตอบคำถามภาษี ปี {rules.taxYear}</p>
              </div>
              {messages.length > 0 && (
                <button type="button" onClick={() => setMessages([])} className="rounded-lg px-2 py-1 text-sm text-muted hover:text-ink">
                  เริ่มใหม่
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิดหน้าแชท" className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg">
                ✕
              </button>
            </header>

            <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
              {status === 'checking' && <p className="text-sm text-muted">กำลังเชื่อมต่อ…</p>}
              {status === 'offline' && (
                <Notice>
                  ตอนนี้แอปไม่ได้เชื่อมกับเซิร์ฟเวอร์ ใช้น้องภาษีได้เมื่อเปิดแอปผ่านเซิร์ฟเวอร์ที่ติดตั้งหลังบ้านไว้ ส่วนการคำนวณภาษียังใช้ได้ตามปกติ
                </Notice>
              )}
              {status === 'php_version' && <Notice>เซิร์ฟเวอร์นี้ใช้ PHP รุ่นเก่า น้องภาษีต้องใช้ PHP 8.1 ขึ้นไป แจ้งผู้ดูแลระบบให้อัปเกรด XAMPP ส่วนการคำนวณภาษียังใช้ได้ตามปกติ</Notice>}
              {status === 'not_configured' && <Notice>ผู้ดูแลระบบยังไม่ได้เปิดใช้ AI ผู้ช่วย (ต้องใส่ API key ในไฟล์ server/config.php)</Notice>}

              {status === 'ready' && consent === null && (
                <div className="flex flex-col gap-3 rounded-2xl bg-accent-soft p-4">
                  <p className="font-semibold">ให้น้องภาษีดูตัวเลขภาษีของคุณไหม</p>
                  <p className="text-sm">
                    ถ้าอนุญาต แอปจะส่งสรุปรายได้ ค่าลดหย่อน และผลคำนวณไปพร้อมคำถาม เพื่อให้ตอบตรงกับคุณ ไม่มีชื่อหรือเลขบัตรประชาชน เปลี่ยนใจได้ทุกเมื่อ
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => chooseConsent(true)} className="rounded-xl bg-accent px-4 py-2 font-semibold text-accent-ink">
                      อนุญาต
                    </button>
                    <button type="button" onClick={() => chooseConsent(false)} className="rounded-xl border border-line bg-surface px-4 py-2 font-semibold">
                      ไม่ส่ง ถามแบบทั่วไป
                    </button>
                  </div>
                </div>
              )}

              {status === 'ready' && consent !== null && messages.length === 0 && (
                <>
                  <p className="text-[15px]">สวัสดีครับ ถามเรื่องภาษีได้เลย เช่น</p>
                  <div className="flex flex-col items-start gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="rounded-2xl border border-accent px-3 py-2 text-left text-sm font-semibold text-accent">
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <p key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 whitespace-pre-wrap text-accent-ink">
                    {m.content}
                  </p>
                ) : (
                  <div key={i} className="flex max-w-[92%] items-start gap-2 self-start">
                    <span className="shrink-0">
                      <Mascot size={28} />
                    </span>
                    <p className="min-w-0 rounded-2xl rounded-tl-md bg-paper px-3.5 py-2.5 text-[15px] whitespace-pre-wrap">{m.content}</p>
                  </div>
                ),
              )}
              {busy && (
                <div className="flex items-center gap-2 self-start text-sm text-muted">
                  <Mascot size={28} />
                  น้องภาษีกำลังคิด…
                </div>
              )}
              {error && <p className="rounded-xl bg-due-soft px-3 py-2 text-sm text-due">{error}</p>}
              {full && <Notice>บทสนทนายาวแล้ว กด “เริ่มใหม่” เพื่อถามเรื่องต่อไป</Notice>}
            </div>

            {status === 'ready' && consent !== null && (
              <form
                className="flex flex-col gap-2 border-t border-line px-3 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send(draft)
                }}
              >
                <label className="flex items-center gap-2 px-1 text-xs text-muted">
                  <input id="ai-consent" type="checkbox" checked={consent} onChange={(e) => chooseConsent(e.target.checked)} className="accent-[var(--accent)]" />
                  ส่งสรุปภาษีของฉันไปด้วย
                </label>
                <div className="flex items-end gap-2">
                  <textarea
                    id="ai-question"
                    ref={inputRef}
                    rows={1}
                    maxLength={2000}
                    value={draft}
                    disabled={full}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault()
                        void send(draft)
                      }
                    }}
                    placeholder="พิมพ์คำถาม…"
                    className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-accent"
                  />
                  <button type="submit" disabled={busy || !draft.trim() || full} className="h-11 shrink-0 rounded-2xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-40">
                    ส่ง
                  </button>
                </div>
                <p className="px-1 text-[11px] text-muted">AI อาจตอบผิดได้ ตรวจสอบกับกรมสรรพากรก่อนยื่นจริง</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">{children}</p>
}
