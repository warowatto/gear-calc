import { DEFAULT_GEAR_SET } from '~/utils/changeGears'

export interface Machine {
  id: string
  name: string
  /** 분할 상수: 분할 기어비 = 분할 상수 × 줄수 / 잇수 */
  indexConstant: number
  /** 차동 상수: 차동 기어비 = 차동 상수 × sinβ / (mn × 줄수) */
  differentialConstant: number
  /** 2단(A/B × C/D) 조합 사용 */
  twoStage: boolean
  /** 간섭 조건 검사 */
  useClearance: boolean
  /** 간섭 조건 여유 잇수 */
  clearance: number
}

export interface OwnedGear {
  teeth: number
  qty: number
}

export interface Workshop {
  /** 보유 변환기어 (기계와 무관하게 공용) */
  gears: OwnedGear[]
  machines: Machine[]
}

export const newMachine = (name = '새 기계', id = Math.random().toString(36).slice(2, 10)): Machine => ({
  id,
  name,
  indexConstant: 24,
  differentialConstant: 7.95775,
  twoStage: true,
  useClearance: true,
  clearance: 15,
})

export const toOwnedGears = (list: number[]): OwnedGear[] => {
  const map = new Map<number, number>()
  for (const t of list) map.set(t, (map.get(t) ?? 0) + 1)
  return [...map].sort((a, b) => a[0] - b[0]).map(([teeth, qty]) => ({ teeth, qty }))
}

/** 보유 변환기어와 등록된 기계 */
export const useWorkshop = () =>
  usePersistedState<Workshop>('workshop', () => ({
    gears: toOwnedGears(DEFAULT_GEAR_SET),
    machines: [newMachine('호빙머신 1', 'default')],
  }))
