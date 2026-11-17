import type { ReactNode } from 'react'
import { IconTile, type IconName } from '../components/icons'
import { PageHero } from '../components/ui'
import { useLang, useT } from '../lib/lang'

const UPDATED: [string, string] = ['30 ต.ค. 2569', '30 Oct 2569 (2026)']

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
  const t = useT()
  return (
    <div className="rounded-2xl bg-paper p-3">
      <p className="font-semibold">{title}</p>
      <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">{t('ส่งอะไร', 'What')}</dt>
        <dd>{what}</dd>
        <dt className="text-muted">{t('ส่งไปที่', 'Sent to')}</dt>
        <dd>{where}</dd>
        <dt className="text-muted">{t('เก็บไว้', 'Kept')}</dt>
        <dd>{keep}</dd>
      </dl>
    </div>
  )
}

/** นโยบายความเป็นส่วนตัว ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) — ต้องแก้ข้อความนี้ทุกครั้งที่แอปเปลี่ยนวิธีเก็บหรือส่งข้อมูล (ทั้งสองภาษา) */
export function Privacy({ onBack, onFeedback }: { onBack: () => void; onFeedback: () => void }) {
  const t = useT()
  const en = useLang() === 'en'
  return (
    <div className="anim-stagger flex flex-col gap-4">
      <button type="button" onClick={onBack} className="self-start rounded-xl px-1 text-sm font-semibold text-accent">
        {t('← กลับ', '← Back')}
      </button>
      <PageHero
        art="more"
        title={t('ความเป็นส่วนตัว', 'Privacy')}
        subtitle={t(`ข้อมูลของคุณอยู่ที่ไหน และถูกส่งไปไหนบ้าง · ปรับปรุงล่าสุด ${UPDATED[0]}`, `Where your data is kept and where it goes · last updated ${UPDATED[1]}`)}
      />

      <section className="rounded-3xl bg-refund-soft p-5">
        <p className="font-display text-lg font-semibold text-refund">{t('สรุปสั้น ๆ', 'In short')}</p>
        {en ? (
          <p className="mt-1 text-[15px]">
            The income and deduction figures you enter are <b>kept only on your device</b>. The app has no sign-up, no ads and no usage trackers. Data leaves your device
            only when you use one of these 3 features yourself: asking Nong Phasi, scanning a 50 Tawi, and reporting a problem.
          </p>
        ) : (
          <p className="mt-1 text-[15px]">
            ตัวเลขรายได้และค่าลดหย่อนที่กรอก <b>เก็บอยู่ในเครื่องของคุณเท่านั้น</b> แอปไม่มีระบบสมัครสมาชิก ไม่มีโฆษณา และไม่มีตัวติดตามการใช้งาน
            ข้อมูลจะออกจากเครื่องเฉพาะตอนที่คุณกดใช้ 3 อย่างนี้เอง: ถามน้องภาษี, สแกน 50 ทวิ และแจ้งปัญหา
          </p>
        )}
      </section>

      <Block icon="lock" title={t('ข้อมูลที่เก็บในเครื่องของคุณ', 'Data kept on your device')}>
        <p>
          {t(
            'แอปเก็บข้อมูลเหล่านี้ไว้ในเบราว์เซอร์ของเครื่องที่ใช้ (localStorage) ไม่ได้ส่งขึ้นเซิร์ฟเวอร์:',
            'The app keeps this data in the browser on this device (localStorage). It is not sent to a server:',
          )}
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>{t('รายได้ ค่าลดหย่อน และข้อมูลครอบครัวที่กรอก แยกตามปีภาษี', 'Income, deductions and family details you enter, for each tax year')}</li>
          <li>{t('รายการเอกสารที่ติ๊กว่าเตรียมแล้ว', 'The documents you ticked as ready')}</li>
          <li>{t('การตั้งค่า เช่น ธีม ปีภาษี และการเลือกว่าจะส่งตัวเลขให้น้องภาษีหรือไม่', 'Settings such as theme, tax year, and whether to share your figures with Nong Phasi')}</li>
          <li>{t('กฎภาษีล่าสุดที่ดาวน์โหลดมา เพื่อให้ใช้แบบออฟไลน์ได้', 'The latest tax rules downloaded, so the app works offline')}</li>
        </ul>
        {en ? (
          <p>
            <b>Delete it yourself:</b> More tab → “Clear data for…”, or clear the site data in your browser settings. Backup files and share images are created on your
            device; the app keeps no copy.
          </p>
        ) : (
          <p>
            <b>ลบได้เอง:</b> แท็บเพิ่มเติม → "ล้างข้อมูลปี…" หรือล้างข้อมูลเว็บไซต์ในการตั้งค่าเบราว์เซอร์ ไฟล์สำรองข้อมูลและรูปที่แชร์สร้างในเครื่องของคุณ แอปไม่ได้เก็บสำเนา
          </p>
        )}
      </Block>

      <Block icon="send" title={t('ข้อมูลที่ส่งออกจากเครื่อง', 'Data that leaves your device')}>
        <Flow
          title={t('ถามน้องภาษี (AI ผู้ช่วย)', 'Asking Nong Phasi (AI assistant)')}
          what={t(
            'คำถามที่พิมพ์ และถ้าคุณกดอนุญาต จะส่งสรุปรายได้ ค่าลดหย่อน และผลคำนวณไปด้วย ไม่มีชื่อหรือเลขบัตรประชาชน',
            'Your question and, if you allow it, a summary of your income, deductions and result. No name or ID number.',
          )}
          where={t(
            'เซิร์ฟเวอร์ของแอป ส่งต่อให้ Anthropic ผู้ให้บริการ AI Claude ซึ่งประมวลผลบนเซิร์ฟเวอร์นอกประเทศไทย',
            "The app's server, which passes it to Anthropic, the provider of the Claude AI. It is processed on servers outside Thailand.",
          )}
          keep={t(
            'เซิร์ฟเวอร์ของแอปไม่เก็บข้อความ เก็บเฉพาะจำนวนครั้งที่ใช้กับรหัสเครื่องที่แปลงแล้วย้อนกลับไม่ได้ (hash) ไว้ 90 วัน เพื่อจำกัดการใช้งานต่อวัน',
            "The app's server does not keep messages. It only keeps a usage count against a one-way hashed device code for 90 days, to apply the daily limit.",
          )}
        />
        <Flow
          title={t('สแกนใบ 50 ทวิ', 'Scanning a 50 Tawi')}
          what={t('รูปถ่ายหรือไฟล์ PDF ของใบ 50 ทวิ (รูปถูกย่อขนาดในเครื่องก่อนส่ง)', 'A photo or PDF of the 50 Tawi (photos are shrunk on your device before sending)')}
          where={t('เซิร์ฟเวอร์ของแอป ส่งต่อให้ Anthropic เพื่ออ่านตัวเลข', "The app's server, which passes it to Anthropic to read the figures")}
          keep={t(
            'ไม่เก็บไฟล์บนเซิร์ฟเวอร์ ตัวเลขที่อ่านได้ส่งกลับมาให้คุณตรวจก่อนใส่ และนับรวมในจำนวนครั้งที่ใช้ AI',
            'The file is not kept on the server. The figures come back for you to check before adding them, and the scan counts toward your AI usage.',
          )}
        />
        <p className="rounded-2xl border border-dashed border-line px-3 py-2 text-sm">
          {t(
            'ใบ 50 ทวิ มีชื่อและเลขประจำตัวผู้เสียภาษีของคุณ AI ไม่จำเป็นต้องใช้ข้อมูลเหล่านี้ ถ้าไม่อยากส่ง ใช้กระดาษปิดทับก่อนถ่ายรูปได้เลย',
            'A 50 Tawi shows your name and tax ID number. The AI does not need them, so cover them with paper before taking the photo if you prefer.',
          )}
        </p>
        <Flow
          title={t('แจ้งปัญหา', 'Reporting a problem')}
          what={t(
            'หัวข้อและรายละเอียดที่เขียน ช่องทางติดต่อ (ถ้าใส่) ปีภาษี และสรุปตัวเลข (เฉพาะเมื่อติ๊กแนบ)',
            'The topic and details you write, your contact (if given), the tax year, and a figures summary (only if you tick attach)',
          )}
          where={t('ฐานข้อมูลของแอป ทีมผู้ดูแลอ่านได้ผ่านหน้าหลังบ้าน', "The app's database, readable by the team through the admin pages")}
          keep={t('ลบอัตโนมัติเมื่อครบ 1 ปี หรือเร็วกว่านั้นเมื่อทีมแก้เรื่องเสร็จและลบออก', 'Deleted automatically after 1 year, or sooner once the team resolves and removes it')}
        />
        <Flow
          title={t('กฎภาษีและข้อมูลตลาดหุ้น', 'Tax rules and market data')}
          what={t('ไม่มีข้อมูลส่วนตัว แอปแค่ดาวน์โหลดข้อมูลมาแสดง', 'No personal data; the app only downloads data to show')}
          where={t('เซิร์ฟเวอร์ของแอป (ข้อมูลหุ้นเซิร์ฟเวอร์ดึงจาก Yahoo Finance ให้อีกที)', "The app's server (it fetches market data from Yahoo Finance)")}
          keep="—"
        />
        <p className="text-sm text-muted">
          {t(
            'เหมือนเว็บไซต์ทั่วไป เว็บเซิร์ฟเวอร์อาจบันทึกข้อมูลการเข้าใช้ เช่น หมายเลข IP เวลา และหน้าที่เปิด ตามการตั้งค่ามาตรฐานของเซิร์ฟเวอร์',
            'As with most websites, the web server may log visits, such as IP address, time and pages opened, under its standard settings.',
          )}
        </p>
      </Block>

      <Block icon="shield" title={t('ข้อมูลที่ส่งให้ Anthropic', 'Data sent to Anthropic')}>
        <p>
          {t(
            'ตามเงื่อนไขการใช้งาน API ของ Anthropic ข้อมูลที่ส่งผ่าน API จะไม่ถูกนำไปใช้ฝึก AI โดยค่าเริ่มต้น อ่านรายละเอียดวิธีที่ Anthropic เก็บและดูแลข้อมูลได้ที่',
            "Under Anthropic's API terms, data sent through the API is not used to train AI by default. Read how Anthropic stores and handles data in the",
          )}{' '}
          <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
            {t('นโยบายความเป็นส่วนตัวของ Anthropic', 'Anthropic privacy policy')}
          </a>
        </p>
        <p className="text-sm text-muted">
          {t(
            'ถ้าไม่ต้องการให้ข้อมูลออกนอกเครื่องเลย ใช้แอปได้ครบทุกอย่างโดยไม่ต้องใช้น้องภาษีและการสแกน การคำนวณภาษีทำในเครื่องทั้งหมด',
            'If you do not want any data to leave your device, everything except Nong Phasi and scanning still works. All tax calculations run on your device.',
          )}
        </p>
      </Block>

      <Block icon="profile" title={t('สิทธิของคุณ', 'Your rights')}>
        <p>
          {t(
            'ตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล คุณขอดู ขอแก้ไข หรือขอให้ลบข้อมูลที่เคยส่งผ่านหน้าแจ้งปัญหาได้',
            "Under Thailand's Personal Data Protection Act, you can ask to see, correct or delete data you sent through the problem report page.",
          )}
        </p>
        <p>
          {t(
            'แอปไม่มีระบบบัญชีผู้ใช้ ทีมจึงไม่รู้ว่าเรื่องไหนเป็นของใคร เวลาขอ ให้บอกวันที่ส่งและข้อความโดยประมาณ ส่วนข้อมูลในเครื่องคุณลบได้เองทันที',
            'The app has no user accounts, so the team cannot tell whose report is whose. When you ask, give the date you sent it and roughly what it said. Data on your device you can delete yourself straight away.',
          )}
        </p>
        <button type="button" onClick={onFeedback} className="self-start rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">
          {t('ติดต่อทีมผ่านหน้าแจ้งปัญหา', 'Contact the team via the report page')}
        </button>
      </Block>

      <p className="px-1 text-xs text-muted">
        {t(
          'ผู้ดูแลข้อมูล: ทีมผู้พัฒนาโครงงาน ภาษีง่ายๆ (TaxEasy) · ถ้าแอปเปลี่ยนวิธีเก็บหรือส่งข้อมูล จะแก้หน้านี้และวันที่ปรับปรุงด้านบน',
          'Data controller: the TaxEasy project team · If the app changes how it stores or sends data, this page and the date above will be updated.',
        )}
      </p>
    </div>
  )
}
