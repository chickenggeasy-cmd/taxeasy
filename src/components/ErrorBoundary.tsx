import { Component, type ReactNode } from 'react'

/** ถ้าหน้าจอพังระหว่างใช้งาน แสดงข้อความพร้อมทางแก้แทนหน้าขาว */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[TaxEasy]', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    const resetData = () => {
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith('taxeasy:') && !k.startsWith('taxeasy:input:')) localStorage.removeItem(k)
      } catch {
        // ignore
      }
      location.reload()
    }
    return (
      <div className="gutter mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-4 py-10 text-center">
        <h1 className="font-display text-2xl font-semibold">ขอโทษครับ หน้านี้เกิดข้อผิดพลาด</h1>
        <p className="text-muted">ข้อมูลที่คุณกรอกยังอยู่ครบ ลองโหลดใหม่ ถ้ายังไม่หาย ให้กดล้างการตั้งค่า (ไม่ลบตัวเลขที่กรอก)</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => location.reload()} className="rounded-2xl bg-accent px-5 py-3 font-semibold text-accent-ink">
            โหลดใหม่
          </button>
          <button type="button" onClick={resetData} className="rounded-2xl border border-line px-5 py-3 font-semibold">
            ล้างการตั้งค่าแล้วโหลดใหม่
          </button>
        </div>
        <p className="text-xs break-words text-muted">รายละเอียด: {this.state.error.message}</p>
      </div>
    )
  }
}
