import type { ReactNode } from 'react'
import { useState } from 'react'

export type ArtName = 'hero' | 'refund' | 'empty' | 'assistant'

/**
 * ภาพตกแต่งจากโฟลเดอร์ images/ (เช่น images/hero.png)
 * ถ้ายังไม่มีไฟล์ จะไม่แสดงอะไร หรือแสดง fallback แทน
 * ภาพพื้นขาววางบนกรอบสีอ่อนด้วย mix-blend-multiply ให้พื้นขาวกลืนไปกับกรอบ
 */
export function Art({ name, alt = '', className = '', fallback = null }: { name: ArtName; alt?: string; className?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return <img src={`./images/${name}.png`} alt={alt} className={`mix-blend-multiply ${className}`} onError={() => setFailed(true)} loading="lazy" decoding="async" />
}
