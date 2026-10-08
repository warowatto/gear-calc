import { describe, expect, it } from 'vitest'
import { formProblems, internalPathSchema, machineInputSchema, redirectQuerySchema, sizeInputSchema, specInputSchema } from '../app/utils/schemas'
import { parseBackup } from '../app/utils/backup'

const spec = { unit: 'module', module: 2, dp: 10, teeth: 30, pressureAngle: 20, helixAngle: 0, profileShift: 0 }

describe('등록 단계 입력', () => {
  it('정상 값은 문제 없음', () => {
    expect(formProblems(specInputSchema, spec)).toEqual([])
    expect(formProblems(sizeInputSchema, spec)).toEqual([])
  })
  it('비었거나 범위 밖이면 한국어 문구', () => {
    expect(formProblems(specInputSchema, { ...spec, teeth: NaN })).toEqual(['잇수를 넣어 주세요'])
    expect(formProblems(specInputSchema, { ...spec, teeth: 30.5 })).toEqual(['잇수는 정수로 넣어 주세요'])
    expect(formProblems(specInputSchema, { ...spec, teeth: 2 })).toEqual(['잇수는 3 이상이에요'])
    expect(formProblems(specInputSchema, { ...spec, pressureAngle: 0 })).toEqual(['압력각을 넣어 주세요'])
    expect(formProblems(specInputSchema, { ...spec, helixAngle: 95 })).toEqual(['비틀림각은 90° 미만이에요'])
    expect(formProblems(specInputSchema, { ...spec, profileShift: -3.5 })).toEqual(['전위계수는 -3 ~ 3 사이로 넣어 주세요'])
  })
  it('여러 개가 틀리면 모두', () => {
    expect(formProblems(specInputSchema, { ...spec, teeth: NaN, pressureAngle: NaN })).toEqual(['잇수를 넣어 주세요', '압력각을 넣어 주세요'])
  })
  it('모듈/DP 는 고른 단위만 검사', () => {
    expect(formProblems(sizeInputSchema, { ...spec, module: NaN })).toEqual(['모듈을 넣어 주세요'])
    expect(formProblems(sizeInputSchema, { ...spec, unit: 'dp', module: NaN, dp: 8 })).toEqual([])
    expect(formProblems(sizeInputSchema, { ...spec, unit: 'dp', dp: NaN })).toEqual(['DP를 넣어 주세요'])
  })
})

describe('기계 설정 입력', () => {
  const m = { id: 'm1', name: ' P400 ', indexConstant: 24, differentialConstant: NaN, twoStage: true, useClearance: false, clearance: NaN }
  it('차동상수·여유 잇수는 비워도 되고, 이름은 앞뒤 공백을 뗀다', () => {
    const r = machineInputSchema.safeParse(m)
    expect(r.success).toBe(true)
    expect(r.data!.name).toBe('P400')
    expect(Number.isNaN(r.data!.differentialConstant)).toBe(true)
  })
  it('필수 값이 없거나 틀리면 문구', () => {
    expect(formProblems(machineInputSchema, { ...m, name: '  ' })).toEqual(['기계 이름을 넣어 주세요'])
    expect(formProblems(machineInputSchema, { ...m, indexConstant: NaN })).toEqual(['분할상수를 넣어 주세요'])
    expect(formProblems(machineInputSchema, { ...m, differentialConstant: -1 })).toEqual(['차동상수는 0보다 커야 해요'])
    expect(formProblems(machineInputSchema, { ...m, useClearance: true })).toEqual(['간섭 조건을 쓰려면 여유 잇수를 넣어 주세요'])
    expect(formProblems(machineInputSchema, { ...m, useClearance: true, clearance: 15 })).toEqual([])
  })
  it('저장소에서 온 null 도 비어 있음으로 받는다', () => {
    const r = machineInputSchema.safeParse({ ...m, differentialConstant: null, clearance: null })
    expect(r.success).toBe(true)
    expect(Number.isNaN(r.data!.clearance)).toBe(true)
  })
})

describe('주소 파라미터', () => {
  it('앱 안의 경로만', () => {
    expect(internalPathSchema.safeParse('/settings/gears').success).toBe(true)
    expect(internalPathSchema.safeParse('/gears/abc?step=spec').success).toBe(true)
  })
  it('다른 사이트로 보내는 값은 막는다 (오픈 리다이렉트)', () => {
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', 'javascript:alert(1)']) {
      expect(internalPathSchema.safeParse(bad).success, bad).toBe(false)
    }
  })
  it('?to= 가 이상하면 첫 화면', () => {
    expect(redirectQuerySchema.parse('//evil.com')).toBe('/')
    expect(redirectQuerySchema.parse(undefined)).toBe('/')
    expect(redirectQuerySchema.parse(['/a', '/b'])).toBe('/')
    expect(redirectQuerySchema.parse('/gears/abc')).toBe('/gears/abc')
  })
})

describe('백업 파일: 빈칸이 null 로 저장된 기록', () => {
  it('null 은 비어 있음(NaN)으로 읽고, 빠진 선택 항목은 기본값으로 채운다', () => {
    const file = {
      app: 'gear-calc', version: 1,
      gears: [{ id: 'a', spec: { unit: 'dp', module: null, dp: 8, pressureAngle: 20, teeth: 40, profileShift: null, helixAngle: 0 }, span: { upper: null, lower: -0.1, overrideK: null }, hob: { machineId: 'm1', starts: 1, excluded: [], index: null, diff: null } }],
      workshop: { machines: [{ id: 'm1', name: 'P400', indexConstant: 24, differentialConstant: null, clearance: null }], gears: [] },
    }
    const r = parseBackup(JSON.stringify(file))
    expect(r.skipped).toBe(0)
    const g = r.gears[0]!
    expect(Number.isNaN(g.spec.module)).toBe(true)
    expect(Number.isNaN(g.spec.profileShift)).toBe(true)
    expect(g.name).toBe('')
    expect(r.workshop.machines[0]!.twoStage).toBe(true)
    expect(Number.isNaN(r.workshop.machines[0]!.differentialConstant)).toBe(true)
  })
})
