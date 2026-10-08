<script setup lang="ts" generic="T extends string | number | null">
// 자주 쓰는 값을 한 번에 고르는 칩
const model = defineModel<T>({ required: true })
withDefaults(defineProps<{ options: { label: string, value: T }[], size?: 'md' | 'sm' }>(), { size: 'md' })
</script>

<template>
  <div class="flex flex-wrap" :class="size === 'sm' ? 'gap-1' : 'gap-2'">
    <button
      v-for="o in options" :key="String(o.value)" type="button"
      class="rounded-full font-semibold tabular-nums transition-colors"
      :class="[
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-4 text-sm',
        model === o.value ? 'bg-primary text-inverted' : 'bg-elevated text-toned active:bg-accented',
      ]"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
