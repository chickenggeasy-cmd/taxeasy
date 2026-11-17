// สแกนหนังสือรับรอง 50 ทวิ: ย่อรูปในเครื่องก่อนส่ง แล้วให้ api/scan.php อ่านตัวเลข
import { BilingualError, readApiJson } from './server'

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
    r.onerror = () => reject(new BilingualError('อ่านไฟล์ไม่ได้', 'Could not read the file'))
    r.readAsDataURL(blob)
  })

/** ย่อรูปให้ด้านยาวไม่เกิน 1600px เป็น JPEG (ตัวหนังสือยังอ่านได้ ไฟล์เล็กลงมาก) */
async function shrinkImage(file: File): Promise<Blob> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new BilingualError('เปิดรูปนี้ไม่ได้ ลองถ่ายใหม่ หรือบันทึกเป็น JPG/PNG', 'Could not open this image. Take it again, or save it as JPG/PNG.')
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
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new BilingualError('ย่อรูปไม่สำเร็จ', 'Could not shrink the image'))), 'image/jpeg', 0.85))
}

export async function scanForm(file: File): Promise<ScanResult> {
  const pdf = file.type === 'application/pdf'
  if (!pdf && !file.type.startsWith('image/')) throw new BilingualError('เลือกรูปถ่ายหรือไฟล์ PDF ของ 50 ทวิ', 'Choose a photo or PDF of the 50 Tawi')
  if (pdf && file.size > MAX_PDF) throw new BilingualError('ไฟล์ PDF ใหญ่เกินไป (สูงสุดประมาณ 4.5 MB)', 'The PDF is too large (about 4.5 MB at most)')
  const blob = pdf ? file : await shrinkImage(file)
  const body = JSON.stringify({ mediaType: pdf ? 'application/pdf' : 'image/jpeg', data: await toBase64(blob) })
  let res: Response
  try {
    res = await fetch('./api/scan.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  } catch {
    throw new BilingualError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่', 'Could not reach the server. Check your internet connection and try again.')
  }
  const data = await readApiJson<{ ok?: boolean; result?: ScanResult; error?: string; errorEn?: string }>(res)
  if (!res.ok || !data.ok || !data.result)
    throw new BilingualError(data.error ?? 'อ่านเอกสารไม่สำเร็จ', data.errorEn ?? 'Could not read the document')
  return data.result
}
