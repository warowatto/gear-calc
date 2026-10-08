// localStorage 저장. 키는 gear-calc:<key>. 사생활 보호 모드 등 저장소를 못 쓰는 환경에서도 동작하도록 실패는 무시한다
const fullKey = (key: string) => `gear-calc:${key}`

/** 저장된 값을 읽는다. 없거나 깨졌으면 init(). 새 버전에서 늘어난 필드는 init() 값으로 채운다 */
export function loadPersisted<T extends object>(key: string, init: () => T): T {
  try {
    const raw = localStorage.getItem(fullKey(key))
    if (raw) return { ...init(), ...JSON.parse(raw) }
  }
  catch {}
  return init()
}

/** source()가 바뀔 때마다 저장한다. 처음 값도 바로 저장한다 (새로고침해도 같은 id 등을 쓰도록) */
export function persistTo(key: string, source: () => unknown) {
  watch(source, (value) => {
    try {
      localStorage.setItem(fullKey(key), JSON.stringify(value))
    }
    catch {}
  }, { deep: true, immediate: true })
}
