// 카카오톡 같은 인앱브라우저로 들어오면 기본 브라우저로 여는 안내 페이지로 보낸다
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  if (to.path.replace(/(.)\/+$/, '$1') === '/open-in-browser') return
  try {
    if (sessionStorage.getItem(STAY_IN_APP_KEY)) return
  }
  catch {}
  if (!detectBrowser(navigator.userAgent, isStandaloneDisplay()).inApp) return
  return navigateTo({ path: '/open-in-browser', query: { to: to.fullPath } }, { replace: true })
})
