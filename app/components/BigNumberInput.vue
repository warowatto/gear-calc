<script setup lang="ts">
// 토스식 큰 숫자 입력칸. 입력 중인 글자("2.")를 그대로 두고 숫자로 읽힐 때만 값을 반영한다.
// 비어 있으면 NaN (제원 필드가 number 이므로 null 대신 NaN을 쓴다)
const model = defineModel<number>({ required: true })
const props = withDefaults(defineProps<{
  placeholder?: string
  suffix?: string
  /** 음수 입력 허용. 숫자 키패드에 '-'가 없는 폰이 있어 ± 버튼을 따로 둔다 */
  allowNegative?: boolean
  autofocus?: boolean
  size?: 'lg' | 'md'
  /** 보여줄 때 소수 자리 제한 (예: 25.833333333333332 → 25.833333). 저장 값은 그대로 */
  digits?: number
}>(), { size: 'lg' })

const toText = (v: number) => {
  if (v === null || Number.isNaN(v)) return ''
  return props.digits === undefined ? String(v) : String(Number(v.toFixed(props.digits)))
}
const text = ref(toText(model.value))
const focused = ref(false)
const el = ref<HTMLInputElement>()

watch(model, (v) => {
  if (!focused.value) text.value = toText(v)
})

function onInput(e: Event) {
  const input = e.target as HTMLInputElement
  let raw = input.value.replace(/[^\d.\-]/g, '')
  if (!props.allowNegative) raw = raw.replace(/-/g, '')
  text.value = raw
  input.value = raw
  const n = Number(raw)
  model.value = raw === '' || raw === '-' ? NaN : n
}

function flipSign() {
  if (!isNumber(model.value) || model.value === 0) return
  model.value = -model.value
  text.value = toText(model.value)
}

onMounted(() => {
  if (props.autofocus) el.value?.focus()
})
</script>

<template>
  <div class="flex items-center gap-2 border-b-2 pb-2 transition-colors" :class="focused ? 'border-primary' : 'border-default'">
    <input
      ref="el"
      :value="text"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="placeholder"
      class="w-full min-w-0 bg-transparent font-bold tabular-nums outline-none placeholder:text-dimmed"
      :class="[size === 'lg' ? 'text-3xl!' : 'text-xl!', text.startsWith('-') && 'text-error']"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false; text = toText(model)"
    >
    <span v-if="suffix" class="shrink-0 font-semibold text-muted" :class="size === 'lg' ? 'text-xl' : 'text-base'">{{ suffix }}</span>
    <button
      v-if="allowNegative" type="button"
      class="shrink-0 rounded-lg bg-elevated px-2.5 py-1 text-sm font-bold text-toned active:bg-accented"
      aria-label="부호 바꾸기"
      @mousedown.prevent
      @click="flipSign"
    >
      ±
    </button>
  </div>
</template>
