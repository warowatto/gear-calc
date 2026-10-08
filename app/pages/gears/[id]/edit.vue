<script setup lang="ts">
definePageMeta({ flow: true })

const route = useRoute()
const id = route.params.id as string
const gears = useGearsStore()
const drafts = useDraftsStore()

// 처음 들어올 때(첫 단계) 저장된 기어를 복사해서 고친다. 단계 중간 새로고침이면 고치던 내용을 이어간다
const original = gears.byId(id)
if (original && (drafts.editGear?.id !== id || !route.query.step)) drafts.startEdit(original)

function finish() {
  gears.replace(JSON.parse(JSON.stringify(drafts.editGear)))
  return `/gears/${id}`
}
</script>

<template>
  <GearWizard v-if="original && drafts.editGear" :gear="drafts.editGear" mode="edit" :finish="finish" :cancel="() => `/gears/${id}`" />
  <div v-else class="py-16 text-center">
    <p class="font-semibold">기어를 찾을 수 없어요.</p>
    <UButton to="/" label="목록으로" variant="soft" class="mt-4" />
  </div>
</template>
