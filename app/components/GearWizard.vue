<script setup lang="ts">
import { calcSpan, spanForTeeth } from '~/utils/spanMeasurement'

// 토스식 단계별 기어 등록/수정. 단계는 ?step= 에 두어서 휴대폰 뒤로가기로 이전 단계로 돌아간다
const props = defineProps<{
  gear: GearRecord
  mode: 'new' | 'edit'
  /** 마지막 단계에서 저장하고 이동할 경로를 돌려준다 */
  finish: () => string
  /** 닫기(X) 했을 때 이동할 경로 */
  cancel: () => string
}>()

const route = useRoute()
const router = useRouter()
const keyboard = useKeyboardInset()

const gear = toRef(props, 'gear')
const {
  workshop, spec, machine, helical,
  usableOf, usableKinds, toggleGear,
  indexTarget, diffTarget, indexCombos, diffCombos, hasExactIndex, searching, showLoading, actualHelix,
} = useChangeGearSearch(gear)

// ── 걸치기 ──
const autoSpan = computed(() => isValidSpec(spec.value) ? calcSpan(spec.value) : null)
const span = computed(() => gearSpan(gear.value))
const kOptions = computed(() => {
  const auto = autoSpan.value?.spanTeeth
  if (!auto) return []
  return [auto - 1, auto, auto + 1].filter(k => k >= 1)
    .map(k => ({ k, W: spanForTeeth(spec.value, k), recommended: k === auto }))
})
function pickK(k: number) {
  gear.value.span.overrideK = k === autoSpan.value?.spanTeeth ? null : k
  customOpen.value = false
}

// 목록(추천 ±1) 밖의 잇수는 직접 입력. 걸치기 잇수는 1 ~ z−1 개
const savedK = gear.value.span.overrideK
const customOpen = ref(savedK !== null && !kOptions.value.some(o => o.k === savedK))
const customK = ref<number>(customOpen.value ? savedK! : NaN)
const maxK = computed(() => Math.max(1, Math.floor(spec.value.teeth) - 1))
const customValid = computed(() => Number.isInteger(customK.value) && customK.value >= 1 && customK.value <= maxK.value)
const customW = computed(() => customValid.value ? spanForTeeth(spec.value, customK.value) : NaN)
watch(customK, () => {
  if (customOpen.value && customValid.value) {
    gear.value.span.overrideK = customK.value === autoSpan.value?.spanTeeth ? null : customK.value
  }
})
function openCustom() {
  customOpen.value = true
  customK.value = NaN
}

// 제원이 바뀌면 직접 고른 걸치기 잇수는 다시 자동으로
watch(() => JSON.stringify(gear.value.spec), () => {
  gear.value.span.overrideK = null
  customOpen.value = false
  customK.value = NaN
})
const showTolerance = ref(!!(gear.value.span.upper || gear.value.span.lower))
// 공차 입력을 끄면 넣었던 치수차도 지운다 (꺼져 있는데 허용 구간이 남아 있지 않게)
watch(showTolerance, (on) => {
  if (!on) {
    gear.value.span.upper = 0
    gear.value.span.lower = 0
  }
})

// ── 기계 ──
// 분할 상수까지 넣은 기계만 고를 수 있다
const hasMachines = computed(() => workshop.readyMachines.length > 0)
if (!isMachineReady(machine.value)) {
  const first = workshop.readyMachines[0]
  if (first) gear.value.hob.machineId = first.id
}
const gearsOpen = ref(false)

// ── 단계 ──
interface Step {
  key: string
  title: string
  description?: string
  valid: boolean
  cta?: string
}

const sizeLabel = computed(() => gear.value.spec.unit === 'dp' ? 'DP' : '모듈')

const steps = computed<Step[]>(() => {
  const s = gear.value.spec
  const list: Step[] = [
    { key: 'size', title: `${sizeLabel.value}을 알려주세요`, description: s.unit === 'dp' ? '헬리컬은 치직각 DP(NDP)를 입력하세요.' : '헬리컬은 치직각 모듈을 입력하세요.', valid: s.unit === 'dp' ? isPositive(s.dp) : isPositive(s.module) },
    {
      key: 'spec',
      title: '기어 제원을 알려주세요',
      description: '평기어는 비틀림각 0°, 전위가 없으면 전위계수 0으로 두세요.',
      valid: Number.isInteger(s.teeth) && s.teeth >= 3
        && isPositive(s.pressureAngle) && s.pressureAngle < 45
        && isNumber(s.helixAngle) && s.helixAngle >= 0 && s.helixAngle < 90
        && isNumber(s.profileShift) && Math.abs(s.profileShift) < 3,
    },
    { key: 'span', title: '걸치기 잇수를 확인해주세요', description: '추천 잇수로 계산했어요. 다른 잇수로 잴 거면 골라주세요.', valid: !!span.value && (!customOpen.value || customValid.value) },
    { key: 'machine', title: '어떤 기계로 가공하나요?', valid: !hasMachines.value || (isMachineReady(machine.value) && isPositive(gear.value.hob.starts)), cta: hasMachines.value ? undefined : '건너뛰기' },
  ]
  if (isMachineReady(machine.value)) {
    list.push({ key: 'index', title: '분할 기어를 골라주세요', valid: true, cta: gear.value.hob.index ? undefined : '고르지 않고 넘어가기' })
    if (helical.value) {
      list.push({ key: 'diff', title: '차동 기어를 골라주세요', valid: true, cta: gear.value.hob.diff ? undefined : '고르지 않고 넘어가기' })
    }
  }
  return list
})

const stepIndex = computed(() => Math.max(0, steps.value.findIndex(s => s.key === route.query.step)))
const step = computed(() => steps.value[stepIndex.value]!)
const progress = computed(() => ((stepIndex.value + 1) / steps.value.length) * 100)
const isLast = computed(() => stepIndex.value === steps.value.length - 1)

function next() {
  if (!step.value.valid) return
  if (isLast.value) return leave(props.finish())
  router.push({ query: { ...route.query, step: steps.value[stepIndex.value + 1]!.key } })
}

function back() {
  if (stepIndex.value === 0) leave(props.cancel())
  else router.back()
}

/** 쌓인 단계 기록을 걷어내고 목적지로 간다 (뒤로가기로 단계 화면이 다시 나오지 않게) */
async function leave(to: string) {
  const depth = stepIndex.value + 1
  await new Promise<void>((resolve) => {
    const stop = watch(() => route.fullPath, () => {
      stop()
      resolve()
    })
    // 기록이 없으면(주소로 바로 들어온 경우) 이동이 안 일어나므로 잠시 뒤 그냥 진행
    setTimeout(() => {
      stop()
      resolve()
    }, 400)
    router.go(-depth)
  })
  // 진입 화면(목록 또는 상세)으로 돌아왔으니, 목적지가 다르면 그 위에 쌓는다
  if (route.fullPath !== to) await router.push(to)
}

const unitItems = [
  { label: '모듈', value: 'module' as const },
  { label: 'DP', value: 'dp' as const },
]
const moduleChips = [1, 1.5, 2, 2.5, 3, 4, 5, 6].map(v => ({ label: String(v), value: v }))
const dpChips = [4, 5, 6, 8, 10, 12, 16, 20].map(v => ({ label: String(v), value: v }))
const pressureChips = [14.5, 20, 25].map(v => ({ label: `${v}°`, value: v }))
const helixChips = [{ label: '평기어 (0°)', value: 0 }]
const startsChips = [1, 2, 3].map(v => ({ label: `${v}줄`, value: v }))
</script>

<template>
  <div class="min-h-dvh bg-default">
    <!-- 상단: 뒤로, 진행률, 닫기 -->
    <header class="sticky top-0 z-10 bg-default pt-[env(safe-area-inset-top)]">
      <div class="mx-auto flex max-w-xl items-center justify-between px-2 py-2">
        <UButton icon="i-lucide-chevron-left" color="neutral" variant="ghost" size="xl" aria-label="이전" @click="back" />
        <span class="text-sm text-muted tabular-nums">{{ stepIndex + 1 }} / {{ steps.length }}</span>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xl" aria-label="닫기" @click="leave(cancel())" />
      </div>
      <div class="h-1 bg-elevated">
        <div class="h-full bg-primary transition-all duration-300" :style="{ width: `${progress}%` }" />
      </div>
    </header>

    <main class="mx-auto max-w-xl px-6 pt-8 pb-40">
      <Transition name="step" mode="out-in">
        <section :key="step.key">
          <h1 class="text-[26px] leading-snug font-bold whitespace-pre-line text-highlighted">{{ step.title }}</h1>
          <p v-if="step.description" class="mt-2 text-muted">{{ step.description }}</p>

          <div class="mt-10 space-y-6">
            <!-- 모듈 / DP -->
            <template v-if="step.key === 'size'">
              <UTabs v-model="gear.spec.unit" :items="unitItems" :content="false" size="lg" class="w-full" />
              <BigNumberInput v-if="gear.spec.unit === 'module'" :key="'m'" v-model="gear.spec.module" placeholder="2" suffix="mm" autofocus />
              <BigNumberInput v-else :key="'dp'" v-model="gear.spec.dp" placeholder="10" suffix="DP" autofocus />
              <ChoiceChips v-if="gear.spec.unit === 'module'" v-model="gear.spec.module" :options="moduleChips" />
              <ChoiceChips v-else v-model="gear.spec.dp" :options="dpChips" />
              <p v-if="gear.spec.unit === 'dp' && isPositive(gear.spec.dp)" class="text-sm text-muted">
                모듈로 바꾸면 {{ fmt(MM_PER_INCH / gear.spec.dp) }} 이에요.
              </p>
            </template>

            <!-- 잇수 · 압력각 · 비틀림각 · 전위계수 한 화면에 -->
            <template v-else-if="step.key === 'spec'">
              <div class="grid grid-cols-2 gap-x-5 gap-y-8">
                <div>
                  <p class="mb-2 text-sm font-semibold text-muted">잇수</p>
                  <BigNumberInput v-model="gear.spec.teeth" placeholder="30" suffix="T" size="md" autofocus />
                </div>
                <div>
                  <p class="mb-2 text-sm font-semibold text-muted">전위계수</p>
                  <BigNumberInput v-model="gear.spec.profileShift" placeholder="0" size="md" allow-negative />
                </div>
                <!-- 각도는 소수 ↔ 도분초 전환. 도분초는 칸이 세 개라 한 줄을 다 쓴다 -->
                <AngleInput v-model="gear.spec.pressureAngle" label="압력각" pref-key="pressure" placeholder="20" :options="pressureChips" class="col-span-2" />
                <AngleInput v-model="gear.spec.helixAngle" label="비틀림각" pref-key="helix" :options="helixChips" class="col-span-2" />
              </div>
            </template>

            <!-- 걸치기 잇수 -->
            <template v-else-if="step.key === 'span' && span">
              <div class="rounded-2xl bg-muted p-5">
                <p class="text-sm text-muted">걸치기 치수 W{{ helical ? ' (치직각)' : '' }}</p>
                <p class="mt-1 text-4xl font-bold tabular-nums text-highlighted">
                  {{ fmt(span.span) }}<span class="ml-1 text-lg font-semibold text-muted">mm</span>
                </p>
                <p v-if="gear.spec.unit === 'dp'" class="mt-1 font-semibold tabular-nums text-muted">{{ fmt(span.span / MM_PER_INCH, 5) }} in</p>
                <div v-if="showTolerance" class="mt-4 border-t border-default pt-4">
                  <ToleranceRange v-if="span.hasTolerance" :min="span.min" :max="span.max" />
                  <p v-else class="text-sm text-dimmed">치수차를 입력하면 허용 구간이 나와요.</p>
                </div>
              </div>

              <ul class="space-y-2">
                <li v-for="o in kOptions" :key="o.k">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-colors"
                    :class="span.spanTeeth === o.k ? 'border-primary bg-primary/5' : 'border-default'"
                    @click="pickK(o.k)"
                  >
                    <span class="flex items-center gap-2 text-lg font-bold">
                      {{ o.k }}개 걸치기
                      <UBadge v-if="o.recommended" label="추천" color="primary" variant="subtle" />
                    </span>
                    <span class="font-semibold tabular-nums text-muted">{{ fmt(o.W) }} mm</span>
                  </button>
                </li>
                <li>
                  <button
                    v-if="!customOpen" type="button"
                    class="flex w-full items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-default px-5 py-4 font-semibold text-muted active:bg-elevated"
                    @click="openCustom"
                  >
                    <UIcon name="i-lucide-pencil" class="size-4" />
                    다른 잇수 직접 입력
                  </button>
                  <div
                    v-else
                    class="rounded-2xl border-2 px-5 py-4 transition-colors"
                    :class="customValid ? 'border-primary bg-primary/5' : 'border-default'"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-semibold text-muted">직접 입력</span>
                      <span class="font-semibold tabular-nums text-muted">{{ customValid ? `${fmt(customW)} mm` : '' }}</span>
                    </div>
                    <BigNumberInput v-model="customK" :placeholder="String(span.spanTeeth)" suffix="개 걸치기" size="md" autofocus class="mt-2" />
                    <p v-if="!Number.isNaN(customK) && !customValid" class="mt-2 text-sm text-error">1 ~ {{ maxK }}개 사이로 입력하세요.</p>
                  </div>
                </li>
              </ul>

              <USwitch v-model="showTolerance" size="lg" label="치수 공차도 입력할래요" />
              <div v-if="showTolerance" class="grid grid-cols-2 gap-6">
                <div>
                  <p class="mb-2 text-sm text-muted">위 치수차</p>
                  <BigNumberInput v-model="gear.span.upper" placeholder="0" suffix="mm" allow-negative size="md" />
                </div>
                <div>
                  <p class="mb-2 text-sm text-muted">아래 치수차</p>
                  <BigNumberInput v-model="gear.span.lower" placeholder="0" suffix="mm" allow-negative size="md" />
                </div>
              </div>
            </template>

            <!-- 기계 -->
            <template v-else-if="step.key === 'machine'">
              <div v-if="!hasMachines" class="rounded-2xl bg-muted p-5">
                <p class="font-semibold">{{ workshop.machines.length ? '분할 상수를 넣은 기계가 없어요' : '등록된 기계가 없어요' }}</p>
                <p class="mt-1 text-sm text-muted">기계를 등록하면 변환기어도 함께 기록할 수 있어요. 지금은 건너뛰어도 돼요.</p>
                <UButton
                  :to="workshop.machines[0] ? `/settings/machines/${workshop.machines[0].id}` : '/settings/machines/new'"
                  :label="workshop.machines.length ? '분할 상수 넣으러 가기' : '기계 등록하러 가기'" variant="soft" class="mt-4"
                />
              </div>
              <template v-else>
                <ul class="space-y-2">
                  <li v-for="m in workshop.machines" :key="m.id">
                    <button
                      v-if="isMachineReady(m)"
                      type="button"
                      class="flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-colors"
                      :class="gear.hob.machineId === m.id ? 'border-primary bg-primary/5' : 'border-default'"
                      @click="gear.hob.machineId = m.id"
                    >
                      <span>
                        <span class="block text-lg font-bold">{{ m.name || '이름 없음' }}</span>
                        <span class="text-sm text-muted tabular-nums">분할 {{ m.indexConstant }}{{ isPositive(m.differentialConstant) ? ` · 차동 ${m.differentialConstant}` : '' }}</span>
                      </span>
                      <UIcon v-if="gear.hob.machineId === m.id" name="i-lucide-circle-check" class="size-6 text-primary" />
                    </button>
                    <!-- 상수가 없어서 아직 고를 수 없는 기계 -->
                    <NuxtLink
                      v-else :to="`/settings/machines/${m.id}`"
                      class="flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-default px-5 py-4"
                    >
                      <span>
                        <span class="block text-lg font-bold text-muted">{{ m.name || '이름 없음' }}</span>
                        <span class="text-sm font-semibold text-error">분할 상수를 넣어야 쓸 수 있어요</span>
                      </span>
                      <UIcon name="i-lucide-chevron-right" class="size-5 text-dimmed" />
                    </NuxtLink>
                  </li>
                </ul>
                <div>
                  <p class="mb-3 font-semibold">호브 줄수</p>
                  <ChoiceChips v-model="gear.hob.starts" :options="startsChips" />
                </div>
              </template>
            </template>

            <!-- 분할 / 차동 기어 -->
            <template v-else-if="step.key === 'index' || step.key === 'diff'">
              <div class="rounded-2xl bg-muted px-5 py-4">
                <!-- 어떤 기계인지 가장 크게 -->
                <div class="flex items-center gap-2.5">
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UIcon name="i-lucide-factory" class="size-5" />
                  </span>
                  <p class="min-w-0 flex-1 truncate text-2xl font-bold">{{ machine?.name }}</p>
                  <span class="shrink-0 rounded-lg bg-default px-2.5 py-1 text-sm font-semibold text-toned">호브 {{ gear.hob.starts }}줄</span>
                </div>
                <div class="mt-3 flex items-baseline justify-between gap-3 border-t border-default pt-3">
                  <span class="text-sm text-muted">목표 기어비</span>
                  <span class="text-lg font-bold tabular-nums">{{ (step.key === 'index' ? indexTarget : diffTarget)?.toFixed(8) ?? '—' }}</span>
                </div>
                <p v-if="step.key === 'index'" class="text-right text-xs text-muted tabular-nums">
                  분할 상수 {{ machine?.indexConstant }} × {{ gear.hob.starts }}줄 / {{ spec.teeth }}T
                </p>
                <p v-else class="text-right text-xs text-muted tabular-nums">
                  차동 상수 {{ machine?.differentialConstant }} × sin {{ formatAngle(spec.helixAngle) }} / ({{ fmt(spec.module) }} × {{ gear.hob.starts }}줄)
                </p>
              </div>

              <div>
                <button type="button" class="flex w-full items-center justify-between py-1 text-sm font-semibold" @click="gearsOpen = !gearsOpen">
                  사용 변환기어 {{ usableKinds }}/{{ workshop.gears.length }}종
                  <span class="flex items-center gap-1 font-normal text-muted">
                    빼기
                    <UIcon name="i-lucide-chevron-down" class="size-5 transition-transform" :class="gearsOpen && 'rotate-180'" />
                  </span>
                </button>
                <template v-if="gearsOpen">
                  <p class="mt-2 text-xs text-muted">쓰고 있는 기어를 누르면 빠져요. 2개 있는 기어는 누를 때마다 하나씩 빠지고, 다 빠진 뒤 누르면 돌아와요.</p>
                  <div class="mt-3 grid grid-cols-5 gap-2">
                    <button
                      v-for="g in workshop.gears" :key="g.teeth" type="button"
                      class="flex h-12 flex-col items-center justify-center rounded-xl border font-bold tabular-nums transition-colors"
                      :class="usableOf(g) === 0
                        ? 'border-dashed border-default text-dimmed line-through'
                        : usableOf(g) < g.qty
                          ? 'border-dashed border-primary bg-primary/5 text-primary'
                          : 'border-primary bg-primary/10 text-primary'"
                      @click="toggleGear(g)"
                    >
                      <span class="leading-none">{{ g.teeth }}</span>
                      <!-- 2개 이상이면 남은 개수 / 보유 개수 -->
                      <span v-if="g.qty > 1" class="mt-0.5 text-[10px] leading-none font-semibold no-underline">{{ usableOf(g) }}/{{ g.qty }}</span>
                    </button>
                  </div>
                </template>
              </div>

              <UAlert
                v-if="step.key === 'diff' && !isPositive(machine?.differentialConstant)"
                color="warning" variant="subtle" icon="i-lucide-triangle-alert"
                title="이 기계에 차동 상수가 없어요"
                description="헬리컬 기어의 차동 기어를 찾으려면 기계 설정에서 차동 상수를 넣어 주세요."
                :actions="[{ label: '기계 설정', to: `/settings/machines/${machine?.id}`, color: 'warning', variant: 'solid' }]"
              />
              <!-- 조합 목록. 다시 찾는 중이면 흐리게 + 로딩 -->
              <div class="relative min-h-40">
                <div v-if="showLoading" class="absolute inset-x-0 top-6 z-10 flex flex-col items-center gap-3">
                  <UIcon name="i-lucide-loader-circle" class="size-9 animate-spin text-primary" />
                  <p class="text-sm font-semibold text-muted">맞는 조합을 찾는 중이에요</p>
                </div>
                <div class="transition-opacity" :class="showLoading && 'pointer-events-none opacity-30'">
                  <UAlert
                    v-if="!searching && step.key === 'index' && indexCombos.length && !hasExactIndex"
                    color="warning" variant="subtle" icon="i-lucide-triangle-alert" class="mb-4"
                    title="정확히 맞는 조합이 없어요"
                    description="분할 기어는 오차가 있으면 안 돼요. 뺀 변환기어를 다시 넣어 보세요."
                  />
                  <GearComboTable v-if="step.key === 'index' && indexCombos.length" v-model:selected="gear.hob.index" :combos="indexCombos" />
                  <GearComboTable v-else-if="step.key === 'diff' && diffCombos.length" v-model:selected="gear.hob.diff" :combos="diffCombos" extra-label="가공 비틀림각" :extra="actualHelix" />
                  <p v-else-if="!searching" class="py-6 text-center text-muted">사용할 수 있는 변환기어로 만들 수 있는 조합이 없어요.</p>
                </div>
              </div>
            </template>

          </div>
        </section>
      </Transition>
    </main>

    <!-- 하단 버튼: 키보드가 올라오면 키보드 위에 붙는다 -->
    <div
      class="fixed inset-x-0 z-10 bg-gradient-to-t from-default from-70% to-transparent px-4 pt-6"
      :style="{ bottom: `${keyboard}px`, paddingBottom: keyboard ? '12px' : 'max(16px, env(safe-area-inset-bottom))' }"
    >
      <div class="mx-auto max-w-xl">
        <UButton
          :label="isLast ? (mode === 'new' ? '등록하기' : '저장하기') : (step.cta ?? '다음')"
          :disabled="!step.valid"
          size="xl" block
          class="h-14 rounded-2xl text-lg font-bold"
          @click="next"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.step-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.step-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
