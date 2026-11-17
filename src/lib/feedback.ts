// ส่งเรื่องที่ผู้ใช้แจ้งไปที่ api/feedback.php ทีมดูได้ที่หลังบ้าน (admin/feedback.php)
import { BilingualError, readApiJson } from './server'

export type FeedbackCategory = 'wrong_number' | 'bug' | 'idea' | 'other'

export const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string; labelEn: string; hint: string; hintEn: string }[] = [
  {
    value: 'wrong_number',
    label: 'ตัวเลขไม่ตรง',
    labelEn: 'Numbers differ',
    hint: 'เช่น ภาษีที่แอปคำนวณไม่ตรงกับที่ยื่นจริง หรือเพดานลดหย่อนผิด',
    hintEn: 'For example, the tax differs from what you filed, or a deduction cap is wrong',
  },
  { value: 'bug', label: 'ใช้งานไม่ได้', labelEn: 'Something is broken', hint: 'เช่น กดปุ่มแล้วไม่ทำงาน หน้าจอแสดงผิด', hintEn: 'For example, a button does nothing or a screen looks wrong' },
  { value: 'idea', label: 'อยากให้เพิ่ม', labelEn: 'Feature idea', hint: 'ฟีเจอร์หรือค่าลดหย่อนที่อยากให้มี', hintEn: 'A feature or deduction you would like to see' },
  { value: 'other', label: 'อื่น ๆ', labelEn: 'Other', hint: '', hintEn: '' },
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
    throw new BilingualError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่', 'Could not reach the server. Check your internet connection and try again.')
  }
  const data = await readApiJson<{ ok?: boolean; error?: string; errorEn?: string }>(res)
  if (!res.ok || !data.ok) throw new BilingualError(data.error ?? 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง', data.errorEn ?? 'Could not send. Please try again.')
}
