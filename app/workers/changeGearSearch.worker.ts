// 변환기어 조합 탐색을 화면과 다른 스레드에서 돌린다 (보유 기어가 많아도 화면이 멈추지 않게)
import { searchChangeGears, type SearchOptions } from '../utils/changeGears'

export interface SearchJob {
  target: number | null
  opts: SearchOptions
}

self.onmessage = (e: MessageEvent<{ id: number, jobs: SearchJob[] }>) => {
  const { id, jobs } = e.data
  const results = jobs.map(j => (j.target ? searchChangeGears(j.target, j.opts) : []))
  self.postMessage({ id, results })
}
