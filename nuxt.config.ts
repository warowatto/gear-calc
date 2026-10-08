// 배포 경로. GitHub Pages 프로젝트 사이트는 https://아이디.github.io/저장소/ 처럼 하위 경로에서 열리므로
// 빌드할 때 NUXT_APP_BASE_URL=/저장소/ 로 넘긴다 (로컬·루트 배포는 '/')
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  ui: {
    colorMode: false,
  },
  // 정적 배포에는 아이콘 서버가 없으므로 쓰는 아이콘을 클라이언트 번들에 넣는다.
  // 개발 중 새로 쓴 아이콘은 번들 목록에 없을 수 있어 개발 서버에서 받아오게 둔다
  icon: {
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
  },
  app: {
    baseURL,
    head: {
      htmlAttrs: { lang: 'ko' },
      title: '기어 계산기',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#f2f4f6' },
        // 아이폰 홈 화면에 추가했을 때 앱처럼 (주소창 없이) 열리게
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: '기어 계산기' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        // 설치 가능한 앱으로 인식되도록 HTML에 처음부터 넣어 둔다 (CSR이라 실행 뒤 넣으면 늦을 수 있음)
        { rel: 'manifest', href: `${baseURL}manifest.webmanifest` },
        { rel: 'icon', type: 'image/svg+xml', href: `${baseURL}icon.svg` },
        { rel: 'apple-touch-icon', href: `${baseURL}apple-touch-icon-180x180.png` },
        { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css' },
      ],
    },
  },
  // 홈 화면에 설치하는 앱(PWA). 한 번 열면 인터넷 없이도 동작한다
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '기어 계산기',
      short_name: '기어 계산기',
      description: '걸치기 치수와 호빙머신 변환기어 계산·기록',
      lang: 'ko',
      start_url: baseURL,
      scope: baseURL,
      display: 'standalone',
      orientation: 'portrait',
      theme_color: '#f2f4f6',
      background_color: '#f2f4f6',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // CSR 앱이라 어떤 주소로 들어와도 index.html을 준다
      navigateFallback: baseURL,
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,json}'],
      runtimeCaching: [
        {
          // Pretendard 글꼴 (CDN) 도 오프라인에서 쓰도록 저장
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'cdn-fonts',
            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    // 설치 버튼(beforeinstallprompt)을 앱에서 띄울 수 있게
    client: { installPrompt: true },
  },
  compatibilityDate: '2026-10-01',
})
