/** 입력 방식 기억. angleDms[key] 가 true면 그 각도는 도분초로 입력 */
export const useInputPrefs = () =>
  usePersistedState('input-prefs', () => ({ angleDms: {} as Record<string, boolean> }))
