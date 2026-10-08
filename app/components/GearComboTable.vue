<script setup lang="ts">
import { isExact, sameCombo, type GearCombo } from '~/utils/changeGears'

const props = defineProps<{
  combos: GearCombo[]
  /** 추가 정보 제목 (예: 가공 비틀림각) */
  extraLabel?: string
  extra?: (combo: GearCombo) => string
}>()

/** 고른 조합. 다시 누르면 선택 해제 */
const selected = defineModel<GearCombo | null>('selected', { default: null })

const isSelected = (c: GearCombo) => !!selected.value && sameCombo(selected.value, c)
const toggle = (c: GearCombo) => {
  selected.value = isSelected(c) ? null : { ...c }
}

const expanded = ref(false)
// 고른 조합은 접혀 있어도 항상 보이게 한다
const visible = computed(() => {
  if (expanded.value) return props.combos
  const head = props.combos.slice(0, 5)
  const sel = props.combos.find(isSelected)
  return sel && !head.includes(sel) ? [...head, sel] : head
})
</script>

<template>
  <ul class="space-y-1">
    <li v-for="(c, i) in visible" :key="i">
      <button
        type="button"
        class="w-full rounded-xl border px-3 py-3 text-left transition-colors"
        :class="isSelected(c) ? 'border-primary bg-primary/10' : 'border-transparent active:bg-elevated'"
        @click="toggle(c)"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-2">
            <UIcon
              :name="isSelected(c) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
              class="size-5 shrink-0" :class="isSelected(c) ? 'text-primary' : 'text-dimmed'"
            />
            <GearComboFraction :combo="c" class="text-lg" />
          </span>
          <div class="text-right tabular-nums">
            <div class="flex items-center justify-end gap-2">
              <span class="text-lg font-bold" :class="isExact(c) ? 'text-success' : 'text-highlighted'">
                {{ errorPercent(c) }}
              </span>
              <UBadge v-if="isExact(c)" color="success" variant="subtle" size="lg" label="정확" />
            </div>
            <p class="text-xs text-muted">기어비 {{ c.ratio.toFixed(8) }}</p>
          </div>
        </div>
        <p v-if="extraLabel && extra" class="mt-1 pl-7 text-xs text-muted tabular-nums">
          {{ extraLabel }} {{ extra(c) }}
        </p>
      </button>
    </li>
  </ul>
  <UButton
    v-if="combos.length > 5"
    :label="expanded ? '접기' : `${combos.length - 5}개 더 보기`"
    color="neutral" variant="soft" block class="mt-3"
    @click="expanded = !expanded"
  />
  <p class="mt-3 text-xs text-muted">위 = 구동(A, C), 아래 = 피동(B, D) · 사용할 조합을 눌러 기록하세요.</p>
</template>
