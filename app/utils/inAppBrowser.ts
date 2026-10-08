// 카카오톡·네이버 같은 앱 안의 브라우저(인앱브라우저) 판별과, 기본 브라우저로 여는 주소 만들기.
// 인앱브라우저에서는 홈 화면 설치가 안 되고 기록도 그 앱 안에만 따로 저장되어 기본 브라우저로 안내한다.

export type InAppName = 'kakaotalk' | 'naver' | 'instagram' | 'facebook' | 'line' | 'daum' | 'band' | 'webview'
export type Os = 'android' | 'ios' | 'other'

export interface BrowserInfo {
  inApp: InAppName | null
  os: Os
}

export const IN_APP_LABEL: Record<InAppName, string> = {
  kakaotalk: '카카오톡',
  naver: '네이버',
  instagram: '인스타그램',
  facebook: '페이스북',
  line: '라인',
  daum: '다음',
  band: '밴드',
  webview: '앱',
}

const RULES: [InAppName, RegExp][] = [
  ['kakaotalk', /KAKAOTALK/i],
  ['naver', /NAVER\(inapp/i],
  ['instagram', /Instagram/],
  ['facebook', /FBAN|FBAV|FB_IAB/],
  ['line', /\bLine\//],
  ['daum', /DaumApps/],
  ['band', /\bBAND\//],
]

/**
 * standalone: 홈 화면에 설치한 앱으로 열었는지. 아이폰 설치 앱은 UA에 Safari가 없어서
 * 인앱브라우저처럼 보이므로 반드시 빼야 한다.
 */
export function detectBrowser(ua: string, standalone = false): BrowserInfo {
  const os: Os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'other'
  if (standalone) return { inApp: null, os }
  for (const [name, re] of RULES) {
    if (re.test(ua)) return { inApp: name, os }
  }
  // 이름을 모르는 앱 내장 브라우저: 안드로이드 WebView 표시(wv) / 아이폰은 Safari 표시가 없음
  if (os === 'android' && /;\s*wv\)/.test(ua)) return { inApp: 'webview', os }
  if (os === 'ios' && !/Safari\//.test(ua)) return { inApp: 'webview', os }
  return { inApp: null, os }
}

/**
 * 기본 브라우저로 여는 주소. 버튼으로 열 수 없는 경우(아이폰의 다른 앱 등)는 null → 안내 문구로 대신한다
 */
export function externalOpenUrl(url: string, info: BrowserInfo): string | null {
  if (info.inApp === 'kakaotalk') return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`
  if (info.inApp === 'line') {
    const u = new URL(url)
    u.searchParams.set('openExternalBrowser', '1')
    return u.toString()
  }
  if (info.os === 'android') {
    // 안드로이드 기본 브라우저로 넘기는 intent. 실패하면 원래 주소로 돌아온다
    const u = new URL(url)
    const scheme = u.protocol.replace(':', '')
    return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(url)};end`
  }
  return null
}

/** 홈 화면에 설치한 앱으로 열었는지 */
export function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone === true
}

/** "그래도 여기서 쓸게요"를 고르면 이 창(탭)에서는 다시 안내하지 않는다 */
export const STAY_IN_APP_KEY = 'gear-calc:stay-in-app-browser'
