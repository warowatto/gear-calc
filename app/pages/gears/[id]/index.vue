<script setup lang="ts">
import { helixFromDifferential } from '~/utils/changeGears'

const route = useRoute()
const id = route.params.id as string
const gears = useGearsStore()
const workshop = useWorkshopStore()
const gear = computed(() => gears.byId(id))
const machine = computed(() => gear.value && workshop.machineById(gear.value.hob.machineId))
const span = computed(() => gear.value && gearSpan(gear.value))
const spec = computed(() => gear.value && toCalcSpec(gear.value.spec))
const isDp = computed(() => gear.value?.spec.unit === 'dp')

const actualHelix = computed(() => {
  const g = gear.value
  if (!g?.hob.diff || !machine.value || !spec.value) return null
  const beta = helixFromDifferential(g.hob.diff.ratio, machine.value.differentialConstant, spec.value.module, g.hob.starts)
  return { beta, errSec: (beta - spec.value.helixAngle) * 3600 }
})

const specRows = computed(() => {
  const g = gear.value
  if (!g || !spec.value) return []
  const s = g.spec
  return [
    s.unit === 'dp' ? ['DP (치직각)', `${s.dp}  (m ${fmt(spec.value.module)})`] : ['모듈 (치직각)', `${s.module}`],
    ['잇수', `${s.teeth}T`],
    ['압력각', `${s.pressureAngle}°`],
    ['비틀림각', s.helixAngle ? `${toDms(s.helixAngle)} (${Number(s.helixAngle.toFixed(6))}°)` : '0° (평기어)'],
    ['전위계수', `${s.profileShift}`],
  ]
})
const detailsOpen = ref(false)

// 뺀 변환기어. 2개 이상 가진 기어는 몇 개 뺐는지 같이 (예: 20, 40×1)
const excludedText = computed(() => {
  const ex = gear.value?.hob.excluded ?? []
  const counts = new Map<number, number>()
  for (const t of ex) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts].sort((a, b) => a[0] - b[0]).map(([t, n]) => {
    const qty = workshop.gears.find(g => g.teeth === t)?.qty ?? 1
    return qty > 1 ? `${t}×${n}` : `${t}`
  }).join(', ')
})

// 이름·메모는 이 화면에서 바로 고친다 (수정 시각도 함께 갱신)
const name = computed({
  get: () => gear.value?.name ?? '',
  set: v => gears.patch(id, { name: v }),
})
const memo = computed({
  get: () => gear.value?.memo ?? '',
  set: v => gears.patch(id, { memo: v }),
})

// 상단 오른쪽 아이콘: 수정 · 삭제 (삭제는 확인창을 거친다)
const deleteOpen = ref(false)

function remove() {
  gears.remove(id)
  navigateTo('/', { replace: true })
}
</script>

<template>
  <div v-if="gear" class="space-y-3">
    <Teleport defer to="#header-actions">
      <UButton icon="i-lucide-square-pen" color="neutral" variant="ghost" size="xl" aria-label="수정" :to="`/gears/${gear.id}/edit`" />
      <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" size="xl" aria-label="삭제" @click="deleteOpen = true" />
    </Teleport>

    <!-- 이름: 바로 고칠 수 있다 -->
    <div class="px-1 pb-1">
      <label class="flex items-center gap-2">
        <input
          v-model="name" type="text" autocomplete="off" enterkeyhint="done"
          placeholder="이름을 붙여보세요"
          class="min-w-0 flex-1 bg-transparent text-[26px]! leading-tight font-bold text-highlighted outline-none placeholder:text-dimmed"
          aria-label="기어 이름"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        >
      </label>
      <p class="mt-1 text-sm text-muted tabular-nums">{{ specSummary(gear.spec) }}</p>
    </div>

    <!-- 걸치기 -->
    <UCard>
      <p class="text-sm font-semibold text-muted">걸치기</p>
      <div v-if="span" class="mt-3 grid grid-cols-[auto_1fr] items-end gap-6">
        <div>
          <p class="text-xs text-muted">잇수</p>
          <p class="text-4xl font-bold tabular-nums">{{ span.spanTeeth }}<span class="ml-1 text-lg text-muted">개</span></p>
        </div>
        <div class="text-right">
          <p class="text-xs text-muted">치수 W{{ spec?.helixAngle ? ' (치직각)' : '' }}</p>
          <p class="text-4xl font-bold tabular-nums text-primary">{{ fmt(span.span) }}<span class="ml-1 text-lg text-muted">mm</span></p>
          <p v-if="isDp" class="font-semibold tabular-nums text-muted">{{ fmt(span.span / MM_PER_INCH, 5) }} in</p>
        </div>
      </div>
      <div v-if="span?.hasTolerance" class="mt-4 rounded-xl bg-muted px-4 py-4">
        <ToleranceRange :min="span.min" :max="span.max" size="lg" />
      </div>
    </UCard>

    <!-- 변환기어 -->
    <UCard>
      <!-- 어떤 기계로: 카드 제목처럼 크게 -->
      <div class="flex items-center gap-3">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-xl"
          :class="machine ? 'bg-primary/10 text-primary' : 'bg-elevated text-muted'"
        >
          <UIcon name="i-lucide-factory" class="size-5" />
        </span>
        <p class="min-w-0 flex-1 truncate text-xl font-bold" :class="machine ? 'text-highlighted' : 'text-muted'">
          {{ machine?.name || '기계 없음' }}
        </p>
        <span v-if="machine" class="shrink-0 rounded-lg bg-elevated px-2.5 py-1 text-sm font-semibold text-toned">호브 {{ gear.hob.starts }}줄</span>
      </div>

      <div v-if="gear.hob.index" class="mt-4">
        <p class="text-xs text-muted">분할 기어</p>
        <div class="mt-1 flex items-center justify-between gap-3">
          <GearComboFraction :combo="gear.hob.index" class="text-3xl" />
          <div class="text-right tabular-nums">
            <p class="text-lg font-bold">{{ gear.hob.index.ratio.toFixed(6) }}</p>
            <p class="text-xs text-muted">오차 {{ errorPercent(gear.hob.index) }}</p>
          </div>
        </div>
      </div>

      <div v-if="gear.hob.diff" class="mt-5 border-t border-default pt-4">
        <p class="text-xs text-muted">차동 기어</p>
        <div class="mt-1 flex items-center justify-between gap-3">
          <GearComboFraction :combo="gear.hob.diff" class="text-3xl" />
          <div class="text-right tabular-nums">
            <p class="text-lg font-bold">{{ gear.hob.diff.ratio.toFixed(6) }}</p>
            <p class="text-xs text-muted">오차 {{ errorPercent(gear.hob.diff) }}</p>
          </div>
        </div>
        <p v-if="actualHelix" class="mt-2 text-xs text-muted tabular-nums">
          가공 비틀림각 {{ toDms(actualHelix.beta) }} ({{ actualHelix.errSec >= 0 ? '+' : '' }}{{ actualHelix.errSec.toFixed(1) }}″)
        </p>
      </div>

      <p v-if="!gear.hob.index && !gear.hob.diff" class="mt-3 text-sm text-dimmed">고른 변환기어가 없어요.</p>
      <p v-if="excludedText" class="mt-4 text-xs text-muted">뺀 변환기어: {{ excludedText }}</p>
    </UCard>

    <!-- 제원 -->
    <UCard>
      <p class="text-sm font-semibold text-muted">제원</p>
      <dl class="mt-3 space-y-2.5">
        <div v-for="[k, v] in specRows" :key="k" class="flex justify-between gap-4">
          <dt class="text-muted">{{ k }}</dt>
          <dd class="font-semibold tabular-nums">{{ v }}</dd>
        </div>
      </dl>

      <button type="button" class="mt-4 flex w-full items-center justify-between text-sm text-muted" @click="detailsOpen = !detailsOpen">
        자세한 계산값
        <UIcon name="i-lucide-chevron-down" class="size-5 transition-transform" :class="detailsOpen && 'rotate-180'" />
      </button>
      <dl v-if="detailsOpen && span" class="mt-3 space-y-2 text-sm">
        <div class="flex justify-between"><dt class="text-muted">이론 걸치기 잇수</dt><dd class="tabular-nums">{{ fmt(span.spanTeethExact, 3) }}</dd></div>
        <div class="flex justify-between"><dt class="text-muted">피치원 지름 d</dt><dd class="tabular-nums">{{ fmt(span.pitchDiameter) }} mm</dd></div>
        <div class="flex justify-between"><dt class="text-muted">기초원 지름 db</dt><dd class="tabular-nums">{{ fmt(span.baseDiameter) }} mm</dd></div>
        <template v-if="spec?.helixAngle">
          <div class="flex justify-between"><dt class="text-muted">정면 압력각 αt</dt><dd class="tabular-nums">{{ fmt(span.transverseAngle) }}°</dd></div>
          <div class="flex justify-between"><dt class="text-muted">기초원 비틀림각 βb</dt><dd class="tabular-nums">{{ fmt(span.baseHelixAngle) }}°</dd></div>
          <div class="flex justify-between"><dt class="text-muted">필요 최소 치폭</dt><dd class="tabular-nums">{{ fmt(span.minFaceWidth, 2) }} mm + 앤빌 폭</dd></div>
        </template>
      </dl>
    </UCard>

    <!-- 메모: 입력칸처럼 보이게 -->
    <UCard>
      <label for="gear-memo" class="text-sm font-semibold text-muted">메모</label>
      <UTextarea
        id="gear-memo" v-model="memo" :rows="3" autoresize size="xl" variant="soft"
        placeholder="도번, 고객, 소재 등을 적어두세요"
        class="mt-3 w-full" :ui="{ base: 'rounded-xl bg-muted px-4 py-3 placeholder:text-dimmed' }"
      />
    </UCard>

    <DeleteGearModal v-model:open="deleteOpen" @confirm="remove" />

    <p class="text-center text-xs text-muted">등록 {{ formatDate(gear.createdAt) }} · 수정 {{ formatDate(gear.updatedAt) }}</p>

  </div>

  <div v-else class="py-16 text-center">
    <p class="font-semibold">기어를 찾을 수 없어요.</p>
    <UButton to="/" label="목록으로" variant="soft" class="mt-4" />
  </div>
</template>
