// 기계·보유 변환기어의 모양 (상태는 stores/workshop.ts)
import { isPositive } from './format'
import { newId } from './gearRecord'

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

/** 새 기계. 상수는 기계마다 달라서 미리 채우지 않는다 (비어 있으면 NaN) */
export const newMachine = (): Machine => ({
  id: newId(),
  name: '',
  indexConstant: NaN,
  differentialConstant: NaN,
  twoStage: true,
  useClearance: false,
  clearance: NaN,
})

/** 분할 상수가 있어야 변환기어를 계산할 수 있다 (차동 상수는 헬리컬일 때만 필요) */
export const isMachineReady = (m: Machine | undefined): boolean => !!m && isPositive(m.indexConstant)
