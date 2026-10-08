<script setup lang="ts">
// 허용 구간. 기본은 최대/최소 두 줄로 크게, inline이면 "최소 ~ 최대" 한 줄
withDefaults(defineProps<{ min: number, max: number, size?: 'md' | 'lg', inline?: boolean }>(), { size: 'md' })
</script>

<template>
  <!-- 한 줄: 1000mm 미만 값(999.9999 ~ 999.9999)까지 폰 폭에 들어가도록 라벨은 위로 -->
  <div v-if="inline">
    <p class="text-xs text-muted">허용 구간 (mm)</p>
    <p class="mt-0.5 text-center text-2xl font-bold whitespace-nowrap tabular-nums text-highlighted">
      {{ fmt(min) }}<span class="mx-1.5 text-muted">~</span>{{ fmt(max) }}
    </p>
  </div>

  <div v-else class="flex items-start justify-between gap-4">
    <span class="pt-1 text-sm font-semibold text-muted">허용 구간</span>
    <dl class="space-y-0.5 text-right tabular-nums">
      <div class="flex items-baseline justify-end gap-3">
        <dt class="text-xs text-muted">최대</dt>
        <dd class="font-bold text-highlighted" :class="size === 'lg' ? 'text-3xl' : 'text-2xl'">
          {{ fmt(max) }}<span class="ml-1 text-sm font-semibold text-muted">mm</span>
        </dd>
      </div>
      <div class="flex items-baseline justify-end gap-3">
        <dt class="text-xs text-muted">최소</dt>
        <dd class="font-bold text-highlighted" :class="size === 'lg' ? 'text-3xl' : 'text-2xl'">
          {{ fmt(min) }}<span class="ml-1 text-sm font-semibold text-muted">mm</span>
        </dd>
      </div>
    </dl>
  </div>
</template>
