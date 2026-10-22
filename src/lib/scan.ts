// สแกนหนังสือรับรอง 50 ทวิ: ย่อรูปในเครื่องก่อนส่ง แล้วให้ api/scan.php อ่านตัวเลข
import { readApiJson } from './server'

export interface ScanResult {
  found: boolean
  taxYear: number | null
  employer: string
  salary: number
  withheld: number
  socialSecurity: number
  providentFund: number
  note: string
}

const MAX_SIDE = 1600
const MAX_PDF = 4_500_000

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'))
    r.readAsDataURL(blob)
  })

/** ย่อรูปให้ด้านยาวไม่เกิน 1600px เป็น JPEG (ตัวหนังสือยังอ่านได้ ไฟล์เล็กลงมาก) */
async function shrinkImage(file: File): Promise<Blob> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new Error('เปิดรูปนี้ไม่ได้ ลองถ่ายใหม่ หรือบันทึกเป็น JPG/PNG')
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ย่อรูปไม่สำเร็จ'))), 'image/jpeg', 0.85))
}

export async function scanForm(file: File): Promise<ScanResult> {
  const pdf = file.type === 'application/pdf'
  if (!pdf && !file.type.startsWith('image/')) throw new Error('เลือกรูปถ่ายหรือไฟล์ PDF ของ 50 ทวิ')
  if (pdf && file.size > MAX_PDF) throw new Error('ไฟล์ PDF ใหญ่เกินไป (สูงสุดประมาณ 4.5 MB)')
  const blob = pdf ? file : await shrinkImage(file)
  const body = JSON.stringify({ mediaType: pdf ? 'application/pdf' : 'image/jpeg', data: await toBase64(blob) })
  let res: Response
  try {
    res = await fetch('./api/scan.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  } catch {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่')
  }
  const data = await readApiJson<{ ok?: boolean; result?: ScanResult; error?: string }>(res)
  if (!res.ok || !data.ok || !data.result) throw new Error(data.error ?? 'อ่านเอกสารไม่สำเร็จ')
  return data.result
}
