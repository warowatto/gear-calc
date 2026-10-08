// 입력·파일·주소 파라미터 검증 (zod).
// - 입력 스키마: 사용자에게 보여줄 한국어 문구를 담는다 (등록 단계, 기계 설정)
// - 저장 스키마: 백업 파일처럼 밖에서 들어온 데이터. 빈칸이 null 로 저장돼 있을 수 있어 느슨하게 받고 NaN 으로 바꾼다
// - 주소 스키마: ?to= 같은 쿼리. 앱 안의 경로만 허용한다
import { z } from 'zod'

/** 숫자 칸. 비어 있으면(NaN) msg 로 알려준다 */
const num = (msg: string) => z.number({ error: msg })

/** 비워 둬도 되는 숫자 칸 (NaN·null = 비어 있음). 값이 있으면 ok 를 만족해야 한다 */
const optionalNum = (msg: string, ok: (v: number) => boolean) =>
  z.custom<number | null>(
    v => v === null || (typeof v === 'number' && (Number.isNaN(v) || (Number.isFinite(v) && ok(v)))),
    { error: msg },
  ).transform(v => v ?? NaN)

/** 스키마 검사에서 나온 문구들 (같은 문구는 한 번만) */
export function formProblems(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value)
  return result.success ? [] : [...new Set(result.error.issues.map(i => i.message))]
}

// ── 등록 단계 입력 ──

/** 1단계: 모듈 또는 DP */
export const sizeInputSchema = z.discriminatedUnion('unit', [
  z.object({ unit: z.literal('module'), module: num('모듈을 넣어 주세요').positive('모듈은 0보다 커야 해요') }),
  z.object({ unit: z.literal('dp'), dp: num('DP를 넣어 주세요').positive('DP는 0보다 커야 해요') }),
])

/** 2단계: 잇수 · 압력각 · 비틀림각 · 전위계수 */
export const specInputSchema = z.object({
  teeth: num('잇수를 넣어 주세요').int('잇수는 정수로 넣어 주세요').min(3, '잇수는 3 이상이에요'),
  pressureAngle: num('압력각을 넣어 주세요').gt(0, '압력각을 넣어 주세요').lt(45, '압력각은 45° 미만이에요'),
  helixAngle: num('비틀림각을 넣어 주세요').min(0, '비틀림각은 0° 이상이에요').lt(90, '비틀림각은 90° 미만이에요'),
  profileShift: num('전위계수를 넣어 주세요').gt(-3, '전위계수는 -3 ~ 3 사이로 넣어 주세요').lt(3, '전위계수는 -3 ~ 3 사이로 넣어 주세요'),
})

/** 3단계: 공차 (비우면 0) */
export const spanInputSchema = z.object({
  upper: num('위 치수차를 확인해 주세요'),
  lower: num('아래 치수차를 확인해 주세요'),
})

// ── 기계 설정 입력 ──

export const machineInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, '기계 이름을 넣어 주세요'),
  indexConstant: num('분할상수를 넣어 주세요').positive('분할상수는 0보다 커야 해요'),
  differentialConstant: optionalNum('차동상수는 0보다 커야 해요', v => v > 0),
  twoStage: z.boolean(),
  useClearance: z.boolean(),
  clearance: optionalNum('여유 잇수는 0 이상이에요', v => v >= 0),
}).superRefine((m, ctx) => {
  if (m.useClearance && Number.isNaN(m.clearance)) {
    ctx.addIssue({ code: 'custom', path: ['clearance'], message: '간섭 조건을 쓰려면 여유 잇수를 넣어 주세요' })
  }
})

// ── 저장 데이터 (백업 파일) ──

/** 빈칸이 null 로 저장돼 있을 수 있는 숫자 → NaN */
const storedNum = z.number().nullable().transform(v => v ?? NaN)

const gearComboSchema = z.object({
  a: z.number(),
  b: z.number(),
  c: z.number().optional(),
  d: z.number().optional(),
  ratio: z.number(),
  error: z.number(),
})

export const storedGearSchema = z.object({
  id: z.string().min(1),
  name: z.string().catch(''),
  memo: z.string().catch(''),
  createdAt: z.number().catch(0),
  updatedAt: z.number().catch(0),
  spec: z.object({
    unit: z.enum(['module', 'dp']),
    module: storedNum,
    dp: storedNum,
    pressureAngle: z.number(),
    teeth: z.number(),
    profileShift: storedNum.catch(0),
    helixAngle: storedNum.catch(0),
  }),
  span: z.object({
    upper: storedNum.catch(0),
    lower: storedNum.catch(0),
    overrideK: z.number().int().positive().nullable().catch(null),
  }).catch({ upper: 0, lower: 0, overrideK: null }),
  hob: z.object({
    machineId: z.string().catch(''),
    starts: z.number().int().positive().catch(1),
    excluded: z.array(z.number()).catch([]),
    index: gearComboSchema.nullable().catch(null),
    diff: gearComboSchema.nullable().catch(null),
  }),
})

export const storedMachineSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  indexConstant: storedNum,
  differentialConstant: storedNum.catch(NaN),
  twoStage: z.boolean().catch(true),
  useClearance: z.boolean().catch(false),
  clearance: storedNum.catch(NaN),
})

export const ownedGearSchema = z.object({
  teeth: z.number().int().positive(),
  qty: z.number().int().positive(),
})

/** 백업 파일의 겉모양. 항목은 하나씩 따로 검사해서 깨진 것만 뺀다 */
export const backupEnvelopeSchema = z.object({
  app: z.string(),
  version: z.number(),
  exportedAt: z.string().optional().catch(undefined),
  gears: z.array(z.unknown()).catch([]),
  workshop: z.object({
    machines: z.array(z.unknown()).catch([]),
    gears: z.array(z.unknown()).catch([]),
  }).catch({ machines: [], gears: [] }),
})

// ── 주소 파라미터 ──

/**
 * 앱 안의 경로만 ("/settings", "/gears/abc?x=1").
 * "//다른사이트.com" 이나 "https://…" 는 막는다 (외부 사이트로 보내는 오픈 리다이렉트 방지)
 */
export const internalPathSchema = z.string().regex(/^\/(?![/\\])/, '앱 안의 주소가 아니에요')

/** ?to= 쿼리. 이상하면 첫 화면으로 */
export const redirectQuerySchema = internalPathSchema.catch('/')
