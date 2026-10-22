// วาดการ์ดสรุปภาษีเป็นรูป PNG สำหรับแชร์ (ไม่ส่งข้อมูลออกจากเครื่อง)
import type { TaxResult, TaxRules } from '../engine/types'
import { fmt, pct } from './format'

const W = 1080
const H = 1350
const C = {
  paper: '#f3f5fa',
  surface: '#ffffff',
  ink: '#141a2e',
  muted: '#5b6480',
  line: '#dde2ee',
  accent: '#2340c9',
  accentSoft: '#e7ebfd',
  refund: '#0d7a50',
  refundSoft: '#e1f4ea',
  due: '#b04a14',
  dueSoft: '#fbece2',
}
const DISPLAY = "'Bai Jamjuree', 'IBM Plex Sans Thai', sans-serif"
const BODY = "'IBM Plex Sans Thai', sans-serif"

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** ย่อขนาดตัวอักษรจนข้อความกว้างไม่เกิน max */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, max: number) {
  let s = size
  do {
    ctx.font = `${weight} ${s}px ${family}`
    if (ctx.measureText(text).width <= max) break
    s -= 4
  } while (s > 24)
}

export async function renderShareCard(result: TaxResult, rules: TaxRules, hideAmounts: boolean): Promise<Blob> {
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const refund = result.balance < -0.005
  const zero = Math.abs(result.balance) < 0.005
  const tone = zero ? { fg: C.accent, bg: C.accentSoft } : refund ? { fg: C.refund, bg: C.refundSoft } : { fg: C.due, bg: C.dueSoft }

  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, W, H)
  // แสงตกแต่งมุมบน
  const glow = ctx.createRadialGradient(W - 80, 60, 0, W - 80, 60, 620)
  glow.addColorStop(0, 'rgba(35,64,201,0.16)')
  glow.addColorStop(1, 'rgba(35,64,201,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // หัว: โลโก้ + ชื่อแอป
  const logo = await loadImage(new URL('icons/icon-192.png', document.baseURI).href)
  if (logo) {
    ctx.save()
    roundRect(ctx, 80, 80, 96, 96, 26)
    ctx.clip()
    ctx.drawImage(logo, 80, 80, 96, 96)
    ctx.restore()
  }
  ctx.fillStyle = C.ink
  ctx.font = `600 52px ${DISPLAY}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('ภาษีง่ายๆ', logo ? 200 : 80, 140)
  ctx.fillStyle = C.muted
  ctx.font = `400 32px ${BODY}`
  ctx.fillText(`สรุปภาษีเงินได้ ปีภาษี ${rules.taxYear}`, logo ? 200 : 80, 182)

  // การ์ดผลลัพธ์หลัก
  const cardY = 250
  roundRect(ctx, 64, cardY, W - 128, 480, 56)
  ctx.fillStyle = tone.bg
  ctx.fill()
  ctx.fillStyle = tone.fg
  ctx.font = `600 44px ${BODY}`
  ctx.fillText(zero ? '● ไม่ต้องจ่ายเพิ่ม ไม่มีเงินคืน' : refund ? '▲ ฉันจะได้เงินภาษีคืน' : '▼ ต้องจ่ายภาษีเพิ่ม', 120, cardY + 110)
  const big = hideAmounts ? (zero ? 'สบาย ๆ' : refund ? 'ได้คืน!' : 'วางแผนแล้ว') : `฿${fmt(Math.abs(result.balance))}`
  fit(ctx, big, 600, 176, DISPLAY, W - 240)
  ctx.fillText(big, 116, cardY + 310)
  ctx.fillStyle = C.ink
  ctx.font = `400 34px ${BODY}`
  ctx.fillText(
    hideAmounts ? 'คำนวณแล้วด้วยแอป ภาษีง่ายๆ' : `ภาษีทั้งปี ${fmt(result.tax)} บาท · จ่ายไปแล้ว ${fmt(result.credits)} บาท`,
    120,
    cardY + 400,
  )

  // ตัวเลขย่อย 2 ช่อง
  const tiles = [
    { label: 'อัตราภาษีจริง', value: pct(result.effectiveRate) },
    { label: 'ฐานภาษีสูงสุด', value: pct(result.marginalRate) },
  ]
  if (!hideAmounts) tiles.push({ label: 'ใช้สิทธิลดหย่อน', value: `${fmt(result.totalDeductions)}` })
  const gap = 28
  const tw = (W - 128 - gap * (tiles.length - 1)) / tiles.length
  tiles.forEach((t, i) => {
    const x = 64 + i * (tw + gap)
    const y = cardY + 520
    roundRect(ctx, x, y, tw, 210, 40)
    ctx.fillStyle = C.surface
    ctx.fill()
    ctx.strokeStyle = C.line
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = C.muted
    ctx.font = `400 30px ${BODY}`
    ctx.fillText(t.label, x + 36, y + 70)
    ctx.fillStyle = C.ink
    fit(ctx, t.value, 600, 72, DISPLAY, tw - 72)
    ctx.fillText(t.value, x + 36, y + 160)
  })

  // ท้าย
  ctx.fillStyle = C.accent
  ctx.font = `600 36px ${BODY}`
  ctx.fillText('ยื่นภาษีออนไลน์ทันกำหนด · ลดหย่อนครบทุกสิทธิ', 80, H - 150)
  ctx.fillStyle = C.muted
  ctx.font = `400 26px ${BODY}`
  ctx.fillText('ตัวเลขประมาณการจากข้อมูลที่กรอก ไม่ใช่เอกสารทางการ', 80, H - 96)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('สร้างรูปไม่สำเร็จ'))), 'image/png'))
}

/** แชร์ผ่านแอปในมือถือถ้าทำได้ ไม่งั้นดาวน์โหลดรูป */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'สรุปภาษีของฉัน' })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
