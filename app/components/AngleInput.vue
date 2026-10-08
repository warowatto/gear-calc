<script setup lang="ts">
// 각도 입력: 소수 도(18.5°) ↔ 도·분·초(18° 30′ 0″) 전환. 값은 항상 소수 도로 저장.
// 고른 입력 방식은 prefKey 별로 기억한다 (압력각·비틀림각 따로)
const model = defineModel<number>({ required: true })
const props = defineProps<{
  label: string
  prefKey: string
  placeholder?: string
  /** 자주 쓰는 값 칩 */
  options?: { label: string, value: number }[]
}>()

const prefs = usePrefsStore()
const dms = computed({
  get: () => !!prefs.angleDms[props.prefKey],
  set: v => prefs.setAngleDms(props.prefKey, v),
})

const parts = reactive(toDmsParts(model.value))
const partsValid = computed(() =>
  (Number.isNaN(parts.m) || (parts.m >= 0 && parts.m < 60))
  && (Number.isNaN(parts.s) || (parts.s >= 0 && parts.s < 60)))

// 한쪽을 맞추는 중에 다른 쪽 감시가 값을 다시 덮어쓰지 않게 막는다
// (소수 18.123456789를 넣었는데 초 반올림 값으로 바뀌는 것 방지)
let syncing = false

watch(model, (v) => {
  if (syncing) return
  // 분·초가 60 이상이라 값이 비었을 때는 입력 중인 칸을 지우지 않는다
  if (Number.isNaN(v) && !partsValid.value) return
  const now = fromDms(parts.d, parts.m, parts.s)
  if (Number.isNaN(v) ? Number.isNaN(now) : Math.abs(now - v) < 1e-9) return
  syncing = true
  Object.assign(parts, toDmsParts(v))
  syncing = false
}, { flush: 'sync' })

watch(() => [parts.d, parts.m, parts.s], () => {
  if (syncing) return
  syncing = true
  model.value = partsValid.value ? fromDms(parts.d, parts.m, parts.s) : NaN
  syncing = false
}, { flush: 'sync' })
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between">
      <p class="text-sm font-semibold text-muted">{{ label }}</p>
      <button type="button" class="text-xs font-semibold text-primary" @click="dms = !dms">
        {{ dms ? '소수로 입력' : '도분초로 입력' }}
      </button>
    </div>

    <BigNumberInput v-if="!dms" v-model="model" :placeholder="placeholder ?? '0'" suffix="°" size="md" :digits="6" />
    <div v-else class="grid grid-cols-3 gap-3">
      <BigNumberInput v-model="parts.d" :placeholder="placeholder ?? '0'" suffix="°" size="md" />
      <BigNumberInput v-model="parts.m" placeholder="0" suffix="′" size="md" />
      <BigNumberInput v-model="parts.s" placeholder="0" suffix="″" size="md" />
    </div>

    <div class="mt-2 flex min-h-8 items-center justify-between gap-2">
      <ChoiceChips v-if="options?.length" v-model="model" :options="options" size="sm" />
      <span v-else />
      <p v-if="dms && !partsValid" class="text-xs text-error">분·초는 60 미만</p>
      <!-- 다른 표기로 바꾼 값 -->
      <p v-else-if="model > 0" class="text-xs text-muted tabular-nums">
        {{ dms ? `= ${Number(model.toFixed(6))}°` : `= ${toDms(model)}` }}
      </p>
    </div>
  </div>
</template>
