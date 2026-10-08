// useState + localStorage. 처음 만든 기본값도 바로 저장해서 새로고침해도 같은 값(예: 기계 id)을 쓰게 한다.
// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 동작하도록 실패는 무시한다
export function usePersistedState<T>(key: string, init: () => T) {
  const state = useState<T>(key, () => {
    try {
      const raw = localStorage.getItem(`gear-calc:${key}`)
      if (raw) return { ...init(), ...JSON.parse(raw) }
    }
    catch {}
    return init()
  })

  watch(state, (value) => {
    try {
      localStorage.setItem(`gear-calc:${key}`, JSON.stringify(value))
    }
    catch {}
  }, { deep: true, immediate: true })

  return state
}
