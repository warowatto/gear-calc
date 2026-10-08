// 예전 버전이 처음부터 넣어 두던 예시 값(기계 "호빙머신 1", 기본 변환기어 36종)을 한 번만 지운다.
// 사용자가 손댄 값이나 기어 기록에 쓰인 기계는 그대로 둔다.
const KEY = 'gear-calc:workshop'
const DONE = 'gear-calc:removed-sample-defaults'
const SAMPLE_GEARS = [
  20, 23, 24, 25, 30, 33, 34, 35, 37, 40, 41, 43, 45, 47, 50, 53, 55, 57, 59, 60,
  61, 65, 67, 70, 71, 73, 75, 79, 80, 83, 85, 89, 90, 95, 97, 100,
]

export default defineNuxtPlugin(() => {
  try {
    if (localStorage.getItem(DONE)) return
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const ws = JSON.parse(raw)
      const used = new Set<string>(
        (JSON.parse(localStorage.getItem('gear-calc:gears') ?? '{"list":[]}').list ?? []).map((g: { hob?: { machineId?: string } }) => g.hob?.machineId),
      )
      ws.machines = (ws.machines ?? []).filter((m: Record<string, unknown>) => !(
        m.id === 'default' && m.name === '호빙머신 1' && m.indexConstant === 24 && m.differentialConstant === 7.95775 && !used.has('default')
      ))
      const gears: { teeth: number, qty: number }[] = ws.gears ?? []
      const untouched = gears.length === SAMPLE_GEARS.length
        && gears.every((g, i) => g.teeth === SAMPLE_GEARS[i] && g.qty === 1)
      if (untouched) ws.gears = []
      localStorage.setItem(KEY, JSON.stringify(ws))
    }
    localStorage.setItem(DONE, '1')
  }
  catch {}
})
