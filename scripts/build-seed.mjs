// สร้าง database/seed.sql จากไฟล์ rules/*.json ให้ข้อมูลในฐานข้อมูลตรงกับกฎที่ติดมากับแอป
// แล้วคัดลอกไฟล์ฐานข้อมูลไปไว้ใน dist/ พร้อมนำไปวางใน XAMPP
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const sqlString = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "''") + "'"

const files = readdirSync('rules').filter((f) => /^\d{4}\.json$/.test(f)).sort()
const rows = files.map((f) => {
  const json = readFileSync(`rules/${f}`, 'utf8')
  const r = JSON.parse(json)
  return `(${r.taxYear}, ${r.revision}, 'published', ${sqlString(JSON.stringify(r))}, ${sqlString('ข้อมูลตั้งต้นจากไฟล์ rules/' + f)}, NOW())`
})

const sql = `-- สร้างอัตโนมัติจาก rules/*.json (npm run seed) — อย่าแก้ไฟล์นี้ด้วยมือ
SET NAMES utf8mb4;
USE taxeasy;
INSERT INTO rule_sets (tax_year, revision, status, rules_json, change_note, published_at) VALUES
${rows.join(',\n')};
`
writeFileSync('database/seed.sql', sql)
console.log(`database/seed.sql: ${files.length} ปีภาษี (${files.join(', ')})`)

if (existsSync('dist')) {
  mkdirSync('dist/database', { recursive: true })
  for (const f of ['schema.sql', 'seed.sql']) copyFileSync(`database/${f}`, `dist/database/${f}`)
  copyFileSync('README.md', 'dist/README.md')
}
