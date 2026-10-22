// ไอคอนเส้นของภาษีง่ายๆ (24×24, ใช้สีจาก currentColor)

const PATHS = {
  salary: 'M3 8h18v11H3zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18M11 13v2h2v-2',
  freelance: 'M4 5h16v10H4zM2 19h20M10 15l-1 4M14 15l1 4M9 10l2 2 4-4',
  royalty: 'M9 18V6l11-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
  rent: 'M3 11l9-7 9 7M5 9.5V20h14V9.5M14.5 14.5a2 2 0 1 1-2-2M12.5 14.5h6M17 14.5V17',
  professional: 'M6 3v6a4 4 0 0 0 8 0V3M6 3H5M14 3h1M10 13v3a5 5 0 0 0 10 0v-2M20 12a2 2 0 1 0 0 .01',
  contract: 'M14 6l4 4M3 21l8.5-8.5M12 4l6 6-3 3-6-6zM16.5 11.5l2 2',
  business: 'M4 9l1.5-5h13L20 9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5 11v9h14v-9M10 20v-5h4v5',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  family: 'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 8-4',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM12 9.5c-1-1.6-4-1-4 1.2 0 1.8 4 4.3 4 4.3s4-2.5 4-4.3c0-2.2-3-2.8-4-1.2z',
  saving: 'M4 20V10M10 20V6M16 20v-8M22 20H2M16 8l3-3 3 3M19 5v8',
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h2M14 14h2M8 17h2',
  rules: 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM8 21h8',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  share: 'M12 3v12M8 7l4-4 4 4M5 12v8h14v-8',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  coins: 'M8 8c3.3 0 6-1.1 6-2.5S11.3 3 8 3 2 4.1 2 5.5 4.7 8 8 8zM2 5.5v4C2 10.9 4.7 12 8 12s6-1.1 6-2.5v-4M10 15.8c-.6.1-1.3.2-2 .2-3.3 0-6-1.1-6-2.5v-4M16 21c3.3 0 6-1.1 6-2.5v-6M10 12.5v6c0 1.4 2.7 2.5 6 2.5M16 15c3.3 0 6-1.1 6-2.5S19.3 10 16 10s-6 1.1-6 2.5 2.7 2.5 6 2.5z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={PATHS[name]} />
    </svg>
  )
}

/** ไอคอนในกรอบสีอ่อน ใช้หน้าหัวข้อแต่ละหมวด */
export function IconTile({ name, size = 40 }: { name: IconName; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent" style={{ width: size, height: size }}>
      <Icon name={name} size={Math.round(size * 0.55)} />
    </span>
  )
}
