export const fmt = (v: number, digits = 4) =>
  Number.isFinite(v) ? v.toFixed(digits) : '—'

/** 25.8333 → 25°50′00″ */
export function toDms(deg: number) {
  if (!Number.isFinite(deg)) return '—'
  const sign = deg < 0 ? '-' : ''
  let total = Math.round(Math.abs(deg) * 3600)
  const d = Math.floor(total / 3600)
  total -= d * 3600
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${sign}${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`
}

export const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
export const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** 오늘이면 "오늘 10:42", 올해면 "10월 8일 10:42", 아니면 "2025. 10. 8." */
export function formatDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (d.toDateString() === now.toDateString()) return `오늘 ${time}`
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}월 ${d.getDate()}일 ${time}`
  return d.toLocaleDateString('ko-KR')
}

/** 도분초로 짧게. 15 → "15°", 25.8333… → "25°50′", 0초는 생략 */
export function formatAngle(deg: number) {
  if (!Number.isFinite(deg)) return '—'
  const sign = deg < 0 ? '-' : ''
  const total = Math.round(Math.abs(deg) * 3600)
  const d = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (!m && !s) return `${sign}${d}°`
  return `${sign}${d}°${m}′${s ? `${s}″` : ''}`
}

/** 도·분·초를 소수 도로. 모두 비어 있으면 NaN */
export function fromDms(d: number, m: number, s: number) {
  if ([d, m, s].every(v => Number.isNaN(v))) return NaN
  return (d || 0) + (m || 0) / 60 + (s || 0) / 3600
}

/** 소수 도를 도·분·초로 (초는 소수 둘째 자리까지) */
export function toDmsParts(deg: number) {
  if (!Number.isFinite(deg)) return { d: NaN, m: NaN, s: NaN }
  const totalSec = Math.round(Math.abs(deg) * 360000) / 100
  const d = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec - d * 3600) / 60)
  const s = Math.round((totalSec - d * 3600 - m * 60) * 100) / 100
  return { d, m, s }
}
