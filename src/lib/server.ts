/** ข้อความเมื่อเรียก api/*.php แล้วได้โค้ด PHP กลับมา (เปิดผ่าน Live Server หรือเว็บเซิร์ฟเวอร์ที่ไม่รัน PHP) */
export const NO_PHP_MESSAGE =
  'เซิร์ฟเวอร์นี้รัน PHP ไม่ได้ (เช่น Live Server ของ VS Code) เปิดแอปผ่าน XAMPP แทน เช่น http://localhost/project_data/Texeasy/'

/** อ่าน JSON จาก api/*.php ถ้าได้โค้ด PHP หรือหน้า HTML กลับมาจะโยน Error ที่อธิบายสาเหตุ */
export async function readApiJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  const head = text.trimStart().slice(0, 20).toLowerCase()
  if (head.startsWith('<?php')) throw new Error(NO_PHP_MESSAGE)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(head.startsWith('<') ? 'ไม่พบ API บนเซิร์ฟเวอร์ ตรวจว่าวางไฟล์ครบทั้งโฟลเดอร์ api/' : 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง')
  }
}
