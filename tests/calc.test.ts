import { describe, expect, it } from 'vitest'
import { calcSpan } from '../app/utils/spanMeasurement'
import { differentialRatio, indexRatio, isExact, parseGearInput, searchChangeGears, toggleExcluded, usableCount, usableGearList } from '../app/utils/changeGears'

describe('걸치기 치수', () => {
  it('평기어 m1 α20 z20 x0 → k=3, W=7.6604 (표준값)', () => {
    const r = calcSpan({ module: 1, pressureAngle: 20, teeth: 20, profileShift: 0, helixAngle: 0 })
    expect(r.spanTeeth).toBe(3)
    expect(r.span).toBeCloseTo(7.6604, 4)
  })

  it('평기어 m3 α20 z24 x+0.3 → k=4', () => {
    const r = calcSpan({ module: 3, pressureAngle: 20, teeth: 24, profileShift: 0.3, helixAngle: 0 })
    expect(r.spanTeeth).toBe(4)
    // W = 3cos20(π·3.5 + 24·inv20) + 2·0.3·3·sin20
    expect(r.span).toBeCloseTo(32.6214, 3)
  })

  it('헬리컬 mn3 αn20 z30 β25°50′ xn+0.11 → k=5 (상당평기어 z′·α/180+0.5 근사와 일치)', () => {
    const r = calcSpan({ module: 3, pressureAngle: 20, teeth: 30, profileShift: 0.11, helixAngle: 25 + 50 / 60 })
    expect(r.spanTeeth).toBe(5)
    expect(r.span).toBeCloseTo(41.7797, 3)
  })

  it('평기어로 β=0 이면 헬리컬 식과 평기어 식이 같다', () => {
    const r = calcSpan({ module: 2, pressureAngle: 20, teeth: 35, profileShift: -0.2, helixAngle: 0 })
    const z = 35, x = -0.2, a = 20 * Math.PI / 180
    const ax = Math.acos(z * Math.cos(a) / (z + 2 * x))
    const k = z / Math.PI * (Math.tan(ax) - (Math.tan(a) - a)) - 2 * x * Math.tan(a) / Math.PI + 0.5
    expect(r.spanTeethExact).toBeCloseTo(k, 10)
  })
})

describe('변환기어', () => {
  it('분할: K=24, 1줄, z=40 → 0.6 정확한 조합', () => {
    const target = indexRatio(24, 1, 40)
    const res = searchChangeGears(target, { gears: [20, 24, 25, 30, 40, 50, 60], twoStage: true, clearance: null, limit: 10 })
    expect(res.length).toBeGreaterThan(0)
    expect(isExact(res[0]!)).toBe(true)
  })

  it('차동: 근사 조합 오차가 작다', () => {
    const target = differentialRatio(7.95775, 20, 3, 1)
    const res = searchChangeGears(target, { gears: [20, 23, 24, 25, 30, 33, 34, 35, 37, 40, 41, 43, 45, 47, 50, 53, 55, 57, 59, 60, 61, 65, 67, 70, 71, 73, 75, 79, 80, 83, 85, 89, 90, 95, 97, 100], twoStage: true, clearance: 15, limit: 10 })
    expect(Math.abs(res[0]!.error)).toBeLessThan(5e-5)
  })
})

describe('DP', () => {
  it('DP 10, z30, α20 → m=2.54 와 같은 결과, k=4', () => {
    const r = calcSpan({ module: 25.4 / 10, pressureAngle: 20, teeth: 30, profileShift: 0, helixAngle: 0 })
    expect(r.spanTeeth).toBe(4)
    // inch 계 표준식: W = cosα(π(k−0.5) + z·invα) / DP
    const a = 20 * Math.PI / 180
    const wInch = Math.cos(a) * (Math.PI * 3.5 + 30 * (Math.tan(a) - a)) / 10
    expect(r.span / 25.4).toBeCloseTo(wInch, 10)
  })
})

// 예전 4중 반복 방식 (기준값)
function bruteForce(target: number, gears: number[], clearance: number | null, limit = 10) {
  const all: { key: string, error: number }[] = []
  const n = gears.length
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (j === i) continue
    for (let k = 0; k < n; k++) {
      if (k === i || k === j) continue
      const [a, b, c] = [gears[i]!, gears[j]!, gears[k]!]
      if (clearance !== null && a + b < c + clearance) continue
      for (let l = 0; l < n; l++) {
        if (l === i || l === j || l === k) continue
        const d = gears[l]!
        if (clearance !== null && c + d < b + clearance) continue
        all.push({ key: `${[a, c].sort((x, y) => x - y)}/${[b, d].sort((x, y) => x - y)}`, error: (a / b) * (c / d) / target - 1 })
      }
    }
  }
  all.sort((x, y) => Math.abs(x.error) - Math.abs(y.error))
  const seen = new Set<string>()
  return all.filter(x => !seen.has(x.key) && seen.add(x.key)).slice(0, limit).map(x => Math.abs(x.error))
}

describe('변환기어 탐색이 전수 탐색과 같은 결과', () => {
  const sets = {
    기본: [20, 23, 24, 25, 30, 33, 34, 35, 37, 40, 40, 41, 43, 45, 47, 50, 53, 55, 57, 59, 60, 61, 65, 67, 70, 71, 73, 75, 79, 80, 83, 85, 89, 90, 95, 97, 100],
    작은세트: [20, 24, 25, 30, 32, 36, 40, 45, 48, 50, 60, 72],
  }
  const targets = [24 / 30, 24 / 37, 24 / 101, 24 / 127, 1.15589, 0.4123, 2.7182]
  for (const [name, gears] of Object.entries(sets)) {
    for (const clearance of [null, 15]) {
      for (const t of targets) {
        it(`${name} · 간섭 ${clearance} · 목표 ${t.toFixed(5)}`, () => {
          const fast = searchChangeGears(t, { gears, twoStage: true, clearance, limit: 10 }).map(c => Math.abs(c.error))
          const slow = bruteForce(t, gears, clearance)
          expect(fast.length).toBe(slow.length)
          fast.forEach((e, i) => expect(e).toBeCloseTo(slow[i]!, 12))
        })
      }
    }
  }
})

describe('변환기어 탐색 속도', () => {
  it('7~120 (114종)도 1초 안에 끝난다', () => {
    const gears = Array.from({ length: 114 }, (_, i) => i + 7)
    const start = performance.now()
    searchChangeGears(24 / 127, { gears, twoStage: true, clearance: 15, limit: 10 })
    searchChangeGears(1.15589, { gears, twoStage: true, clearance: 15, limit: 10 })
    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('변환기어 입력 해석', () => {
  it('낱개와 범위를 나눈다', () => {
    const r = parseGearInput('20, 24 30~33')
    expect(r.singles).toEqual([20, 24])
    expect(r.ranges).toEqual([30, 31, 32, 33])
  })
  it('범위는 공백·하이픈·역순도 받는다', () => {
    expect(parseGearInput('7 ~ 9').ranges).toEqual([7, 8, 9])
    expect(parseGearInput('12-10').ranges).toEqual([10, 11, 12])
  })
  it('잘못된 입력은 세어서 알려준다', () => {
    expect(parseGearInput('abc, 0, 1~999').invalid).toBe(3)
  })
})

describe('변환기어 일부만 빼기', () => {
  const owned = [{ teeth: 20, qty: 1 }, { teeth: 40, qty: 2 }]

  it('누를 때마다 2 → 1 → 0 → 2 로 바뀐다', () => {
    let ex: number[] = []
    const usable = () => usableCount(40, 2, ex)
    expect(usable()).toBe(2)
    ex = toggleExcluded(ex, 40, 2); expect(usable()).toBe(1)
    ex = toggleExcluded(ex, 40, 2); expect(usable()).toBe(0)
    ex = toggleExcluded(ex, 40, 2); expect(usable()).toBe(2)
    expect(ex).toEqual([])
  })

  it('수량 1개는 빠짐 ↔ 사용만 오간다', () => {
    let ex = toggleExcluded([], 20, 1)
    expect(usableCount(20, 1, ex)).toBe(0)
    ex = toggleExcluded(ex, 20, 1)
    expect(ex).toEqual([])
  })

  it('40을 1개 빼면 탐색에는 40이 한 번만 들어간다', () => {
    expect(usableGearList(owned, [40])).toEqual([20, 40])
    expect(usableGearList(owned, [])).toEqual([20, 40, 40])
  })

  it('1개 남은 40으로는 40을 두 번 쓰는 조합이 나오지 않는다', () => {
    const gears = usableGearList([{ teeth: 25, qty: 1 }, { teeth: 40, qty: 2 }, { teeth: 80, qty: 1 }], [40])
    const res = searchChangeGears(0.8, { gears, twoStage: true, clearance: null, limit: 50 })
    expect(res.every(c => [c.a, c.b, c.c, c.d].filter(t => t === 40).length <= 1)).toBe(true)
  })

  it('설정에서 수량을 줄여 뺀 개수가 더 많아도 음수가 되지 않는다', () => {
    expect(usableCount(40, 1, [40, 40])).toBe(0)
  })
})
