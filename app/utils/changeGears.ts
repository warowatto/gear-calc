// 호빙머신 변환기어(분할·차동) 조합 탐색

export interface GearCombo {
  a: number
  b: number
  /** 2단 조합일 때만 존재 */
  c?: number
  d?: number
  ratio: number
  /** 상대오차 (ratio − target) / target */
  error: number
}

export interface SearchOptions {
  /** 보유 변환기어 잇수 목록. 같은 잇수를 2개 가지고 있으면 2번 적는다 */
  gears: number[]
  /** 2단(A/B × C/D) 조합 탐색 여부. false면 A/B 1단만 */
  twoStage: boolean
  /** 간섭 조건 여유 (A+B ≥ C+여유, C+D ≥ B+여유). null이면 검사 안 함 */
  clearance: number | null
  /** 반환할 최대 개수 */
  limit: number
}

/** 분할 기어비 = 분할상수 × 호브 줄수 / 잇수 */
export const indexRatio = (constant: number, starts: number, teeth: number) =>
  (constant * starts) / teeth

/** 차동 기어비 = 차동상수 × sinβ / (모듈 × 호브 줄수) */
export const differentialRatio = (constant: number, helixDeg: number, module: number, starts: number) =>
  (constant * Math.sin((helixDeg * Math.PI) / 180)) / (module * starts)

/** 차동 기어비로부터 실제로 가공되는 비틀림각 [deg] */
export const helixFromDifferential = (ratio: number, constant: number, module: number, starts: number) =>
  (Math.asin(Math.min(1, (ratio * module * starts) / constant)) * 180) / Math.PI

/**
 * 목표 기어비에 가까운 조합 상위 limit개.
 * 2단은 A·B·C를 고르면 정확히 맞는 D(= A·C / (B·목표))가 정해지므로, 보유 잇수 중 그 값의
 * 위아래로 가까운 것 몇 개만 본다. 7~120처럼 100종이 넘어도 O(n³ log n)이라 바로 끝난다.
 */
export function searchChangeGears(target: number, opts: SearchOptions): GearCombo[] {
  // 잇수별 보유 수량 (잇수를 인덱스로 쓰는 배열이 Map보다 빠르다)
  const valid = opts.gears.filter(g => Number.isInteger(g) && g > 0)
  const counts = new Uint16Array((valid.length ? Math.max(...valid) : 0) + 1)
  for (const g of valid) counts[g]!++
  const teeth = [...new Set(valid)].sort((x, y) => x - y)
  const n = teeth.length
  const clearance = opts.clearance

  const results: GearCombo[] = []
  // 오차 기준 상위 limit개만 유지. worst = 지금 limit번째 오차 (꽉 차기 전엔 무한대)
  let worst = Infinity
  const push = (combo: GearCombo) => {
    const key = keyOf(combo)
    if (results.some(r => keyOf(r) === key)) return
    results.push(combo)
    results.sort(compare)
    if (results.length > opts.limit) results.pop()
    worst = results.length >= opts.limit ? Math.abs(results[results.length - 1]!.error) : Infinity
  }

  // 한쪽 방향으로 이만큼 후보를 본다 (같은 A·B·C에서 덜 가까운 D는 거의 순위에 못 든다)
  const PER_SIDE = 3

  for (const a of teeth) {
    for (const b of teeth) {
      if (counts[b]! <= +(b === a)) continue
      const r1 = a / b

      if (!opts.twoStage) {
        const error = (r1 - target) / target
        if (Math.abs(error) <= worst) push({ a, b, ratio: r1, error })
        continue
      }

      for (const c of teeth) {
        if (counts[c]! <= +(c === a) + +(c === b)) continue
        if (clearance !== null && a + b < c + clearance) continue
        const minD = clearance !== null ? b + clearance - c : -Infinity
        const rc = r1 * c

        // 정확히 맞는 D 위치 (teeth[i] >= ideal 인 첫 칸)
        const ideal = rc / target
        let lo = 0
        let hi = n
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (teeth[mid]! < ideal) lo = mid + 1
          else hi = mid
        }

        // ideal에서 멀어질수록 오차가 커지므로, 이미 상위권보다 나쁘면 그 방향은 그만 본다
        for (let j = lo, found = 0; j < n && found < PER_SIDE; j++) {
          const d = teeth[j]!
          if (d < minD || counts[d]! <= +(d === a) + +(d === b) + +(d === c)) continue
          const error = rc / d / target - 1
          if (Math.abs(error) > worst) break
          push({ a, b, c, d, ratio: rc / d, error })
          found++
        }
        for (let j = lo - 1, found = 0; j >= 0 && found < PER_SIDE; j--) {
          const d = teeth[j]!
          if (d < minD) break
          if (counts[d]! <= +(d === a) + +(d === b) + +(d === c)) continue
          const error = rc / d / target - 1
          if (Math.abs(error) > worst) break
          push({ a, b, c, d, ratio: rc / d, error })
          found++
        }
      }
    }
  }
  return results
}

export const isExact = (combo: GearCombo) => Math.abs(combo.error) < 1e-12

// 오차가 같으면 사용 기어 잇수 합이 작은 조합 우선
function compare(x: GearCombo, y: GearCombo) {
  const de = Math.abs(x.error) - Math.abs(y.error)
  if (Math.abs(de) > 1e-15) return de
  return sum(x) - sum(y)
}

const sum = (c: GearCombo) => c.a + c.b + (c.c ?? 0) + (c.d ?? 0)

// A/B·C/D 와 C/B·A/D 처럼 같은 기어 구성으로 같은 비를 내는 조합은 하나로 본다
const keyOf = (c: GearCombo) =>
  `${[c.a, c.c ?? 0].sort((x, y) => x - y).join(',')}/${[c.b, c.d ?? 0].sort((x, y) => x - y).join(',')}`

export const sameCombo = (x: GearCombo, y: GearCombo) =>
  x.a === y.a && x.b === y.b && x.c === y.c && x.d === y.d

/**
 * 변환기어 입력 해석. "20, 24 30~40" → 낱개 [20, 24], 범위 [30..40]
 * 범위는 ~ 또는 - 로 잇는다. 너무 큰 범위(300개 초과)는 실수로 보고 거른다
 */
export function parseGearInput(text: string) {
  const singles: number[] = []
  const ranges: number[] = []
  let invalid = 0
  const tokens = text.replace(/\s*[~\-–]\s*/g, '~').split(/[\s,]+/).filter(Boolean)
  for (const t of tokens) {
    const range = /^(\d+)~(\d+)$/.exec(t)
    if (range) {
      const [lo, hi] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y) as [number, number]
      if (lo < 1 || hi - lo > 300) invalid++
      else for (let v = lo; v <= hi; v++) ranges.push(v)
    }
    else if (/^\d+$/.test(t) && Number(t) > 0) singles.push(Number(t))
    else invalid++
  }
  return { singles, ranges, invalid }
}

/**
 * 이번 작업에서 뺀 변환기어. 잇수를 뺀 개수만큼 적는다. 예) 40을 2개 중 1개 뺌 → [40]
 * 보유 수량보다 많이 적혀 있으면(설정에서 수량을 줄인 경우) 0개로 본다.
 */
export function usableCount(teeth: number, qty: number, excluded: number[]) {
  return Math.max(0, qty - excluded.filter(t => t === teeth).length)
}

/** 보유 목록에서 뺀 것을 제외한, 조합 탐색에 넣을 잇수 목록 (수량만큼 반복) */
export function usableGearList(owned: { teeth: number, qty: number }[], excluded: number[]) {
  return owned.flatMap(g => Array<number>(usableCount(g.teeth, g.qty, excluded)).fill(g.teeth))
}

/** 기어를 눌렀을 때: 하나씩 빼다가(2 → 1 → 0) 다 빠져 있으면 모두 되돌린다(0 → 2) */
export function toggleExcluded(excluded: number[], teeth: number, qty: number) {
  return usableCount(teeth, qty, excluded) > 0
    ? [...excluded, teeth]
    : excluded.filter(t => t !== teeth)
}
