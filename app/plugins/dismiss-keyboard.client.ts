// 키보드가 올라와 있을 때 화면의 빈 곳을 탭하면 입력을 끝내 키보드를 내린다.
// (아이폰은 빈 곳을 눌러도 키보드가 그대로 남는다)
// - 끌어서 스크롤할 때는 내리지 않는다: 손가락이 거의 움직이지 않은 "탭"만
// - 버튼·링크·입력칸·스위치 등을 누를 때는 원래 동작을 따른다 (예: [+/−] 버튼은 키보드를 유지해야 이어서 친다)
const INTERACTIVE = 'input, textarea, select, button, a, label, [role="button"], [role="switch"], [role="radio"], [role="tab"], [contenteditable="true"]'
const TAP_SLOP = 10 // px

export default defineNuxtPlugin(() => {
  let start: { x: number, y: number, target: EventTarget | null } | null = null

  const isTyping = () => {
    const el = document.activeElement
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable
  }

  window.addEventListener('pointerdown', (e) => {
    start = isTyping() ? { x: e.clientX, y: e.clientY, target: e.target } : null
  }, { passive: true })

  window.addEventListener('pointerup', (e) => {
    if (!start) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_SLOP
    const target = start.target as Element | null
    start = null
    if (moved || !target || target.closest(INTERACTIVE)) return
    ;(document.activeElement as HTMLElement | null)?.blur()
  }, { passive: true })

  window.addEventListener('pointercancel', () => {
    start = null
  }, { passive: true })
})
