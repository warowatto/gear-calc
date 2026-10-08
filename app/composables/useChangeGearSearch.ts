import type { Ref } from 'vue'
import {
  differentialRatio,
  helixFromDifferential,
  indexRatio,
  isExact,
  searchChangeGears,
  toggleExcluded,
  usableCount,
  usableGearList,
  type GearCombo,
} from '~/utils/changeGears'

/** 기어 한 개에 대한 분할·차동 변환기어 탐색 */
export function useChangeGearSearch(gear: Ref<GearRecord>) {
  const workshop = useWorkshop()
  const spec = computed(() => toCalcSpec(gear.value.spec))
  const hob = computed(() => gear.value.hob)

  const machine = computed(() => workshop.value.machines.find(m => m.id === hob.value.machineId))
  const helical = computed(() => spec.value.helixAngle > 0)

  // ── 이번 작업에 쓸 변환기어 (보유 목록 − 뺀 것). 같은 잇수가 여러 개면 일부만 뺄 수 있다 ──
  /** 이 잇수를 이번에 몇 개 쓸 수 있는지 */
  const usableOf = (g: OwnedGear) => usableCount(g.teeth, g.qty, hob.value.excluded)
  const usableGears = computed(() => usableGearList(workshop.value.gears, hob.value.excluded))
  const usableKinds = computed(() => workshop.value.gears.filter(g => usableOf(g) > 0).length)

  /** 누를 때마다 하나씩 빼고(2 → 1 → 0), 다 빠져 있으면 모두 되돌린다 */
  function toggleGear(g: OwnedGear) {
    hob.value.excluded = toggleExcluded(hob.value.excluded, g.teeth, g.qty)
  }

  const searchOpts = computed(() => ({
    gears: usableGears.value,
    twoStage: machine.value?.twoStage ?? true,
    clearance: machine.value?.useClearance && isNumber(machine.value.clearance) ? machine.value.clearance : null,
    limit: 10,
  }))

  const indexTarget = computed(() => {
    const K = machine.value?.indexConstant
    const n = hob.value.starts
    const { teeth } = spec.value
    return isPositive(teeth) && isPositive(K) && isPositive(n) ? indexRatio(K, n, teeth) : null
  })

  const diffTarget = computed(() => {
    const K = machine.value?.differentialConstant
    const n = hob.value.starts
    const { module, helixAngle } = spec.value
    if (!helical.value || !isPositive(module) || !isPositive(K) || !isPositive(n)) return null
    return differentialRatio(K, helixAngle, module, n)
  })

  // 목표 기어비에 영향을 주는 값이 바뀌면 전에 고른 조합은 맞지 않으므로 지운다
  const indexKey = computed(() => [spec.value.teeth, hob.value.machineId, hob.value.starts].join())
  const diffKey = computed(() => [spec.value.module, spec.value.helixAngle, hob.value.machineId, hob.value.starts].join())
  watch(indexKey, () => {
    hob.value.index = null
  })
  watch(diffKey, () => {
    hob.value.diff = null
  })

  // ── 조합 탐색: Web Worker에서 돌리고, 오래 걸리면(0.2초 넘게) 로딩을 보여준다 ──
  const indexCombos = ref<GearCombo[]>([])
  const diffCombos = ref<GearCombo[]>([])
  const searching = ref(false)
  const showLoading = ref(false)

  let worker: Worker | null = null
  try {
    worker = new Worker(new URL('../workers/changeGearSearch.worker.ts', import.meta.url), { type: 'module' })
  }
  catch {
    worker = null // Worker를 못 쓰면 화면 스레드에서 계산
  }

  let requestId = 0
  let debounce: ReturnType<typeof setTimeout> | undefined
  let loadingDelay: ReturnType<typeof setTimeout> | undefined

  function finish(id: number, results: GearCombo[][]) {
    if (id !== requestId) return // 그 사이 입력이 바뀐 옛 결과는 버린다
    indexCombos.value = results[0] ?? []
    diffCombos.value = results[1] ?? []
    searching.value = false
    showLoading.value = false
    clearTimeout(loadingDelay)
  }

  worker?.addEventListener('message', (e: MessageEvent<{ id: number, results: GearCombo[][] }>) => {
    finish(e.data.id, e.data.results)
  })

  function run() {
    const id = ++requestId
    const opts = JSON.parse(JSON.stringify(searchOpts.value))
    const jobs = [
      { target: indexTarget.value, opts },
      { target: diffTarget.value, opts },
    ]
    if (worker) {
      worker.postMessage({ id, jobs })
    }
    else {
      // 로딩 표시가 먼저 그려지도록 한 박자 쉬고 계산
      setTimeout(() => finish(id, jobs.map(j => (j.target ? searchChangeGears(j.target, j.opts) : []))), 0)
    }
  }

  // 입력이 바뀌면 잠깐 기다렸다가(연속 입력 묶기) 다시 찾는다
  watch([indexTarget, diffTarget, searchOpts], () => {
    searching.value = true
    clearTimeout(loadingDelay)
    loadingDelay = setTimeout(() => {
      if (searching.value) showLoading.value = true
    }, 200)
    clearTimeout(debounce)
    debounce = setTimeout(run, 150)
  }, { immediate: true, deep: true })

  onScopeDispose(() => {
    clearTimeout(debounce)
    clearTimeout(loadingDelay)
    worker?.terminate()
  })

  const hasExactIndex = computed(() => indexCombos.value.some(isExact))

  /** 차동 조합으로 실제 가공되는 비틀림각과 오차(초) */
  const actualHelix = (c: GearCombo) => {
    if (!machine.value) return ''
    const beta = helixFromDifferential(c.ratio, machine.value.differentialConstant, spec.value.module, hob.value.starts)
    const errSec = (beta - spec.value.helixAngle) * 3600
    return `${toDms(beta)} (${errSec >= 0 ? '+' : ''}${errSec.toFixed(1)}″)`
  }

  return {
    workshop, spec, machine, helical,
    usableOf, usableKinds, toggleGear,
    indexTarget, diffTarget, indexCombos, diffCombos, hasExactIndex, searching, showLoading,
    actualHelix,
  }
}

/** 오차율 [%]. 정확하면 0% */
export function errorPercent(c: GearCombo) {
  if (isExact(c)) return '0%'
  const p = c.error * 100
  return `${p > 0 ? '+' : ''}${p.toFixed(5)}%`
}
