// 등록·수정을 끝내며 단계 기록을 되돌렸는데 그 화면이 새로 불러와진 경우, 원래 가려던 상세 화면으로 이어서 간다
export default defineNuxtPlugin((nuxtApp) => {
  const to = takePendingNavigation()
  if (!to) return
  const router = useRouter()
  nuxtApp.hook('app:mounted', () => {
    router.push(to)
  })
})
