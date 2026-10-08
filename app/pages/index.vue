<script setup lang="ts">
const gears = useGears()
const draft = useGearDraft()
const query = ref('')

const items = computed(() => {
  const q = query.value.trim().toLowerCase()
  return [...gears.value.list]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter(g => !q || [g.name, g.memo, specSummary(g.spec)].some(t => t.toLowerCase().includes(q)))
})

// 카드의 삭제 버튼 → 확인창 → 삭제
const deleting = ref<GearRecord | null>(null)
const deleteOpen = computed({
  get: () => !!deleting.value,
  set: (v) => { if (!v) deleting.value = null },
})
function removeGear() {
  const id = deleting.value?.id
  gears.value.list = gears.value.list.filter(g => g.id !== id)
}

function addGear() {
  // 가장 최근 기어의 기계·호브·뺀 변환기어는 이어받는다
  const latest = [...gears.value.list].sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const gear = createGear()
  if (latest) {
    gear.hob.machineId = latest.hob.machineId
    gear.hob.starts = latest.hob.starts
    gear.hob.excluded = [...latest.hob.excluded]
  }
  draft.value.gear = gear
  navigateTo('/gears/new')
}
</script>

<template>
  <div class="space-y-3">
    <!-- 헤더 오른쪽 위 등록 버튼 -->
    <Teleport defer to="#header-actions">
      <UButton icon="i-lucide-plus" color="neutral" variant="ghost" size="xl" aria-label="기어 등록" @click="addGear" />
    </Teleport>

    <!-- 검색창: 스크롤해도 헤더 아래에 붙어 있다 -->
    <div
      v-if="gears.list.length"
      class="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 -mt-2 bg-[#f2f4f6] px-4 pt-2 pb-1"
    >
      <UInput
        v-model="query" size="xl" icon="i-lucide-search" placeholder="이름, 메모, M2, 30T…"
        class="w-full" :ui="{ base: 'rounded-xl bg-default ring-0' }"
      />
    </div>

    <div v-if="!gears.list.length" class="rounded-2xl bg-default px-6 py-14 text-center">
      <UIcon name="i-lucide-cog" class="size-12 text-primary" />
      <p class="mt-4 text-xl font-bold">첫 기어를 등록해 보세요</p>
      <p class="mt-2 text-muted">걸치기 치수와 변환기어를<br>한 번에 계산하고 기록해요.</p>
      <UButton icon="i-lucide-plus" label="기어 등록하기" size="xl" class="mt-6 rounded-2xl px-6 font-bold" @click="addGear" />
    </div>

    <p v-else-if="!items.length" class="py-8 text-center text-sm text-muted">검색 결과가 없어요.</p>

    <ul class="space-y-3">
      <li v-for="g in items" :key="g.id">
        <GearHistoryCard :gear="g" @delete="deleting = g" />
      </li>
    </ul>

    <DeleteGearModal v-model:open="deleteOpen" :name="deleting?.name || (deleting ? specTitle(deleting.spec) : '')" @confirm="removeGear" />
  </div>
</template>
