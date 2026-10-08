/**
 * 홈 화면 설치(PWA) 상태.
 * - prompt: 브라우저가 설치 창을 띄울 수 있음 (안드로이드 크롬, 엣지, 데스크톱 크롬 등) → 버튼으로 설치
 * - ios: 아이폰·아이패드는 설치 창을 띄울 수 없어 "공유 → 홈 화면에 추가" 안내
 * - manual: 그 밖의 브라우저는 메뉴에서 직접 설치하도록 안내
 */
export function useInstallApp() {
  const { $pwa } = useNuxtApp()
  const toast = useToast()

  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const iosBrowser = /CriOS/.test(ua) ? 'chrome' : /FxiOS|EdgiOS/.test(ua) ? 'other' : 'safari'

  // 이미 설치된 앱으로 열었는지 (설치 직후 바뀌는 것도 따라간다)
  const standaloneQuery = window.matchMedia('(display-mode: standalone)')
  const standalone = ref(standaloneQuery.matches || (navigator as { standalone?: boolean }).standalone === true)
  const onChange = (e: MediaQueryListEvent) => {
    if (e.matches) standalone.value = true
  }
  standaloneQuery.addEventListener('change', onChange)
  const justInstalled = ref(false)
  const onInstalled = () => {
    justInstalled.value = true
  }
  window.addEventListener('appinstalled', onInstalled)
  onScopeDispose(() => {
    standaloneQuery.removeEventListener('change', onChange)
    window.removeEventListener('appinstalled', onInstalled)
  })

  const installed = computed(() => standalone.value || justInstalled.value)
  const mode = computed<'prompt' | 'ios' | 'manual'>(() =>
    $pwa?.showInstallPrompt ? 'prompt' : isIos ? 'ios' : 'manual')

  async function install() {
    const choice = await $pwa?.install()
    if (choice?.outcome === 'accepted') {
      justInstalled.value = true
      toast.add({ title: '홈 화면에 설치했어요', color: 'success' })
    }
  }

  return { installed, mode, iosBrowser, install }
}
