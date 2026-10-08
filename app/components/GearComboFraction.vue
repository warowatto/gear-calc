<script setup lang="ts">
import type { GearCombo } from '~/utils/changeGears'

defineProps<{ combo: GearCombo }>()
</script>

<template>
  <span class="inline-flex items-center gap-2 font-bold tabular-nums">
    <span class="inline-flex flex-col items-center leading-tight">
      <span>{{ combo.a }}</span>
      <span class="w-full border-t border-current" />
      <span>{{ combo.b }}</span>
    </span>
    <template v-if="combo.c !== undefined">
      <span class="text-muted">×</span>
      <span class="inline-flex flex-col items-center leading-tight">
        <span>{{ combo.c }}</span>
        <span class="w-full border-t border-current" />
        <span>{{ combo.d }}</span>
      </span>
    </template>
  </span>
</template>
