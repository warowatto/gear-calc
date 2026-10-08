<script setup lang="ts">
// 목록 카드: 어떤 기계로 · 어떤 기어를 · 어떤 변환기어로 · 걸치기 잇수/치수/허용 구간
const props = defineProps<{ gear: GearRecord, /** 검색어 (강조 표시) */ highlight?: string[] }>()
const emit = defineEmits<{ delete: [] }>()

const workshop = useWorkshopStore()
const machine = computed(() => workshop.machineById(props.gear.hob.machineId))
const span = computed(() => gearSpan(props.gear))
const summary = computed(() => specSummary(props.gear.spec))
</script>

<template>
  <!-- 링크 안에 버튼을 넣을 수 없어서 삭제 버튼은 링크 바깥에 겹쳐 둔다 -->
  <div class="relative">
    <NuxtLink :to="`/gears/${gear.id}`" class="block rounded-2xl bg-default p-5 transition-transform active:scale-[0.99]">
      <!-- 어떤 기계로: 카드 맨 위에 눈에 띄게 -->
      <div class="mb-3 flex items-center gap-2">
        <span
          class="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold"
          :class="machine ? 'bg-primary/10 text-primary' : 'bg-elevated text-muted'"
        >
          <UIcon name="i-lucide-factory" class="size-4 shrink-0" />
          <HighlightText class="truncate" :text="machine?.name || '기계 없음'" :tokens="machine ? highlight : undefined" />
        </span>
        <span v-if="machine" class="shrink-0 text-sm font-medium text-muted">호브 {{ gear.hob.starts }}줄</span>
        <span class="ml-auto shrink-0 pr-8 text-xs text-muted">{{ formatDate(gear.updatedAt) }}</span>
      </div>

      <!-- 어떤 기어 -->
      <div class="min-w-0">
        <p class="truncate text-lg font-bold text-highlighted"><HighlightText :text="gear.name || summary" :tokens="highlight" /></p>
        <p class="text-sm text-muted tabular-nums">
          <HighlightText v-if="gear.name" :text="summary" :tokens="highlight" />
          <template v-if="gear.name && gear.memo"> · </template>
          <HighlightText v-if="gear.memo" :text="gear.memo" :tokens="highlight" />
        </p>
      </div>

      <!-- 왼쪽 걸치기, 오른쪽 변환기어 조합 -->
      <div class="mt-4 grid grid-cols-2 gap-2">
        <div class="rounded-xl bg-muted px-4 py-3">
          <p class="text-xs text-muted">걸치기</p>
          <template v-if="span">
            <p class="mt-1 text-lg font-bold tabular-nums">{{ span.spanTeeth }}<span class="ml-0.5 text-sm font-semibold text-muted">개</span></p>
            <p class="text-xl font-bold tabular-nums text-primary">{{ fmt(span.span) }}<span class="ml-0.5 text-sm font-semibold text-muted">mm</span></p>
          </template>
          <p v-else class="mt-1 text-sm text-dimmed">계산할 수 없어요</p>
        </div>

        <div class="flex flex-col justify-center gap-3 rounded-xl bg-muted px-3 py-3">
          <div v-if="gear.hob.index">
            <p class="text-xs text-muted">분할</p>
            <div class="mt-1 flex justify-center">
              <GearComboFraction :combo="gear.hob.index" class="text-xl" />
            </div>
          </div>
          <div v-if="gear.hob.diff">
            <p class="text-xs text-muted">차동</p>
            <div class="mt-1 flex justify-center">
              <GearComboFraction :combo="gear.hob.diff" class="text-xl" />
            </div>
          </div>
          <template v-if="!gear.hob.index && !gear.hob.diff">
            <p class="text-xs text-muted">변환기어</p>
            <p class="text-center text-sm text-dimmed">{{ machine ? '고르지 않았어요' : '기계 없음' }}</p>
          </template>
        </div>
      </div>

      <ToleranceRange v-if="span?.hasTolerance" :min="span.min" :max="span.max" inline class="mt-2 rounded-xl bg-muted px-4 py-3" />
    </NuxtLink>
    <UButton
      icon="i-lucide-trash-2" color="neutral" variant="ghost" size="md" aria-label="삭제"
      class="absolute top-3.5 right-3 text-dimmed"
      @click="emit('delete')"
    />
  </div>
</template>
