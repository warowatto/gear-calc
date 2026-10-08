/** 모바일 키보드가 가린 높이(px). 하단 고정 버튼을 키보드 위로 올릴 때 쓴다 */
export function useKeyboardInset() {
  const inset = ref(0)
  onMounted(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      inset.value = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    onBeforeUnmount(() => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    })
  })
  return inset
}
