// 기어 목록 검색.
// - 띄어 쓴 단어를 따로 찾고, 모두 어딘가(이름·메모·제원·기계 이름)에 있어야 보여준다
// - 한글: 띄어쓰기 무시, 초성 검색(ㅍㄴㅇ → 피니언), 입력 중인 마지막 글자(피니어 → 피니언)
// - 제원: M2 / 30T / DP10 은 숫자까지 정확히 (M20, 130T 는 안 걸림)

const HANGUL_START = 0xAC00
const HANGUL_END = 0xD7A3
const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'

const isSyllable = (c: string) => {
  const code = c.charCodeAt(0)
  return code >= HANGUL_START && code <= HANGUL_END
}
const isChoseong = (c: string) => CHOSEONG.includes(c)

/** 한글 음절을 초성·중성·종성 번호로 */
function decompose(c: string) {
  const code = c.charCodeAt(0) - HANGUL_START
  return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 }
}

/**
 * 글자 하나 비교. q가 초성이면 t의 초성과,
 * last(입력 중인 마지막 글자)이고 받침이 없으면 받침을 빼고 비교한다 (피니어 ↔ 피니언)
 */
function charMatches(t: string, q: string, last: boolean) {
  if (t === q) return true
  if (isChoseong(q) && isSyllable(t)) return CHOSEONG[decompose(t).cho] === q
  if (last && isSyllable(q) && isSyllable(t)) {
    const a = decompose(q)
    const b = decompose(t)
    return a.jong === 0 && a.cho === b.cho && a.jung === b.jung
  }
  return false
}

/** 공백을 빼고 비교하기 위해, 공백이 아닌 글자와 원래 위치를 함께 */
function compact(text: string) {
  const chars: string[] = []
  const index: number[] = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (/\s/.test(c)) continue
    chars.push(c.toLowerCase())
    index.push(i)
  }
  return { chars, index }
}

/** 제원 단어(M2, 30T, DP10)는 숫자까지 정확히 맞는지 따로 본다 */
const SPEC_TOKEN = /^(m|dp)(\d+(?:\.\d+)?)$|^(\d+)t$/i
export const isSpecToken = (token: string) => SPEC_TOKEN.test(token)

function specTokenRegex(token: string) {
  const m = SPEC_TOKEN.exec(token)!
  // 앞뒤로 숫자·소수점·영문이 붙지 않은 자리만 (M2 ≠ M20, M2.5 / 30T ≠ 130T)
  const body = m[3] ? `${m[3]}T` : `${m[1]}${m[2]!.replace('.', '\\.')}`
  return new RegExp(`(?<![\\w.])${body}(?![\\w.])`, 'gi')
}

/** text 안에서 token이 맞는 [시작, 끝) 위치들 (원래 문자열 기준) */
export function findRanges(text: string, token: string): [number, number][] {
  if (!token) return []
  if (isSpecToken(token)) {
    return [...text.matchAll(specTokenRegex(token))].map(m => [m.index!, m.index! + m[0].length])
  }
  const t = compact(text)
  const q = compact(token).chars
  const ranges: [number, number][] = []
  for (let i = 0; i + q.length <= t.chars.length; i++) {
    let ok = true
    for (let j = 0; j < q.length; j++) {
      if (!charMatches(t.chars[i + j]!, q[j]!, j === q.length - 1)) {
        ok = false
        break
      }
    }
    if (ok) ranges.push([t.index[i]!, t.index[i + q.length - 1]! + 1])
  }
  return ranges
}

export const tokenize = (query: string) => query.split(/[\s,·]+/).filter(Boolean)

/** 모든 단어가 fields 중 어딘가에 있으면 true */
export function matchesQuery(fields: string[], tokens: string[]) {
  return tokens.every(token => fields.some(f => findRanges(f, token).length > 0))
}

/** 강조 표시용으로 text를 [글자, 찾은 부분인지] 조각으로 나눈다 */
export function highlightSegments(text: string, tokens: string[]) {
  const marks = new Array<boolean>(text.length).fill(false)
  for (const token of tokens) {
    for (const [s, e] of findRanges(text, token)) {
      for (let i = s; i < e; i++) marks[i] = true
    }
  }
  const segments: { text: string, hit: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const last = segments[segments.length - 1]
    if (last && last.hit === marks[i]) last.text += text[i]
    else segments.push({ text: text[i]!, hit: marks[i]! })
  }
  return segments
}
