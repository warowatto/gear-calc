// 기어 기록의 모양과 계산 도우미 (상태는 stores/gears.ts)
import { calcSpan, type SpanInput } from './spanMeasurement'
import type { GearCombo } from './changeGears'
import { formatAngle, isNumber, isPositive } from './format'

export const MM_PER_INCH = 25.4

export interface GearSpecInput extends SpanInput {
  /** 이 크기 입력 방식: 모듈 [mm] 또는 DP(Diametral Pitch) [1/inch] */
  unit: 'module' | 'dp'
  /** 치직각 DP */
  dp: number
}

export interface GearRecord {
  id: string
  name: string
  memo: string
  createdAt: number
  updatedAt: number
  spec: GearSpecInput
  span: {
    upper: number
    lower: number
    /** 걸치기 잇수 직접 지정. null이면 자동 */
    overrideK: number | null
  }
  hob: {
    machineId: string
    starts: number
    /** 이번 작업에서 뺀 변환기어 잇수 */
    excluded: number[]
    /** 실제로 고른 분할·차동 기어 조합 */
    index: GearCombo | null
    diff: GearCombo | null
  }
}

/** 계산용 제원. DP 입력이면 m = 25.4 / DP 로 바꾼다 */
export function toCalcSpec(spec: GearSpecInput): SpanInput {
  const { unit, dp, ...rest } = spec
  return unit === 'dp' ? { ...rest, module: isPositive(dp) ? MM_PER_INCH / dp : NaN } : rest
}

export function isValidSpec(s: SpanInput) {
  return isPositive(s.module) && isPositive(s.pressureAngle) && isPositive(s.teeth)
    && isNumber(s.profileShift) && isNumber(s.helixAngle) && s.helixAngle < 90
}

/** 목록·제목에 보일 제원 요약. 예) M2 · 30T · β15° */
export function specSummary(spec: GearSpecInput) {
  const size = spec.unit === 'dp' ? `DP${spec.dp}` : `M${spec.module}`
  const parts = [size, `${spec.teeth}T`]
  if (spec.helixAngle) parts.push(`β${formatAngle(spec.helixAngle)}`)
  if (spec.profileShift) parts.push(`x${spec.profileShift > 0 ? '+' : ''}${spec.profileShift}`)
  if (spec.pressureAngle !== 20) parts.push(`α${spec.pressureAngle}°`)
  return parts.join(' · ')
}

/** 상단 제목용 짧은 제원. 예) M10 · 30T */
export function specTitle(spec: GearSpecInput) {
  const size = spec.unit === 'dp' ? `DP${spec.dp}` : `M${spec.module}`
  return `${size} · ${spec.teeth}T`
}

export const newId = () => Math.random().toString(36).slice(2, 10)

/** 새 기어 (기본 제원) */
export function createGear(): GearRecord {
  const now = Date.now()
  return {
    id: newId(),
    name: '',
    memo: '',
    createdAt: now,
    updatedAt: now,
    spec: { unit: 'module', module: 2, dp: 10, pressureAngle: 20, teeth: 30, profileShift: 0, helixAngle: 0 },
    span: { upper: 0, lower: 0, overrideK: null },
    hob: { machineId: '', starts: 1, excluded: [], index: null, diff: null },
  }
}

/** 저장된 기어의 걸치기 결과. 허용 구간은 공차가 있을 때만 */
export function gearSpan(gear: GearRecord) {
  const spec = toCalcSpec(gear.spec)
  if (!isValidSpec(spec)) return null
  const result = calcSpan(spec, gear.span.overrideK ?? undefined)
  const upper = isNumber(gear.span.upper) ? gear.span.upper : 0
  const lower = isNumber(gear.span.lower) ? gear.span.lower : 0
  return {
    ...result,
    hasTolerance: upper !== 0 || lower !== 0,
    max: result.span + Math.max(upper, lower),
    min: result.span + Math.min(upper, lower),
  }
}
