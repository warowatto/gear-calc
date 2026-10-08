<script setup lang="ts">
const workshop = useWorkshopStore()

// 보유 변환기어는 따로 화면에서 관리하고 여기선 요약만
const gearPreview = computed(() => {
  const list = workshop.gears.map(g => g.teeth)
  return list.length > 12 ? `${list.slice(0, 12).join(', ')} …` : list.join(', ')
})

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
          <span class="shrink-0 text-sm text-muted tabular-nums">{{ workshop.gears.length }}종 · {{ workshop.totalGears }}개</span>
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

    <UCard>
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-lg font-bold">기계</h2>
        <UButton to="/settings/machines/new" icon="i-lucide-plus" label="기계 추가" size="md" variant="soft" />
      </div>

      <p v-if="!workshop.machines.length" class="py-4 text-sm text-muted">
        등록된 기계가 없어요. 기계를 등록하면 분할·차동 변환기어를 계산할 수 있어요.
      </p>

      <ul class="-mx-2 divide-y divide-default">
        <li v-for="m in workshop.machines" :key="m.id">
          <NuxtLink :to="`/settings/machines/${m.id}`" class="flex items-center gap-3 rounded-xl px-2 py-3 active:bg-elevated">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-factory" class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-bold">{{ m.name || '이름 없음' }}</span>
              <span v-if="isMachineReady(m)" class="text-xs text-muted tabular-nums">
                분할상수 {{ m.indexConstant }}{{ isPositive(m.differentialConstant) ? ` · 차동상수 ${m.differentialConstant}` : '' }}
              </span>
              <span v-else class="text-xs font-semibold text-error">분할상수를 입력해 주세요</span>
            </span>
            <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-dimmed" />
          </NuxtLink>
        </li>
      </ul>
    </UCard>

    <p class="px-1 text-xs text-muted">
      설정은 이 기기의 브라우저에만 저장됩니다. 분할상수·차동상수와 계산식은 기계 취급설명서와 꼭 대조하세요.
    </p>
  </div>
</template>
