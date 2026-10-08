<script setup lang="ts">
const gears = useGearsStore()
const workshop = useWorkshopStore()
const drafts = useDraftsStore()

// 처음 쓰는 사람: 기계 → 보유 변환기어 → 첫 기어 순서로 안내
const setupSteps = computed(() => [
  {
    title: '기계 등록',
    desc: '분할·차동 상수를 넣어요',
    done: workshop.readyMachines.length > 0,
    doneText: `${workshop.readyMachines.length}대`,
    to: '/settings/machines/new',
  },
  {
    title: '보유 변환기어 등록',
    desc: '가진 변환기어 잇수를 넣어요',
    done: workshop.gears.length > 0,
    doneText: `${workshop.gears.length}종`,
    to: '/settings/gears',
  },
])
const setupDone = computed(() => setupSteps.value.every(s => s.done))
const query = ref('')

const items = computed(() => {
  const q = query.value.trim().toLowerCase()
  return gears.recent
    .filter(g => !q || [g.name, g.memo, specSummary(g.spec)].some(t => t.toLowerCase().includes(q)))
})

// 카드의 삭제 버튼 → 확인창 → 삭제
const deleting = ref<GearRecord | null>(null)
const deleteOpen = computed({
  get: () => !!deleting.value,
  set: (v) => { if (!v) deleting.value = null },
})
function removeGear() {
  if (deleting.value) gears.remove(deleting.value.id)
}

function addGear() {
  drafts.startNew(gears.recent[0])
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

    <!-- 첫 이용: 설정부터 차례로 -->
    <div v-if="!gears.list.length" class="rounded-2xl bg-default p-6">
      <p class="text-2xl leading-snug font-bold">
        <template v-if="setupDone">준비가 끝났어요<br>첫 기어를 등록해 볼까요?</template>
        <template v-else-if="setupSteps[0]!.done">좋아요<br>이제 보유 변환기어를 넣어 주세요</template>
        <template v-else>처음이시군요<br>기계부터 등록해 볼까요?</template>
      </p>
      <p class="mt-2 text-muted">기계와 보유 변환기어를 넣어 두면 걸치기 치수와 변환기어를 한 번에 계산하고 기록해요.</p>

      <ol class="mt-6 space-y-2">
        <li v-for="(step, i) in setupSteps" :key="step.to">
          <NuxtLink
            :to="step.to"
            class="flex items-center gap-3 rounded-2xl border-2 px-4 py-4 transition-colors active:bg-elevated"
            :class="step.done ? 'border-transparent bg-muted' : 'border-primary'"
          >
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              :class="step.done ? 'bg-success text-inverted' : 'bg-primary text-inverted'"
            >
              <UIcon v-if="step.done" name="i-lucide-check" class="size-5" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-bold">{{ step.title }}</span>
              <span class="text-sm text-muted">{{ step.done ? `등록됨 · ${step.doneText}` : step.desc }}</span>
            </span>
            <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-dimmed" />
          </NuxtLink>
        </li>
        <li>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors active:bg-elevated"
            :class="setupDone ? 'border-primary' : 'border-default'"
            @click="addGear"
          >
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" :class="setupDone ? 'bg-primary text-inverted' : 'bg-elevated text-muted'">3</span>
            <span class="min-w-0 flex-1">
              <span class="block font-bold">첫 기어 등록</span>
              <span class="text-sm text-muted">{{ setupDone ? '이제 기어를 등록해 보세요' : '기계 없이도 걸치기 치수는 계산할 수 있어요' }}</span>
            </span>
            <UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-dimmed" />
          </button>
        </li>
      </ol>
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
