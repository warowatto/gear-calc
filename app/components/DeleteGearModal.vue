<script setup lang="ts">
// 기어 삭제 확인창 (상세 화면, 목록 카드에서 함께 쓴다)
const open = defineModel<boolean>('open', { required: true })
defineProps<{ name?: string }>()
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="name ? `'${name}'을(를) 삭제할까요?` : '이 기어를 삭제할까요?'"
    description="삭제하면 되돌릴 수 없어요."
  >
    <template #footer>
      <div class="grid w-full grid-cols-2 gap-2">
        <UButton label="취소" color="neutral" variant="soft" size="xl" block @click="open = false" />
        <UButton label="삭제" color="error" size="xl" block @click="emit('confirm'); open = false" />
      </div>
    </template>
  </UModal>
</template>
