<script setup lang="ts">
definePageMeta({ flow: true })

const gears = useGearsStore()
const drafts = useDraftsStore()
// 이미 등록을 마친 초안(같은 id가 목록에 있음)이 남아 있으면 새로 시작한다
if (!drafts.newGear || gears.byId(drafts.newGear.id)) drafts.startNew(gears.recent[0])

function finish() {
  const gear: GearRecord = JSON.parse(JSON.stringify(drafts.newGear))
  gears.add(gear)
  return `/gears/${gear.id}`
}
</script>

<template>
  <GearWizard v-if="drafts.newGear" :gear="drafts.newGear" mode="new" :finish="finish" :cancel="() => '/'" />
</template>
