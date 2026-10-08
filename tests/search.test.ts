import { describe, expect, it } from 'vitest'
import { findRanges, highlightSegments, matchesQuery, tokenize } from '../app/utils/search'

const gear = ['출력축 피니언', '도번 GR-2031 · SCM415 침탄', 'M2 · 30T · β15°20′', 'Pfauter P400']
const find = (q: string) => matchesQuery(gear, tokenize(q))

describe('검색: 한글', () => {
  it('글자 일부', () => {
    expect(find('피니언')).toBe(true)
    expect(find('축 피')).toBe(true)
    expect(find('침탄')).toBe(true)
  })
  it('띄어쓰기 무시', () => {
    expect(find('출력축피니언')).toBe(true)
    expect(matchesQuery(['출력축피니언'], tokenize('출력축'))).toBe(true)
  })
  it('초성', () => {
    expect(find('ㅍㄴㅇ')).toBe(true)
    expect(find('ㅊㄹㅊ')).toBe(true)
    expect(find('피ㄴ언')).toBe(true)
    expect(find('ㅎㄱ')).toBe(false)
  })
  it('입력 중인 마지막 글자 (받침 전)', () => {
    expect(find('피니어')).toBe(true)
    expect(find('출려')).toBe(true)
    // 마지막 글자가 아니면 받침까지 맞아야 한다
    expect(find('피니어ㄴ')).toBe(false)
  })
  it('오타는 못 찾는다', () => {
    expect(find('피니얀')).toBe(false)
  })
})

describe('검색: 여러 단어', () => {
  it('이름·메모·기계 이름을 섞어도 모두 있으면 찾는다', () => {
    expect(find('피니언 SCM415')).toBe(true)
    expect(find('P400 30T')).toBe(true)
    expect(find('M2 30T')).toBe(true)
  })
  it('하나라도 없으면 안 나온다', () => {
    expect(find('피니언 링기어')).toBe(false)
  })
  it('대소문자 구분 안 함', () => {
    expect(find('scm415 p400')).toBe(true)
  })
})

describe('검색: 제원은 정확히', () => {
  it('M2 는 M20, M2.5 를 찾지 않는다', () => {
    expect(matchesQuery(['M20 · 30T'], tokenize('M2'))).toBe(false)
    expect(matchesQuery(['M2.5 · 30T'], tokenize('M2'))).toBe(false)
    expect(matchesQuery(['M2.5 · 30T'], tokenize('M2.5'))).toBe(true)
  })
  it('30T 는 130T 를 찾지 않는다', () => {
    expect(matchesQuery(['M2 · 130T'], tokenize('30T'))).toBe(false)
    expect(matchesQuery(['M2 · 30T'], tokenize('30t'))).toBe(true)
  })
  it('DP 도 정확히', () => {
    expect(matchesQuery(['DP10 · 30T'], tokenize('DP10'))).toBe(true)
    expect(matchesQuery(['DP100 · 30T'], tokenize('DP10'))).toBe(false)
  })
  it('숫자만 쓰면 포함 검색', () => {
    expect(matchesQuery(['M2 · 130T'], tokenize('30'))).toBe(true)
  })
})

describe('강조 표시', () => {
  it('찾은 부분만 표시 (띄어쓰기 사이도 이어서)', () => {
    expect(highlightSegments('출력축 피니언', ['축피'])).toEqual([
      { text: '출력', hit: false }, { text: '축 피', hit: true }, { text: '니언', hit: false },
    ])
  })
  it('초성과 제원', () => {
    expect(findRanges('출력축 피니언', 'ㅍㄴㅇ')).toEqual([[4, 7]])
    expect(findRanges('M2 · 30T · β15°', '30T')).toEqual([[5, 8]])
  })
})
