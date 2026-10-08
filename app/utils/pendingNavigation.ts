// 브라우저 기록을 되돌린 뒤 이어서 갈 곳. 되돌린 화면을 브라우저가 새로 불러오면 실행 중이던 코드가 사라지므로
// 탭 저장소(sessionStorage)에 적어 두고 앱이 다시 뜰 때 이어서 이동한다. 오래된 것은 따르지 않는다
const KEY = 'gear-calc:pending-navigation'
const MAX_AGE = 30_000

export function setPendingNavigation(to: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ to, at: Date.now() }))
  }
  catch {}
}

export function clearPendingNavigation() {
  try {
    sessionStorage.removeItem(KEY)
  }
  catch {}
}

/** 적어 둔 곳을 꺼낸다 (꺼내면 지운다). 30초가 지났으면 null */
export function takePendingNavigation(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    const saved = raw ? JSON.parse(raw) : null
    return saved && Date.now() - saved.at < MAX_AGE ? saved.to : null
  }
  catch {
    return null
  }
}
