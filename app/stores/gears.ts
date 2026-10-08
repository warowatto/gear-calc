// 기어 기록 (히스토리). localStorage 'gear-calc:gears' = { list }
export const useGearsStore = defineStore('gears', () => {
  const list = ref<GearRecord[]>(loadPersisted('gears', () => ({ list: [] as GearRecord[] })).list)
  persistTo('gears', () => ({ list: list.value }))

  /** 최근에 고친 것부터 */
  const recent = computed(() => [...list.value].sort((a, b) => b.updatedAt - a.updatedAt))
  const byId = (id: string) => list.value.find(g => g.id === id)

  function add(gear: GearRecord) {
    if (byId(gear.id)) return // 같은 기어를 두 번 넣지 않는다
    const now = Date.now()
    list.value.push({ ...gear, createdAt: now, updatedAt: now })
  }

  /** 수정 단계에서 저장할 때 통째로 바꾼다 */
  function replace(gear: GearRecord) {
    const i = list.value.findIndex(g => g.id === gear.id)
    if (i >= 0) list.value[i] = { ...gear, updatedAt: Date.now() }
  }

  /** 이름·메모처럼 상세 화면에서 바로 고치는 값 */
  function patch(id: string, fields: Partial<Pick<GearRecord, 'name' | 'memo'>>) {
    const gear = byId(id)
    if (!gear) return
    Object.assign(gear, fields, { updatedAt: Date.now() })
  }

  function remove(id: string) {
    list.value = list.value.filter(g => g.id !== id)
  }

  /** 백업 복원 */
  function setAll(next: GearRecord[]) {
    list.value = next
  }

  return { list, recent, byId, add, replace, patch, remove, setAll }
})
