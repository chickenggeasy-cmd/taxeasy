import type { ReactNode } from 'react'
import { useState } from 'react'

export type ArtName = 'hero' | 'refund' | 'empty' | 'assistant' | 'income' | 'deductions' | 'plan' | 'more' | 'onb-welcome' | 'onb-income' | 'onb-deductions' | 'onb-result'

/** ลองนามสกุลตามลำดับ: .webp ก่อน ถ้าไม่มีจะลอง .png (วางไฟล์ PNG จาก GPT ได้เลยไม่ต้องแปลง) */
const EXTENSIONS = ['webp', 'png'] as const

/**
 * ภาพตกแต่งจากโฟลเดอร์ images/ (เช่น images/hero.webp หรือ images/hero.png)
 * ถ้าไม่มีไฟล์ทั้งสองนามสกุล จะแสดง fallback แทน (ถ้าไม่ได้ส่ง fallback จะไม่แสดงอะไร)
 */
export function Art({ name, alt = '', className = '', fallback = null }: { name: ArtName; alt?: string; className?: string; fallback?: ReactNode }) {
  const [attempt, setAttempt] = useState(0)
  if (attempt >= EXTENSIONS.length) return <>{fallback}</>
  return (
    <img
      src={`./images/${name}.${EXTENSIONS[attempt]}`}
      alt={alt}
      className={className}
      onError={() => setAttempt((n) => n + 1)}
      loading="lazy"
      decoding="async"
    />
  )
}
