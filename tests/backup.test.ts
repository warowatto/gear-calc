import { describe, expect, it } from 'vitest'
import { buildBackup, mergeBackup, parseBackup } from '../app/utils/backup'

const gear = (id: string, updatedAt: number, name = '') => ({
  id, name, memo: '', createdAt: 0, updatedAt,
  spec: { unit: 'module' as const, module: 2, dp: 10, pressureAngle: 20, teeth: 30, profileShift: 0, helixAngle: 0 },
  span: { upper: 0, lower: 0, overrideK: null },
  hob: { machineId: 'default', starts: 1, excluded: [], index: null, diff: null },
})
const machine = (id: string, name: string) => ({ id, name, indexConstant: 24, differentialConstant: 7.95775, twoStage: true, useClearance: true, clearance: 15 })

describe('백업', () => {
  it('내보낸 파일을 그대로 다시 읽을 수 있다', () => {
    const data = { gears: [gear('a', 1)], workshop: { machines: [machine('default', 'P400')], gears: [{ teeth: 20, qty: 2 }] } }
    const back = parseBackup(JSON.stringify(buildBackup(data)))
    expect(back.gears).toEqual(data.gears)
    expect(back.workshop).toEqual(data.workshop)
    expect(back.skipped).toBe(0)
  })

  it('다른 파일이면 알아듣기 쉬운 메시지로 거절한다', () => {
    expect(() => parseBackup('hello')).toThrow('JSON 파일이 아니에요.')
    expect(() => parseBackup('{"foo":1}')).toThrow('기어 계산기 백업 파일이 아니에요.')
    expect(() => parseBackup('{"app":"gear-calc","version":99}')).toThrow(/더 새로운 버전/)
  })

  it('깨진 항목만 빼고 읽는다', () => {
    const file = { app: 'gear-calc', version: 1, gears: [gear('a', 1), { id: 'x' }], workshop: { machines: [machine('m', 'M'), {}], gears: [{ teeth: 20, qty: 1 }, { teeth: -1, qty: 1 }] } }
    const back = parseBackup(JSON.stringify(file))
    expect(back.gears).toHaveLength(1)
    expect(back.workshop.machines).toHaveLength(1)
    expect(back.workshop.gears).toHaveLength(1)
    expect(back.skipped).toBe(3)
  })

  it('합치기: 새 기어는 추가, 같은 기어는 최근 것, 기계는 없던 것만, 변환기어 수량은 큰 쪽', () => {
    const current = { gears: [gear('a', 10, '내 것'), gear('b', 10)], workshop: { machines: [machine('default', '내 기계')], gears: [{ teeth: 20, qty: 1 }, { teeth: 30, qty: 3 }] } }
    const incoming = { gears: [gear('a', 5, '옛날'), gear('b', 20, '최신'), gear('c', 1)], workshop: { machines: [machine('default', '남의 기계'), machine('m2', '새 기계')], gears: [{ teeth: 20, qty: 2 }, { teeth: 40, qty: 1 }] } }
    const r = mergeBackup(current, incoming)
    expect(r.added).toBe(1)
    expect(r.updated).toBe(1)
    expect(r.gears.find(g => g.id === 'a')!.name).toBe('내 것')
    expect(r.gears.find(g => g.id === 'b')!.name).toBe('최신')
    expect(r.workshop.machines.map(m => m.name)).toEqual(['내 기계', '새 기계'])
    expect(r.workshop.gears).toEqual([{ teeth: 20, qty: 2 }, { teeth: 30, qty: 3 }, { teeth: 40, qty: 1 }])
  })
})
