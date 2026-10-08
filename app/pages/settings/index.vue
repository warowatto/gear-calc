<script setup lang="ts">
const workshop = useWorkshop()

// 보유 변환기어는 따로 화면에서 관리하고 여기선 요약만
const totalGears = computed(() => workshop.value.gears.reduce((n, g) => n + g.qty, 0))
const gearPreview = computed(() => {
  const list = workshop.value.gears.map(g => g.teeth)
  return list.length > 12 ? `${list.slice(0, 12).join(', ')} …` : list.join(', ')
})

// ── 기계 ──
const openId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

function addMachine() {
  const m = newMachine(`호빙머신 ${workshop.value.machines.length + 1}`)
  workshop.value.machines.push(m)
  openId.value = m.id
}

function removeMachine(id: string) {
  if (confirmDeleteId.value !== id) {
    confirmDeleteId.value = id
    setTimeout(() => {
      if (confirmDeleteId.value === id) confirmDeleteId.value = null
    }, 3000)
    return
  }
  workshop.value.machines = workshop.value.machines.filter(m => m.id !== id)
  confirmDeleteId.value = null
}
</script>

<template>
  <div class="space-y-3">
    <InstallAppAlert />

    <NuxtLink to="/settings/gears" class="flex items-center gap-4 rounded-2xl bg-default p-5 active:bg-elevated">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <UIcon name="i-lucide-cog" class="size-6" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex items-baseline justify-between gap-2">
          <span class="text-lg font-bold">보유 변환기어</span>
          <span class="shrink-0 text-sm text-muted tabular-nums">{{ workshop.gears.length }}종 · {{ totalGears }}개</span>
        </span>
        <span class="mt-0.5 block truncate text-sm text-muted tabular-nums">{{ gearPreview || '등록된 변환기어가 없어요' }}</span>
      </span>
      <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-dimmed" />
    </NuxtLink>

    <NuxtLink to="/settings/backup" class="flex items-center gap-4 rounded-2xl bg-default p-5 active:bg-elevated">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <UIcon name="i-lucide-hard-drive-download" class="size-6" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-lg font-bold">백업 · 복원</span>
        <span class="mt-0.5 block truncate text-sm text-muted">기록과 설정을 파일로 옮겨요</span>
      </span>
      <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-dimmed" />
    </NuxtLink>

    <UCard :ui="{ body: 'p-4 sm:p-4' }">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-semibold">기계</h2>
        <UButton icon="i-lucide-plus" label="기계 추가" size="md" variant="soft" @click="addMachine" />
      </div>

      <p v-if="!workshop.machines.length" class="text-sm text-muted">등록된 기계가 없습니다.</p>

      <ul class="divide-y divide-default">
        <li v-for="m in workshop.machines" :key="m.id">
          <UCollapsible :open="openId === m.id" @update:open="v => openId = v ? m.id : null">
            <button type="button" class="flex w-full items-center justify-between gap-3 py-3 text-left">
              <span>
                <span class="block font-semibold">{{ m.name || '이름 없음' }}</span>
                <span class="text-xs text-muted tabular-nums">분할 {{ m.indexConstant }} · 차동 {{ m.differentialConstant }}</span>
              </span>
              <UIcon name="i-lucide-chevron-down" class="size-5 shrink-0 text-muted transition-transform" :class="openId === m.id && 'rotate-180'" />
            </button>
            <template #content>
              <div class="space-y-4 pb-4">
                <UFormField label="기계 이름">
                  <UInput v-model="m.name" size="xl" class="w-full" />
                </UFormField>
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="분할 상수">
                    <UInputNumber v-model="m.indexConstant" size="xl" :min="0" :step="1" :format-options="{ maximumFractionDigits: 6 }" class="w-full" />
                  </UFormField>
                  <UFormField label="차동 상수">
                    <UInputNumber v-model="m.differentialConstant" size="xl" :min="0" :step="0.1" :format-options="{ maximumFractionDigits: 6 }" class="w-full" />
                  </UFormField>
                </div>
                <p class="text-xs text-muted">
                  분할 기어비 = 분할 상수 × 줄수 / 잇수<br>
                  차동 기어비 = 차동 상수 × sinβ / (mn × 줄수)
                </p>
                <USwitch v-model="m.twoStage" size="lg" label="2단 조합 (A/B × C/D)" />
                <USwitch v-model="m.useClearance" size="lg" label="간섭 조건 검사" />
                <UFormField v-if="m.useClearance" label="여유 잇수" help="A + B ≥ C + 여유, C + D ≥ B + 여유">
                  <UInputNumber v-model="m.clearance" size="xl" :min="0" :step="1" class="w-full" />
                </UFormField>
                <UButton
                  :label="confirmDeleteId === m.id ? '한 번 더 누르면 삭제됩니다' : '기계 삭제'"
                  color="error" :variant="confirmDeleteId === m.id ? 'solid' : 'soft'" icon="i-lucide-trash-2" block
                  @click="removeMachine(m.id)"
                />
              </div>
            </template>
          </UCollapsible>
        </li>
      </ul>
    </UCard>

    <p class="px-1 text-xs text-muted">
      설정은 이 기기의 브라우저에만 저장됩니다. 분할·차동 상수와 공식은 기계 취급설명서와 꼭 대조하세요.
    </p>
  </div>
</template>
