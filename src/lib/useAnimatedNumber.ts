import { useEffect, useRef, useState } from 'react'

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** ตัวเลขที่ค่อย ๆ วิ่งไปหาค่าใหม่ (ease-out) เมื่อค่าเปลี่ยน */
export function useAnimatedNumber(target: number, duration = 450): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  const frame = useRef(0)

  useEffect(() => {
    if (reduceMotion() || from.current === target) {
      from.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const begin = from.current
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = begin + (target - begin) * eased
      from.current = v
      setValue(v)
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])

  return value
}
