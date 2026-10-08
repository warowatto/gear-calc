// 등록·수정 중인 기어. 앱을 잠깐 나갔다 와도 이어서 할 수 있게 저장해 둔다
// localStorage 'gear-calc:draft-new', 'gear-calc:draft-edit' = { gear }
export const useDraftsStore = defineStore('drafts', () => {
  const newGear = ref<GearRecord | null>(loadPersisted('draft-new', () => ({ gear: null as GearRecord | null })).gear)
  const editGear = ref<GearRecord | null>(loadPersisted('draft-edit', () => ({ gear: null as GearRecord | null })).gear)
  persistTo('draft-new', () => ({ gear: newGear.value }))
  persistTo('draft-edit', () => ({ gear: editGear.value }))

  /** 새 등록 시작. 가장 최근 기어의 기계·호브·뺀 변환기어는 이어받는다 */
  function startNew(latest?: GearRecord) {
    const gear = createGear()
    if (latest) {
      gear.hob.machineId = latest.hob.machineId
      gear.hob.starts = latest.hob.starts
      gear.hob.excluded = [...latest.hob.excluded]
    }
    newGear.value = gear
  }

  /** 수정 시작: 저장된 기어를 복사해서 고친다 */
  function startEdit(gear: GearRecord) {
    editGear.value = JSON.parse(JSON.stringify(gear))
  }

  return { newGear, editGear, startNew, startEdit }
})
