/** Error ที่มีข้อความสองภาษา: message เป็นภาษาไทยเหมือนเดิม และ en เป็นภาษาอังกฤษ */
export class BilingualError extends Error {
  en: string
  constructor(th: string, en: string) {
    super(th)
    this.en = en
  }
}

/** ข้อความภาษาอังกฤษของ Error (ถ้าไม่มีฉบับอังกฤษ ใช้ข้อความเดิม) */
export function errorEn(e: unknown): string {
  if (e instanceof BilingualError) return e.en
  return e instanceof Error ? e.message : String(e)
}

/** ข้อความเมื่อเรียก api/*.php แล้วได้โค้ด PHP กลับมา (เปิดผ่าน Live Server หรือเว็บเซิร์ฟเวอร์ที่ไม่รัน PHP) */
export const NO_PHP_MESSAGE =
  'เซิร์ฟเวอร์นี้รัน PHP ไม่ได้ (เช่น Live Server ของ VS Code) เปิดแอปผ่าน XAMPP แทน เช่น http://localhost/project_data/Texeasy/'
const NO_PHP_MESSAGE_EN =
  "This server can't run PHP (for example VS Code Live Server). Open the app through XAMPP instead, e.g. http://localhost/project_data/Texeasy/"

/** อ่าน JSON จาก api/*.php ถ้าได้โค้ด PHP หรือหน้า HTML กลับมาจะโยน Error ที่อธิบายสาเหตุ */
export async function readApiJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  const head = text.trimStart().slice(0, 20).toLowerCase()
  if (head.startsWith('<?php')) throw new BilingualError(NO_PHP_MESSAGE, NO_PHP_MESSAGE_EN)
  try {
    return JSON.parse(text) as T
  } catch {
    throw head.startsWith('<')
      ? new BilingualError('ไม่พบ API บนเซิร์ฟเวอร์ ตรวจว่าวางไฟล์ครบทั้งโฟลเดอร์ api/', 'API not found on the server. Check that the whole api/ folder was copied.')
      : new BilingualError('เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง', 'The server sent an invalid response.')
  }
}
