import type { ReactNode } from 'react'
import { IconTile, type IconName } from '../components/icons'
import { PageHero } from '../components/ui'

const UPDATED = '30 ต.ค. 2569'

function Block({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <IconTile name={icon} />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col gap-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  )
}

function Flow({ title, what, where, keep }: { title: string; what: string; where: string; keep: string }) {
  return (
    <div className="rounded-2xl bg-paper p-3">
      <p className="font-semibold">{title}</p>
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">ส่งอะไร</dt>
        <dd>{what}</dd>
        <dt className="text-muted">ส่งไปที่</dt>
        <dd>{where}</dd>
        <dt className="text-muted">เก็บไว้</dt>
        <dd>{keep}</dd>
      </dl>
    </div>
  )
}

/** นโยบายความเป็นส่วนตัว ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) — ต้องแก้ข้อความนี้ทุกครั้งที่แอปเปลี่ยนวิธีเก็บหรือส่งข้อมูล */
export function Privacy({ onBack, onFeedback }: { onBack: () => void; onFeedback: () => void }) {
  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        ← กลับ
      </button>
      <PageHero art="more" title="ความเป็นส่วนตัว" subtitle={`ข้อมูลของคุณอยู่ที่ไหน และถูกส่งไปไหนบ้าง · ปรับปรุงล่าสุด ${UPDATED}`} />

      <section className="rounded-3xl bg-refund-soft p-5">
        <p className="font-display text-lg font-semibold text-refund">สรุปสั้น ๆ</p>
        <p className="mt-1 text-[15px]">
          ตัวเลขรายได้และค่าลดหย่อนที่กรอก <b>เก็บอยู่ในเครื่องของคุณเท่านั้น</b> แอปไม่มีระบบสมัครสมาชิก ไม่มีโฆษณา และไม่มีตัวติดตามการใช้งาน
          ข้อมูลจะออกจากเครื่องเฉพาะตอนที่คุณกดใช้ 3 อย่างนี้เอง: ถามน้องภาษี, สแกน 50 ทวิ และแจ้งปัญหา
        </p>
      </section>

      <Block icon="lock" title="ข้อมูลที่เก็บในเครื่องของคุณ">
        <p>แอปเก็บข้อมูลเหล่านี้ไว้ในเบราว์เซอร์ของเครื่องที่ใช้ (localStorage) ไม่ได้ส่งขึ้นเซิร์ฟเวอร์:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>รายได้ ค่าลดหย่อน และข้อมูลครอบครัวที่กรอก แยกตามปีภาษี</li>
          <li>รายการเอกสารที่ติ๊กว่าเตรียมแล้ว</li>
          <li>การตั้งค่า เช่น ธีม ปีภาษี และการเลือกว่าจะส่งตัวเลขให้น้องภาษีหรือไม่</li>
          <li>กฎภาษีล่าสุดที่ดาวน์โหลดมา เพื่อให้ใช้แบบออฟไลน์ได้</li>
        </ul>
        <p>
          <b>ลบได้เอง:</b> แท็บเพิ่มเติม → "ล้างข้อมูลปี…" หรือล้างข้อมูลเว็บไซต์ในการตั้งค่าเบราว์เซอร์ ไฟล์สำรองข้อมูลและรูปที่แชร์สร้างในเครื่องของคุณ แอปไม่ได้เก็บสำเนา
        </p>
      </Block>

      <Block icon="send" title="ข้อมูลที่ส่งออกจากเครื่อง">
        <Flow
          title="ถามน้องภาษี (AI ผู้ช่วย)"
          what="คำถามที่พิมพ์ และถ้าคุณกดอนุญาต จะส่งสรุปรายได้ ค่าลดหย่อน และผลคำนวณไปด้วย ไม่มีชื่อหรือเลขบัตรประชาชน"
          where="เซิร์ฟเวอร์ของแอป ส่งต่อให้ Anthropic ผู้ให้บริการ AI Claude ซึ่งประมวลผลบนเซิร์ฟเวอร์นอกประเทศไทย"
          keep="เซิร์ฟเวอร์ของแอปไม่เก็บข้อความ เก็บเฉพาะจำนวนครั้งที่ใช้กับรหัสเครื่องที่แปลงแล้วย้อนกลับไม่ได้ (hash) ไว้ 90 วัน เพื่อจำกัดการใช้งานต่อวัน"
        />
        <Flow
          title="สแกนใบ 50 ทวิ"
          what="รูปถ่ายหรือไฟล์ PDF ของใบ 50 ทวิ (รูปถูกย่อขนาดในเครื่องก่อนส่ง)"
          where="เซิร์ฟเวอร์ของแอป ส่งต่อให้ Anthropic เพื่ออ่านตัวเลข"
          keep="ไม่เก็บไฟล์บนเซิร์ฟเวอร์ ตัวเลขที่อ่านได้ส่งกลับมาให้คุณตรวจก่อนใส่ และนับรวมในจำนวนครั้งที่ใช้ AI"
        />
        <p className="rounded-2xl border border-dashed border-line px-3 py-2 text-sm">
          ใบ 50 ทวิ มีชื่อและเลขประจำตัวผู้เสียภาษีของคุณ AI ไม่จำเป็นต้องใช้ข้อมูลเหล่านี้ ถ้าไม่อยากส่ง ใช้กระดาษปิดทับก่อนถ่ายรูปได้เลย
        </p>
        <Flow
          title="แจ้งปัญหา"
          what="หัวข้อและรายละเอียดที่เขียน ช่องทางติดต่อ (ถ้าใส่) ปีภาษี และสรุปตัวเลข (เฉพาะเมื่อติ๊กแนบ)"
          where="ฐานข้อมูลของแอป ทีมผู้ดูแลอ่านได้ผ่านหน้าหลังบ้าน"
          keep="ลบอัตโนมัติเมื่อครบ 1 ปี หรือเร็วกว่านั้นเมื่อทีมแก้เรื่องเสร็จและลบออก"
        />
        <Flow
          title="กฎภาษีและข้อมูลตลาดหุ้น"
          what="ไม่มีข้อมูลส่วนตัว แอปแค่ดาวน์โหลดข้อมูลมาแสดง"
          where="เซิร์ฟเวอร์ของแอป (ข้อมูลหุ้นเซิร์ฟเวอร์ดึงจาก Yahoo Finance ให้อีกที)"
          keep="—"
        />
        <p className="text-sm text-muted">
          เหมือนเว็บไซต์ทั่วไป เว็บเซิร์ฟเวอร์อาจบันทึกข้อมูลการเข้าใช้ เช่น หมายเลข IP เวลา และหน้าที่เปิด ตามการตั้งค่ามาตรฐานของเซิร์ฟเวอร์
        </p>
      </Block>

      <Block icon="shield" title="ข้อมูลที่ส่งให้ Anthropic">
        <p>
          ตามเงื่อนไขการใช้งาน API ของ Anthropic ข้อมูลที่ส่งผ่าน API จะไม่ถูกนำไปใช้ฝึก AI โดยค่าเริ่มต้น อ่านรายละเอียดวิธีที่ Anthropic เก็บและดูแลข้อมูลได้ที่{' '}
          <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
            นโยบายความเป็นส่วนตัวของ Anthropic
          </a>
        </p>
        <p className="text-sm text-muted">ถ้าไม่ต้องการให้ข้อมูลออกนอกเครื่องเลย ใช้แอปได้ครบทุกอย่างโดยไม่ต้องใช้น้องภาษีและการสแกน การคำนวณภาษีทำในเครื่องทั้งหมด</p>
      </Block>

      <Block icon="profile" title="สิทธิของคุณ">
        <p>ตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล คุณขอดู ขอแก้ไข หรือขอให้ลบข้อมูลที่เคยส่งผ่านหน้าแจ้งปัญหาได้</p>
        <p>
          แอปไม่มีระบบบัญชีผู้ใช้ ทีมจึงไม่รู้ว่าเรื่องไหนเป็นของใคร เวลาขอ ให้บอกวันที่ส่งและข้อความโดยประมาณ ส่วนข้อมูลในเครื่องคุณลบได้เองทันที
        </p>
        <button type="button" onClick={onFeedback} className="self-start rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
          ติดต่อทีมผ่านหน้าแจ้งปัญหา
        </button>
      </Block>

      <p className="px-1 text-xs text-muted">
        ผู้ดูแลข้อมูล: ทีมผู้พัฒนาโครงงาน ภาษีง่ายๆ (TaxEasy) · ถ้าแอปเปลี่ยนวิธีเก็บหรือส่งข้อมูล จะแก้หน้านี้และวันที่ปรับปรุงด้านบน
      </p>
    </div>
  )
}
