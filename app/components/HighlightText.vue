<script setup lang="ts">
// 검색어에 맞는 부분을 강조해서 보여준다
const props = defineProps<{ text: string, tokens?: string[] }>()
const segments = computed(() =>
  props.tokens?.length ? highlightSegments(props.text, props.tokens) : [{ text: props.text, hit: false }])
</script>

<template>
  <span><template v-for="(s, i) in segments" :key="i"><mark v-if="s.hit" class="rounded-sm bg-primary/20 text-inherit">{{ s.text }}</mark><template v-else>{{ s.text }}</template></template></span>
</template>
