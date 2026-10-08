<script setup lang="ts">
definePageMeta({ flow: true })

const gears = useGears()
const draft = useGearDraft()
if (!draft.value.gear) draft.value.gear = createGear()

function finish() {
  const gear: GearRecord = JSON.parse(JSON.stringify(draft.value.gear))
  gear.createdAt = gear.updatedAt = Date.now()
  gears.value.list.push(gear)
  return `/gears/${gear.id}`
}
</script>

<template>
  <GearWizard v-if="draft.gear" :gear="draft.gear" mode="new" :finish="finish" :cancel="() => '/'" />
</template>
