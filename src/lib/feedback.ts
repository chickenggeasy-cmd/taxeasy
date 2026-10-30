// ส่งเรื่องที่ผู้ใช้แจ้งไปที่ api/feedback.php ทีมดูได้ที่หลังบ้าน (admin/feedback.php)
import { readApiJson } from './server'

export type FeedbackCategory = 'wrong_number' | 'bug' | 'idea' | 'other'

export const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string; hint: string }[] = [
  { value: 'wrong_number', label: 'ตัวเลขไม่ตรง', hint: 'เช่น ภาษีที่แอปคำนวณไม่ตรงกับที่ยื่นจริง หรือเพดานลดหย่อนผิด' },
  { value: 'bug', label: 'ใช้งานไม่ได้', hint: 'เช่น กดปุ่มแล้วไม่ทำงาน หน้าจอแสดงผิด' },
  { value: 'idea', label: 'อยากให้เพิ่ม', hint: 'ฟีเจอร์หรือค่าลดหย่อนที่อยากให้มี' },
  { value: 'other', label: 'อื่น ๆ', hint: '' },
]

export const FEEDBACK_MAX = 2000

export interface FeedbackPayload {
  category: FeedbackCategory
  message: string
  contact: string
  taxYear: number
  rulesRevision: number
  page: string
  /** สรุปตัวเลข ส่งเฉพาะเมื่อผู้ใช้ติ๊กยินยอม */
  calcSummary: string
}

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  let res: Response
  try {
    res = await fetch('./api/feedback.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่')
  }
  const data = await readApiJson<{ ok?: boolean; error?: string }>(res)
  if (!res.ok || !data.ok) throw new Error(data.error ?? 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง')
}
