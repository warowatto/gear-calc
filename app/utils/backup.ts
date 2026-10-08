// 백업 파일 만들기·읽기·합치기 (기어 기록 + 기계 + 보유 변환기어)
import type { GearRecord } from '~/composables/useGears'
import type { Machine, OwnedGear, Workshop } from '~/composables/useWorkshop'

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

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

function isGearRecord(v: unknown): v is GearRecord {
  if (!isObj(v) || !isStr(v.id) || !isObj(v.spec) || !isObj(v.span) || !isObj(v.hob)) return false
  const s = v.spec
  return (s.unit === 'module' || s.unit === 'dp') && isNum(s.teeth) && isNum(s.pressureAngle)
}

function isMachine(v: unknown): v is Machine {
  return isObj(v) && isStr(v.id) && isStr(v.name) && isNum(v.indexConstant) && isNum(v.differentialConstant)
}

function isOwnedGear(v: unknown): v is OwnedGear {
  return isObj(v) && isNum(v.teeth) && v.teeth > 0 && isNum(v.qty) && v.qty > 0
}

/**
 * 파일 내용을 읽어 검사한다. 형식이 틀리면 사람이 읽을 수 있는 메시지로 throw.
 * 일부 항목만 깨졌으면 그 항목만 빼고 skipped 로 개수를 알려준다.
 */
export function parseBackup(text: string): BackupData & { skipped: number, exportedAt?: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  }
  catch {
    throw new Error('JSON 파일이 아니에요.')
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new Error('기어 계산기 백업 파일이 아니에요.')
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION) throw new Error('더 새로운 버전에서 만든 파일이라 읽을 수 없어요. 앱을 새로고침해 보세요.')

  const gearsIn = Array.isArray(raw.gears) ? raw.gears : []
  const ws = isObj(raw.workshop) ? raw.workshop : {}
  const machinesIn = Array.isArray(ws.machines) ? ws.machines : []
  const ownedIn = Array.isArray(ws.gears) ? ws.gears : []

  const gears = gearsIn.filter(isGearRecord)
  const machines = machinesIn.filter(isMachine)
  const owned = ownedIn.filter(isOwnedGear)
  const skipped = (gearsIn.length - gears.length) + (machinesIn.length - machines.length) + (ownedIn.length - owned.length)

  return {
    gears,
    workshop: { machines, gears: owned },
    skipped,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : undefined,
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
