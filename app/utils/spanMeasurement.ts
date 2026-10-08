// 걸치기 이두께(base tangent length) 계산 — 평기어/헬리컬, 전위 기어 포함

export interface SpanInput {
  /** 치직각 모듈 mn [mm] */
  module: number
  /** 치직각 압력각 αn [deg] */
  pressureAngle: number
  /** 잇수 z */
  teeth: number
  /** 치직각 전위계수 xn */
  profileShift: number
  /** 비틀림각 β [deg], 평기어는 0 */
  helixAngle: number
}

export interface SpanResult {
  /** 이론 걸치기 잇수 (반올림 전) */
  spanTeethExact: number
  /** 권장 걸치기 잇수 */
  spanTeeth: number
  /** 치직각 걸치기 치수 W [mm] */
  span: number
  /** 정면 압력각 αt [deg] */
  transverseAngle: number
  /** 기초원 비틀림각 βb [deg] */
  baseHelixAngle: number
  /** 피치원 지름 d [mm] */
  pitchDiameter: number
  /** 기초원 지름 db [mm] */
  baseDiameter: number
  /** 측정에 필요한 최소 치폭 W·sinβb [mm] */
  minFaceWidth: number
}

const RAD = Math.PI / 180

export const inv = (a: number) => Math.tan(a) - a

/** 걸치기 잇수 k 일 때 치직각 걸치기 치수 W */
export function spanForTeeth(input: SpanInput, k: number): number {
  const { module: mn, teeth: z, profileShift: xn } = input
  const an = input.pressureAngle * RAD
  const b = input.helixAngle * RAD
  const at = Math.atan(Math.tan(an) / Math.cos(b))
  return mn * Math.cos(an) * (Math.PI * (k - 0.5) + z * inv(at)) + 2 * xn * mn * Math.sin(an)
}

/** 이론 걸치기 잇수 (KHK 식). 평기어(β=0)에서는 k = z/π·(tan αx − inv α) − 2x·tan α/π + 0.5 */
export function spanTeethExact(input: SpanInput): number {
  const { teeth: z, profileShift: xn } = input
  const an = input.pressureAngle * RAD
  const b = input.helixAngle * RAD
  const at = Math.atan(Math.tan(an) / Math.cos(b))
  const cb2 = Math.cos(b) ** 2
  const ta2 = Math.tan(an) ** 2
  const f = xn / z
  const root = (cb2 + ta2) * (1 / Math.cos(b) + 2 * f) ** 2 - 1
  const K = (1 / Math.PI) * (
    (1 + Math.sin(b) ** 2 / (cb2 + ta2)) * Math.sqrt(Math.max(root, 0))
    - inv(at)
    - 2 * f * Math.tan(an)
  )
  return z * K + 0.5
}

export function calcSpan(input: SpanInput, overrideK?: number): SpanResult {
  const { module: mn, teeth: z } = input
  const an = input.pressureAngle * RAD
  const b = input.helixAngle * RAD
  const at = Math.atan(Math.tan(an) / Math.cos(b))
  const bb = Math.atan(Math.tan(b) * Math.cos(at))

  const exact = spanTeethExact(input)
  const k = overrideK ?? Math.max(1, Math.round(exact))
  const W = spanForTeeth(input, k)
  const d = (z * mn) / Math.cos(b)

  return {
    spanTeethExact: exact,
    spanTeeth: k,
    span: W,
    transverseAngle: at / RAD,
    baseHelixAngle: bb / RAD,
    pitchDiameter: d,
    baseDiameter: d * Math.cos(at),
    minFaceWidth: W * Math.sin(bb),
  }
}
