<script setup lang="ts">
import { DEFAULT_GEAR_SET, parseGearInput } from '~/utils/changeGears'

const workshop = useWorkshop()
const toast = useToast()
const gearInput = ref('')
const totalGears = computed(() => workshop.value.gears.reduce((n, g) => n + g.qty, 0))

/**
 * "20, 24 30~40" 처럼 낱개·범위를 한 번에 추가.
 * 낱개는 이미 있으면 수량 +1 (같은 기어를 2개 가진 경우), 범위는 없는 잇수만 채운다.
 */
function addGears() {
  const { singles, ranges, invalid } = parseGearInput(gearInput.value)
  const list = workshop.value.gears
  let added = 0
  let increased = 0
  for (const teeth of singles) {
    const found = list.find(g => g.teeth === teeth)
    if (found) {
      found.qty++
      increased++
    }
    else {
      list.push({ teeth, qty: 1 })
      added++
    }
  }
  for (const teeth of ranges) {
    if (!list.some(g => g.teeth === teeth)) {
      list.push({ teeth, qty: 1 })
      added++
    }
  }
  list.sort((a, b) => a.teeth - b.teeth)
  gearInput.value = ''

  const parts = []
  if (added) parts.push(`${added}개 추가`)
  if (increased) parts.push(`${increased}개 수량 +1`)
  if (invalid) parts.push(`${invalid}개는 잘못된 입력이라 건너뜀`)
  toast.add({ title: parts.join(' · ') || '새로 추가된 기어가 없어요', color: invalid ? 'warning' : 'success', duration: 2500 })
}

function removeGear(teeth: number) {
  workshop.value.gears = workshop.value.gears.filter(g => g.teeth !== teeth)
}

function loadDefaultGears() {
  workshop.value.gears = toOwnedGears(DEFAULT_GEAR_SET)
}

const clearOpen = ref(false)
function clearAll() {
  workshop.value.gears = []
  clearOpen.value = false
}
</script>

<template>
  <div class="space-y-3">
    <UCard>
      <form class="flex gap-2" @submit.prevent="addGears">
        <UInput
          v-model="gearInput" size="xl" inputmode="text" autocomplete="off" enterkeyhint="done"
          placeholder="예) 20, 24 또는 30~60" class="flex-1"
        />
        <UButton type="submit" size="xl" icon="i-lucide-plus" label="추가" :disabled="!gearInput.trim()" />
      </form>
      <p class="mt-2 text-xs text-muted">
        쉼표로 여러 개, <b>7~120</b>처럼 쓰면 범위 전체가 들어가요. 이미 있는 잇수를 하나만 넣으면 수량이 늘어나요.
      </p>
    </UCard>

    <UCard>
      <div class="mb-4 flex items-center justify-between">
        <span class="font-semibold tabular-nums">{{ workshop.gears.length }}종 · {{ totalGears }}개</span>
        <span class="flex gap-1">
          <UButton label="기본 세트" color="neutral" variant="soft" size="sm" @click="loadDefaultGears" />
          <UButton label="모두 삭제" color="error" variant="soft" size="sm" :disabled="!workshop.gears.length" @click="clearOpen = true" />
        </span>
      </div>

      <!-- 한 줄에 5개 -->
      <div class="grid grid-cols-5 gap-2">
        <UPopover v-for="g in workshop.gears" :key="g.teeth">
          <button
            type="button"
            class="relative flex h-12 items-center justify-center rounded-xl bg-muted text-lg font-bold tabular-nums active:bg-accented"
          >
            {{ g.teeth }}
            <span v-if="g.qty > 1" class="absolute top-0.5 right-1 text-[10px] font-semibold text-primary">×{{ g.qty }}</span>
          </button>
          <template #content>
            <div class="w-48 space-y-3 p-3">
              <p class="font-semibold">{{ g.teeth }}T</p>
              <UFormField label="수량">
                <UInputNumber v-model="g.qty" size="lg" :min="1" :max="20" class="w-full" />
              </UFormField>
              <UButton label="삭제" color="error" variant="soft" icon="i-lucide-trash-2" block @click="removeGear(g.teeth)" />
            </div>
          </template>
        </UPopover>
      </div>
      <p v-if="!workshop.gears.length" class="py-6 text-center text-sm text-muted">등록된 변환기어가 없어요.</p>
      <p v-else class="mt-4 text-xs text-muted">기어를 누르면 수량을 바꾸거나 삭제할 수 있어요.</p>
    </UCard>

    <UModal v-model:open="clearOpen" title="보유 변환기어를 모두 삭제할까요?" :description="`${workshop.gears.length}종 ${totalGears}개가 지워져요.`">
      <template #footer>
        <div class="grid w-full grid-cols-2 gap-2">
          <UButton label="취소" color="neutral" variant="soft" size="xl" block @click="clearOpen = false" />
          <UButton label="모두 삭제" color="error" size="xl" block @click="clearAll" />
        </div>
      </template>
    </UModal>
  </div>
</template>
