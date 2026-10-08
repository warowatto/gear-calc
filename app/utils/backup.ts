// 백업 파일 만들기·읽기·합치기 (기어 기록 + 기계 + 보유 변환기어)
import type { z } from 'zod'
import type { GearRecord } from './gearRecord'
import type { Workshop } from './workshop'
import { backupEnvelopeSchema, ownedGearSchema, storedGearSchema, storedMachineSchema } from './schemas'

export const BACKUP_APP = 'gear-calc'
export const BACKUP_VERSION = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  gears: GearRecord[]
  workshop: Workshop
}

export interface BackupData {
  gears: GearRecord[]
  workshop: Workshop
}

export function buildBackup(data: BackupData, now = new Date()): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    gears: data.gears,
    workshop: data.workshop,
  }
}

/** 예) gear-calc-2026-10-08.json */
export function backupFileName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `gear-calc-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

/** 항목을 하나씩 검사해서 맞는 것만 남긴다 */
function keepValid<T>(schema: z.ZodType<T>, items: unknown[]) {
  const ok: T[] = []
  for (const item of items) {
    const r = schema.safeParse(item)
    if (r.success) ok.push(r.data)
  }
  return { ok, skipped: items.length - ok.length }
}

/**
 * 파일 내용을 읽어 검사한다 (zod). 형식이 틀리면 사람이 읽을 수 있는 메시지로 throw.
 * 일부 항목만 깨졌으면 그 항목만 빼고 skipped 로 개수를 알려준다.
 * 빈칸이 null 로 저장된 숫자는 NaN(비어 있음)으로 되돌린다.
 */
export function parseBackup(text: string): BackupData & { skipped: number, exportedAt?: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  }
  catch {
    throw new Error('JSON 파일이 아니에요.')
  }
  const envelope = backupEnvelopeSchema.safeParse(raw)
  if (!envelope.success || envelope.data.app !== BACKUP_APP) throw new Error('기어 계산기 백업 파일이 아니에요.')
  if (envelope.data.version > BACKUP_VERSION) throw new Error('더 새로운 버전에서 만든 파일이라 읽을 수 없어요. 앱을 새로고침해 보세요.')

  const gears = keepValid(storedGearSchema, envelope.data.gears)
  const machines = keepValid(storedMachineSchema, envelope.data.workshop.machines)
  const owned = keepValid(ownedGearSchema, envelope.data.workshop.gears)

  return {
    gears: gears.ok,
    workshop: { machines: machines.ok, gears: owned.ok },
    skipped: gears.skipped + machines.skipped + owned.skipped,
    exportedAt: envelope.data.exportedAt,
  }
}

/**
 * 지금 데이터에 백업을 합친다.
 * - 기어 기록: id가 같으면 더 최근에 고친 쪽, 없던 것은 추가
 * - 기계: id가 같으면 지금 것을 유지, 없던 것은 추가
 * - 보유 변환기어: 잇수별로 합치고 수량은 큰 쪽
 */
export function mergeBackup(current: BackupData, incoming: BackupData): BackupData & { added: number, updated: number } {
  const byId = new Map(current.gears.map(g => [g.id, g]))
  let added = 0
  let updated = 0
  for (const g of incoming.gears) {
    const mine = byId.get(g.id)
    if (!mine) {
      byId.set(g.id, g)
      added++
    }
    else if (g.updatedAt > mine.updatedAt) {
      byId.set(g.id, g)
      updated++
    }
  }

  const machineIds = new Set(current.workshop.machines.map(m => m.id))
  const machines = [...current.workshop.machines, ...incoming.workshop.machines.filter(m => !machineIds.has(m.id))]

  const qty = new Map(current.workshop.gears.map(g => [g.teeth, g.qty]))
  for (const g of incoming.workshop.gears) qty.set(g.teeth, Math.max(qty.get(g.teeth) ?? 0, g.qty))
  const owned = [...qty].sort((a, b) => a[0] - b[0]).map(([teeth, q]) => ({ teeth, qty: q }))

  return { gears: [...byId.values()], workshop: { machines, gears: owned }, added, updated }
}
