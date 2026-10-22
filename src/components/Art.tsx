import type { ReactNode } from 'react'
import { useState } from 'react'

export type ArtName = 'hero' | 'refund' | 'empty' | 'assistant' | 'income' | 'deductions' | 'plan' | 'more'

/**
 * ภาพตกแต่งจากโฟลเดอร์ images/ (เช่น images/hero.webp)
 * ถ้ายังไม่มีไฟล์ จะไม่แสดงอะไร หรือแสดง fallback แทน
 */
export function Art({ name, alt = '', className = '', fallback = null }: { name: ArtName; alt?: string; className?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return <img src={`./images/${name}.webp`} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" decoding="async" />
}
