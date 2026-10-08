<script setup lang="ts">
definePageMeta({ flow: true })

const gears = useGearsStore()
const drafts = useDraftsStore()
if (!drafts.newGear) drafts.startNew(gears.recent[0])

function finish() {
  const gear: GearRecord = JSON.parse(JSON.stringify(drafts.newGear))
  gears.add(gear)
  return `/gears/${gear.id}`
}
</script>

<template>
  <GearWizard v-if="drafts.newGear" :gear="drafts.newGear" mode="new" :finish="finish" :cancel="() => '/'" />
</template>
