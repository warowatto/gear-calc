<script setup lang="ts" generic="T extends string | number | boolean">
// 두세 개 중 하나를 고르는 작은 스위치 (켜진 쪽이 하얗게 떠 보인다)
const model = defineModel<T>({ required: true })
defineProps<{ options: { label: string, value: T }[] }>()
</script>

<template>
  <div class="inline-flex rounded-full bg-elevated p-0.5" role="radiogroup">
    <button
      v-for="o in options" :key="String(o.value)" type="button" role="radio"
      :aria-checked="model === o.value"
      class="rounded-full px-3 py-1 text-xs font-bold transition-colors"
      :class="model === o.value ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
