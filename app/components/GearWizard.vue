<script setup lang="ts">
import { calcSpan, spanForTeeth } from '~/utils/spanMeasurement'
import { comboFromSet, isExact, sameCombo } from '~/utils/changeGears'

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
// 공차 입력은 처음부터 켜 둔다 (끄면 넣었던 치수차를 지운다)
const showTolerance = ref(true)
// 공차 입력을 끄면 넣었던 치수차도 지운다 (꺼져 있는데 허용 구간이 남아 있지 않게)
watch(showTolerance, (on) => {
  if (!on) {
    gear.value.span.upper = 0
    gear.value.span.lower = 0
  }
})

// ── 기계 ──
// 분할상수까지 넣은 기계만 고를 수 있다
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
  /** 막힌 이유 (있으면 버튼 위에 보여준다) */
  problems?: string[]
  cta?: string
}

const sizeLabel = computed(() => gear.value.spec.unit === 'dp' ? 'DP' : '모듈')

// ── 기본 분할 기어: 기계에 저장한 조합. 이번 잇수에 정확히 맞으면 자동으로 고른다 ──
const defaultIndexCombo = computed(() => {
  const set = machine.value?.defaultIndex
  return set ? comboFromSet(set, indexTarget.value) : null
})
const defaultIndexExact = computed(() => !!defaultIndexCombo.value && isExact(defaultIndexCombo.value))
// 기본 조합이 맞으면 다른 조합 목록·빼기는 접어 두고, "다른 조합 고르기"로 펼친다
const showOtherIndex = ref(false)
const indexCollapsed = computed(() => defaultIndexExact.value && !showOtherIndex.value)
const usingDefaultIndex = computed(() =>
  !!gear.value.hob.index && !!defaultIndexCombo.value && sameCombo(gear.value.hob.index, defaultIndexCombo.value))
function useDefaultIndex() {
  if (defaultIndexCombo.value) gear.value.hob.index = { ...defaultIndexCombo.value }
}

// "다음"이 막힐 때 무엇이 문제인지 보여준다
const withProblems = (problems: string[]) => ({ valid: problems.length === 0, problems })
const sizeProblems = computed(() => formProblems(sizeInputSchema, gear.value.spec))
const specProblems = computed(() => formProblems(specInputSchema, gear.value.spec))
const spanProblems = computed(() => formProblems(spanInputSchema, gear.value.span))

const steps = computed<Step[]>(() => {
  const s = gear.value.spec
  const list: Step[] = [
    { key: 'size', title: `${sizeLabel.value}을 알려주세요`, description: s.unit === 'dp' ? '헬리컬은 치직각 DP(NDP)를 입력하세요.' : '헬리컬은 치직각 모듈을 입력하세요.', ...withProblems(sizeProblems.value) },
    {
      key: 'spec',
      title: '기어 제원을 알려주세요',
      description: '평기어는 비틀림각 0°, 전위가 없으면 전위계수 0으로 두세요.',
      ...withProblems(specProblems.value),
    },
    { key: 'span', title: '걸치기 잇수를 확인해주세요', description: '추천 잇수로 계산했어요. 다른 잇수로 잴 거면 골라주세요.', valid: !!span.value && (!customOpen.value || customValid.value) && !spanProblems.value.length, problems: spanProblems.value },
    { key: 'machine', title: '어떤 기계로 가공하나요?', valid: !hasMachines.value || (isMachineReady(machine.value) && isPositive(gear.value.hob.starts)), cta: hasMachines.value ? undefined : '건너뛰기' },
  ]
  if (isMachineReady(machine.value)) {
    const indexAsk = !defaultIndexCombo.value
      ? { title: '분할 기어를 골라주세요' }
      : defaultIndexExact.value
        ? { title: '이 분할 기어로\n셋팅하면 돼요', description: '기계에 저장한 기본 조합이 이 잇수에 맞아요.' }
        : { title: '기본 조합이\n이 잇수엔 안 맞아요', description: '아래에서 맞는 분할 기어를 골라 주세요.' }
    list.push({ key: 'index', ...indexAsk, valid: true, cta: gear.value.hob.index ? undefined : '고르지 않고 넘어가기' })
    if (helical.value) {
      list.push({ key: 'diff', title: '차동 기어를 골라주세요', valid: true, cta: gear.value.hob.diff ? undefined : '고르지 않고 넘어가기' })
    }
  }
  return list
})

const stepIndex = computed(() => Math.max(0, steps.value.findIndex(s => s.key === route.query.step)))
const step = computed(() => steps.value[stepIndex.value]!)

// 분할 단계에 들어오면(또는 목표 기어비가 바뀌면) 아직 고른 조합이 없을 때만 기본 조합을 골라 둔다
watch([() => step.value.key, defaultIndexCombo], () => {
  if (step.value.key === 'index' && !gear.value.hob.index && defaultIndexExact.value) useDefaultIndex()
}, { immediate: true })
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

// 등록·수정을 시작할 때 앞 화면(목록·상세)이 앱 안에 있었는지 기억해 둔다. 끝낼 때 단계 기록을 걷어낼지 정하는 데 쓴다.
// 새로고침이나 GitHub Pages의 주소 끝 / 리다이렉트로 브라우저 기록 정보가 바뀌어도 처음 값을 유지하도록
// 같은 기어(초안 id)면 덮어쓰지 않는다
const entryKey = `gear-calc:wizard-entry:${props.mode}`
onMounted(() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(entryKey) ?? 'null')
    if (saved?.gearId === props.gear.id) return
    sessionStorage.setItem(entryKey, JSON.stringify({ gearId: props.gear.id, fromApp: !!window.history.state?.back }))
  }
  catch {}
})

/** 쌓인 단계 기록을 걷어내고 목적지로 간다 (뒤로가기로 단계 화면이 다시 나오지 않게) */
async function leave(to: string) {
  let fromApp = false
  try {
    const saved = JSON.parse(sessionStorage.getItem(entryKey) ?? 'null')
    fromApp = saved?.gearId === props.gear.id && saved.fromApp
    sessionStorage.removeItem(entryKey)
  }
  catch {}
  // 단계마다 기록이 하나씩 쌓이므로 (지금 단계 번호 + 1)칸 되돌리면 진입 화면이다
  const delta = fromApp ? stepIndex.value + 1 : 0

  if (delta > 0) {
    // 등록 중에 새로고침했다면 되돌아간 화면은 브라우저가 처음부터 다시 불러온다. 그러면 이 코드가 사라지므로
    // 갈 곳을 적어 두고, 앱이 다시 뜰 때 plugins/resume-navigation 이 이어서 이동한다
    setPendingNavigation(to)
    // 되돌리기가 끝날 때까지 기다린다. 이 화면은 그사이 사라지므로 화면이 아닌 라우터 전체의 이동 완료(afterEach)를 쓴다.
    // 목록 화면 코드를 네트워크로 받느라 몇 초 걸릴 수 있어서, 브라우저 기록이 실제로 움직였으면(popstate) 끝까지 기다린다.
    await new Promise<void>((resolve) => {
      let moved = false
      const onPop = () => {
        moved = true
      }
      const finish = () => {
        off()
        window.removeEventListener('popstate', onPop)
        clearTimeout(noMove)
        clearTimeout(giveUp)
        resolve()
      }
      const off = router.afterEach(finish)
      window.addEventListener('popstate', onPop)
      // 기록이 움직이지 않으면(예외 상황) 1초 뒤 그냥 진행, 움직였으면 이동이 끝날 때까지 (최대 15초)
      const noMove = setTimeout(() => {
        if (!moved) finish()
      }, 1000)
      const giveUp = setTimeout(finish, 15000)
      router.go(-delta)
    })
  }
  // 진입 화면으로 돌아왔으니 목적지가 다르면 그 위에 쌓고, 진입 화면이 없으면 지금 기록을 바꾼다
  // (GitHub Pages는 주소 끝에 / 를 붙이기도 해서 떼고 비교)
  const same = (x: string) => x.replace(/(.)\/+(\?|$)/, '$1$2')
  clearPendingNavigation()
  if (same(router.currentRoute.value.fullPath) !== same(to)) await (delta > 0 ? router.push(to) : router.replace(to))
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
              <BigNumberInput v-if="gear.spec.unit === 'module'" :key="'m'" v-model="gear.spec.module" placeholder="예) 2" suffix="mm" autofocus />
              <BigNumberInput v-else :key="'dp'" v-model="gear.spec.dp" placeholder="예) 10" suffix="DP" autofocus />
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
                  <p class="mb-2 text-lg font-bold text-toned">잇수</p>
                  <BigNumberInput v-model="gear.spec.teeth" placeholder="예) 30" suffix="T" size="md" autofocus />
                </div>
                <div>
                  <p class="mb-2 text-lg font-bold text-toned">전위계수</p>
                  <BigNumberInput v-model="gear.spec.profileShift" placeholder="0" size="md" allow-negative zero-when-empty />
                </div>
                <!-- 각도는 소수 ↔ 도분초 전환. 도분초는 칸이 세 개라 한 줄을 다 쓴다 -->
                <AngleInput v-model="gear.spec.pressureAngle" label="압력각" pref-key="pressure" placeholder="예) 20" :options="pressureChips" class="col-span-2" />
                <AngleInput v-model="gear.spec.helixAngle" label="비틀림각" pref-key="helix" :options="helixChips" zero-when-empty class="col-span-2" />
              </div>
            </template>

            <!-- 걸치기 잇수 -->
            <template v-else-if="step.key === 'span' && span">
              <p v-if="helical" class="text-sm text-muted">헬리컬은 치직각 기준 치수예요.</p>

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
                    <span class="text-right tabular-nums">
                      <span class="font-bold" :class="span.spanTeeth === o.k ? 'text-lg text-primary' : 'text-muted'">{{ fmt(o.W) }} mm</span>
                      <span v-if="gear.spec.unit === 'dp'" class="block text-xs text-muted">{{ fmt(o.W / MM_PER_INCH, 5) }} in</span>
                    </span>
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
                  <p class="mb-2 text-lg font-bold text-toned">위 치수차</p>
                  <BigNumberInput v-model="gear.span.upper" placeholder="0" suffix="mm" allow-negative size="md" zero-when-empty />
                </div>
                <div>
                  <p class="mb-2 text-lg font-bold text-toned">아래 치수차</p>
                  <BigNumberInput v-model="gear.span.lower" placeholder="0" suffix="mm" allow-negative size="md" zero-when-empty />
                </div>
              </div>
              <div v-if="showTolerance" class="rounded-2xl bg-muted px-5 py-4">
                <ToleranceRange v-if="span.hasTolerance" :min="span.min" :max="span.max" />
                <p v-else class="text-sm text-dimmed">치수차를 입력하면 허용 구간이 나와요.</p>
              </div>
            </template>

            <!-- 기계 -->
            <template v-else-if="step.key === 'machine'">
              <div v-if="!hasMachines" class="rounded-2xl bg-muted p-5">
                <p class="font-semibold">{{ workshop.machines.length ? '분할상수를 넣은 기계가 없어요' : '등록된 기계가 없어요' }}</p>
                <p class="mt-1 text-sm text-muted">기계를 등록하면 변환기어도 함께 기록할 수 있어요. 지금은 건너뛰어도 돼요.</p>
                <UButton
                  :to="workshop.machines[0] ? `/settings/machines/${workshop.machines[0].id}` : '/settings/machines/new'"
                  :label="workshop.machines.length ? '분할상수 넣으러 가기' : '기계 등록하러 가기'" variant="soft" class="mt-4"
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
                        <span class="text-sm text-muted tabular-nums">분할상수 {{ m.indexConstant }}{{ isPositive(m.differentialConstant) ? ` · 차동상수 ${m.differentialConstant}` : '' }}</span>
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
                        <span class="text-sm font-semibold text-error">분할상수를 넣어야 쓸 수 있어요</span>
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
                  분할상수 {{ machine?.indexConstant }} × {{ gear.hob.starts }}줄 / {{ spec.teeth }}T
                </p>
                <p v-else class="text-right text-xs text-muted tabular-nums">
                  차동상수 {{ machine?.differentialConstant }} × sin {{ formatAngle(spec.helixAngle) }} / ({{ fmt(spec.module) }} × {{ gear.hob.starts }}줄)
                </p>
              </div>

              <div v-if="!(step.key === 'index' && indexCollapsed)">
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
                title="이 기계에 차동상수가 없어요"
                description="헬리컬 기어의 차동 기어를 찾으려면 기계 설정에서 차동상수를 넣어 주세요."
                :actions="[{ label: '기계 설정', to: `/settings/machines/${machine?.id}`, color: 'warning', variant: 'solid' }]"
              />
              <!-- 기본 분할 기어 (기계 설정에 저장한 조합) -->
              <template v-if="step.key === 'index' && defaultIndexCombo">
                <!-- 맞음: 이 조합을 크게 보여주고 이미 골라 둔다 -->
                <div v-if="defaultIndexExact" class="rounded-2xl border-2 p-5" :class="usingDefaultIndex ? 'border-primary bg-primary/5' : 'border-default'">
                  <div class="flex items-center justify-between gap-2">
                    <p class="font-bold">기본 분할 기어</p>
                    <UBadge label="이 잇수에 맞아요" color="success" variant="subtle" />
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-3">
                    <GearComboFraction :combo="defaultIndexCombo" class="text-4xl" />
                    <div class="text-right tabular-nums">
                      <p class="text-xl font-bold text-success">{{ errorPercent(defaultIndexCombo) }}</p>
                      <p class="text-xs text-muted">기어비 {{ defaultIndexCombo.ratio.toFixed(8) }}</p>
                    </div>
                  </div>
                  <p v-if="usingDefaultIndex" class="mt-3 flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <UIcon name="i-lucide-circle-check" class="size-4" />이 조합으로 기록해요
                  </p>
                  <UButton v-else label="기본 조합으로 돌아가기" variant="soft" block class="mt-3" @click="useDefaultIndex" />
                </div>
                <UButton
                  v-if="defaultIndexExact"
                  :label="showOtherIndex ? '다른 조합 접기' : '다른 조합 고르기'"
                  :trailing-icon="showOtherIndex ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  color="neutral" variant="ghost" block @click="showOtherIndex = !showOtherIndex"
                />

                <!-- 안 맞음: 한 줄로 알려주고 목록을 위로 -->
                <div v-else class="flex items-center justify-between gap-3 rounded-xl border border-dashed border-default px-4 py-3">
                  <span class="flex items-center gap-2 text-sm text-muted">
                    기본 <GearComboFraction :combo="defaultIndexCombo" class="text-sm text-toned" />
                  </span>
                  <span class="text-sm font-bold tabular-nums text-warning">오차 {{ errorPercent(defaultIndexCombo) }}</span>
                </div>
              </template>

              <!-- 조합 목록. 다시 찾는 중이면 흐리게 + 로딩 (기본 조합이 맞으면 접어 둠) -->
              <div v-if="!(step.key === 'index' && indexCollapsed)" class="relative min-h-40">
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

          <ul v-if="step.problems?.length" class="mt-6 space-y-1" role="alert">
            <li v-for="msg in step.problems" :key="msg" class="flex items-center gap-1.5 text-sm font-semibold text-error">
              <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />{{ msg }}
            </li>
          </ul>
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
