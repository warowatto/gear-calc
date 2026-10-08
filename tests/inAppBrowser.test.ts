import { describe, expect, it } from 'vitest'
import { detectBrowser, externalOpenUrl } from '../app/utils/inAppBrowser'

const UA = {
  kakaoAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36;KAKAOTALK 2410460',
  kakaoIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
  naverAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.8.2)',
  instaIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0 (iPhone15,2; iOS 18_0; ko_KR; ko; scale=3.00; 1179x2556; 123456789)',
  fbIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.0;FBSS/3;FBID/phone;FBLC/ko_KR;FBOP/5]',
  lineAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Line/14.16.0',
  unknownWebview: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  samsungInternet: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  // 아이폰 홈 화면에 설치한 앱은 Safari 표시가 없다
  iosHomeScreen: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  desktopChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
}

describe('인앱브라우저 판별', () => {
  it.each([
    ['kakaoAndroid', 'kakaotalk', 'android'],
    ['kakaoIos', 'kakaotalk', 'ios'],
    ['naverAndroid', 'naver', 'android'],
    ['instaIos', 'instagram', 'ios'],
    ['fbIos', 'facebook', 'ios'],
    ['lineAndroid', 'line', 'android'],
    ['unknownWebview', 'webview', 'android'],
  ] as const)('%s → %s', (key, app, os) => {
    expect(detectBrowser(UA[key])).toEqual({ inApp: app, os })
  })

  it.each(['chromeAndroid', 'samsungInternet', 'safariIos', 'chromeIos', 'desktopChrome'] as const)('%s 는 일반 브라우저', (key) => {
    expect(detectBrowser(UA[key]).inApp).toBeNull()
  })

  it('홈 화면에 설치한 앱으로 열면 인앱브라우저로 보지 않는다', () => {
    expect(detectBrowser(UA.iosHomeScreen, true).inApp).toBeNull()
    expect(detectBrowser(UA.kakaoIos, true).inApp).toBeNull()
  })
})

describe('기본 브라우저로 여는 주소', () => {
  const url = 'https://warowatto.github.io/gear-calc/gears/abc?x=1'

  it('카카오톡은 외부 브라우저 열기 주소', () => {
    expect(externalOpenUrl(url, { inApp: 'kakaotalk', os: 'ios' }))
      .toBe(`kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`)
  })

  it('라인은 openExternalBrowser=1', () => {
    expect(externalOpenUrl(url, { inApp: 'line', os: 'android' }))
      .toBe('https://warowatto.github.io/gear-calc/gears/abc?x=1&openExternalBrowser=1')
  })

  it('안드로이드의 다른 앱은 intent 주소 (실패하면 원래 주소로)', () => {
    const r = externalOpenUrl(url, { inApp: 'naver', os: 'android' })!
    expect(r.startsWith('intent://warowatto.github.io/gear-calc/gears/abc?x=1#Intent;scheme=https;')).toBe(true)
    expect(r).toContain(`S.browser_fallback_url=${encodeURIComponent(url)}`)
  })

  it('아이폰의 다른 앱은 버튼으로 열 수 없다', () => {
    expect(externalOpenUrl(url, { inApp: 'instagram', os: 'ios' })).toBeNull()
  })
})
