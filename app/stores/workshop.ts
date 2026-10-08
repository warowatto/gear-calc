import { parseGearInput } from '~/utils/changeGears'

// 기계와 보유 변환기어. localStorage 'gear-calc:workshop' = { gears, machines }
export const useWorkshopStore = defineStore('workshop', () => {
  const saved = loadPersisted<Workshop>('workshop', () => ({ gears: [], machines: [] }))
  const gears = ref<OwnedGear[]>(saved.gears)
  const machines = ref<Machine[]>(saved.machines)
  persistTo('workshop', () => ({ gears: gears.value, machines: machines.value }))

  // ── 보유 변환기어 ──
  const totalGears = computed(() => gears.value.reduce((n, g) => n + g.qty, 0))

  /**
   * "20, 24 30~40" 처럼 낱개·범위를 한 번에 추가.
   * 낱개는 이미 있으면 수량 +1 (같은 기어를 2개 가진 경우), 범위는 없는 잇수만 채운다.
   */
  function addGears(text: string) {
    const { singles, ranges, invalid } = parseGearInput(text)
    let added = 0
    let increased = 0
    for (const teeth of singles) {
      const found = gears.value.find(g => g.teeth === teeth)
      if (found) {
        found.qty++
        increased++
      }
      else {
        gears.value.push({ teeth, qty: 1 })
        added++
      }
    }
    for (const teeth of ranges) {
      if (!gears.value.some(g => g.teeth === teeth)) {
        gears.value.push({ teeth, qty: 1 })
        added++
      }
    }
    gears.value.sort((a, b) => a.teeth - b.teeth)
    return { added, increased, invalid }
  }

  function setGearQty(teeth: number, qty: number) {
    const found = gears.value.find(g => g.teeth === teeth)
    if (found && isPositive(qty)) found.qty = qty
  }

  function removeGear(teeth: number) {
    gears.value = gears.value.filter(g => g.teeth !== teeth)
  }

  function clearGears() {
    gears.value = []
  }

  // ── 기계 ──
  const machineById = (id: string) => machines.value.find(m => m.id === id)
  const readyMachines = computed(() => machines.value.filter(isMachineReady))

  /** 없으면 추가, 있으면 바꾼다 */
  function saveMachine(machine: Machine) {
    const i = machines.value.findIndex(m => m.id === machine.id)
    if (i >= 0) machines.value[i] = machine
    else machines.value.push(machine)
  }

  function removeMachine(id: string) {
    machines.value = machines.value.filter(m => m.id !== id)
  }

  /** 백업 복원 */
  function setAll(next: Workshop) {
    gears.value = next.gears
    machines.value = next.machines
  }

  return {
    gears, machines, totalGears, readyMachines,
    addGears, setGearQty, removeGear, clearGears,
    machineById, saveMachine, removeMachine, setAll,
  }
})
