// 입력 방식 기억. localStorage 'gear-calc:input-prefs' = { angleDms }
export const usePrefsStore = defineStore('prefs', () => {
  /** angleDms[key] 가 true면 그 각도는 도분초로 입력 */
  const angleDms = ref<Record<string, boolean>>(loadPersisted('input-prefs', () => ({ angleDms: {} as Record<string, boolean> })).angleDms)
  persistTo('input-prefs', () => ({ angleDms: angleDms.value }))

  function setAngleDms(key: string, on: boolean) {
    angleDms.value[key] = on
  }

  return { angleDms, setAngleDms }
})
