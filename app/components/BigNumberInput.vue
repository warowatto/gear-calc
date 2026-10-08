<script setup lang="ts">
// 토스식 큰 숫자 입력칸. 입력 중인 글자("2.")를 그대로 두고 숫자로 읽힐 때만 값을 반영한다.
// 비어 있으면 NaN (제원 필드가 number 이므로 null 대신 NaN을 쓴다)
//
// 음수: 아이폰 소수점 키패드에는 − 키가 없고 안드로이드도 키보드마다 달라서,
// 숫자 앞의 [+/−] 버튼으로 부호를 정한다. 숫자를 넣기 전에 눌러도 되고, − 키가 있는 키보드면 쳐도 된다
const model = defineModel<number>({ required: true })
const props = withDefaults(defineProps<{
  placeholder?: string
  suffix?: string
  /** 음수 입력 허용 → 부호 버튼을 보여준다 */
  allowNegative?: boolean
  autofocus?: boolean
  size?: 'lg' | 'md'
  /** 보여줄 때 소수 자리 제한 (예: 25.833333333333332 → 25.833333). 저장 값은 그대로 */
  digits?: number
  /** 비우면 0 (전위계수·공차·분·초처럼 0이 정상 값인 칸). 아니면 비우면 NaN = 아직 안 넣음 */
  zeroWhenEmpty?: boolean
}>(), { size: 'lg' })

const isEmpty = (v: number) => v === null || Number.isNaN(v)
/**
 * 칸에는 부호 없이 숫자만 보여준다 (부호는 버튼이 맡음).
 * 0은 비워 두고 흐린 placeholder 로 보여준다 → 숫자를 치면 0 뒤에 붙지 않고 바로 그 값이 된다
 */
const toText = (v: number) => {
  if (isEmpty(v) || v === 0) return ''
  const abs = props.allowNegative ? Math.abs(v) : v
  return props.digits === undefined ? String(abs) : String(Number(abs.toFixed(props.digits)))
}

const negative = ref(props.allowNegative && !isEmpty(model.value) && model.value < 0)
const text = ref(toText(model.value))
const focused = ref(false)
const el = ref<HTMLInputElement>()

/** 칸의 숫자와 부호로 값을 정한다 */
function commit() {
  if (text.value === '') model.value = props.zeroWhenEmpty ? 0 : NaN
  else model.value = (negative.value ? -1 : 1) * Number(text.value)
}

// 값이 밖에서 바뀌면(칩, 다른 칸과 연동) 칸과 부호를 맞춘다
watch(model, (v) => {
  if (focused.value) return
  if (props.allowNegative && !isEmpty(v) && v !== 0) negative.value = v < 0
  text.value = toText(v)
})

function onInput(e: Event) {
  const input = e.target as HTMLInputElement
  let raw = input.value
  // − 키가 있는 키보드에서 친 − 는 부호 전환으로 처리
  if (props.allowNegative && /[-−]/.test(raw)) negative.value = !negative.value
  raw = raw.replace(/[^\d.]/g, '')
  // 소수점은 하나만
  const dot = raw.indexOf('.')
  if (dot >= 0) raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '')
  text.value = raw
  input.value = raw
  commit()
}

function toggleSign() {
  negative.value = !negative.value
  commit()
}

onMounted(() => {
  if (props.autofocus) el.value?.focus()
})
</script>

<template>
  <!-- 높이를 고정해서 부호 버튼이 있는 칸과 없는 칸의 밑줄이 나란히 맞게 -->
  <div
    class="flex items-center gap-2 border-b-2 pb-2 transition-colors"
    :class="[size === 'lg' ? 'h-13' : 'h-11', focused ? 'border-primary' : 'border-default']"
  >
    <button
      v-if="allowNegative" type="button"
      class="flex shrink-0 items-center justify-center rounded-lg font-bold transition-colors"
      :class="[
        size === 'lg' ? 'size-11 text-2xl' : 'size-9 text-xl',
        negative ? 'bg-error/10 text-error' : 'bg-elevated text-muted',
      ]"
      :aria-label="negative ? '음수 (눌러서 양수로)' : '양수 (눌러서 음수로)'"
      @mousedown.prevent
      @click="toggleSign"
    >
      {{ negative ? '−' : '+' }}
    </button>
    <input
      ref="el"
      :value="text"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="placeholder"
      class="w-full min-w-0 bg-transparent font-bold tabular-nums outline-none placeholder:text-dimmed"
      :class="[size === 'lg' ? 'text-3xl!' : 'text-xl!', negative && 'text-error']"
      @input="onInput"
      @focus="focused = true"
      @blur="focused = false; text = toText(model)"
    >
    <span v-if="suffix" class="shrink-0 font-semibold text-muted" :class="size === 'lg' ? 'text-xl' : 'text-base'">{{ suffix }}</span>
  </div>
</template>
