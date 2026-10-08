<script setup lang="ts">
import { backupFileName, buildBackup, mergeBackup, parseBackup, type BackupData } from '~/utils/backup'

const gears = useGearsStore()
const workshop = useWorkshopStore()
const toast = useToast()

const current = (): BackupData => JSON.parse(JSON.stringify({ gears: gears.list, workshop: { gears: workshop.gears, machines: workshop.machines } }))
const summary = (d: BackupData) => `기어 기록 ${d.gears.length}개 · 기계 ${d.workshop.machines.length}대 · 변환기어 ${d.workshop.gears.length}종`
const currentSummary = computed(() => summary({ gears: gears.list, workshop: { gears: workshop.gears, machines: workshop.machines } }))

// ── 내보내기 ──
function backupBlob() {
  return new Blob([JSON.stringify(buildBackup(current()), null, 2)], { type: 'application/json' })
}

function download() {
  const url = URL.createObjectURL(backupBlob())
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName()
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 폰에서는 카톡·메일 등 다른 앱으로 바로 보낼 수 있다 (지원하는 브라우저만)
const canShare = ref(false)
onMounted(() => {
  try {
    const probe = new File(['{}'], 'probe.json', { type: 'application/json' })
    canShare.value = !!navigator.canShare?.({ files: [probe] })
  }
  catch {}
})
async function share() {
  const file = new File([backupBlob()], backupFileName(), { type: 'application/json' })
  try {
    await navigator.share({ files: [file], title: '기어 계산기 백업' })
  }
  catch (e) {
    // 사용자가 공유 창을 닫은 경우는 조용히 넘긴다
    if ((e as Error).name !== 'AbortError') toast.add({ title: '보내지 못했어요. 파일로 내보내기를 써 주세요.', color: 'error' })
  }
}

// ── 올리기 ──
const fileInput = ref<HTMLInputElement>()
const picked = ref<(ReturnType<typeof parseBackup> & { fileName: string }) | null>(null)
const error = ref('')

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 같은 파일을 다시 골라도 동작하게
  if (!file) return
  error.value = ''
  picked.value = null
  try {
    picked.value = { ...parseBackup(await file.text()), fileName: file.name }
  }
  catch (err) {
    error.value = (err as Error).message
  }
}

function apply(data: BackupData) {
  gears.setAll(data.gears)
  workshop.setAll(data.workshop)
  picked.value = null
}

function mergeIn() {
  if (!picked.value) return
  const r = mergeBackup(current(), picked.value)
  apply(r)
  toast.add({ title: `합쳤어요 · 새 기어 ${r.added}개, 갱신 ${r.updated}개`, color: 'success' })
}

const overwriteOpen = ref(false)
function overwrite() {
  if (!picked.value) return
  apply({ gears: picked.value.gears, workshop: picked.value.workshop })
  overwriteOpen.value = false
  toast.add({ title: '백업 파일 내용으로 바꿨어요', color: 'success' })
}
</script>

<template>
  <div class="space-y-3">
    <!-- 내보내기 -->
    <UCard>
      <p class="text-lg font-bold">내보내기</p>
      <p class="mt-1 text-sm text-muted">기어 기록과 설정(기계, 보유 변환기어)을 파일 하나로 저장해요.</p>
      <p class="mt-3 rounded-xl bg-muted px-4 py-3 text-sm font-semibold tabular-nums">{{ currentSummary }}</p>
      <div class="mt-4 space-y-2">
        <UButton label="파일로 내보내기" icon="i-lucide-download" size="xl" block @click="download" />
        <UButton v-if="canShare" label="다른 앱으로 보내기" icon="i-lucide-share" color="neutral" variant="soft" size="xl" block @click="share" />
      </div>
    </UCard>

    <!-- 올리기 -->
    <UCard>
      <p class="text-lg font-bold">백업 파일 올리기</p>
      <p class="mt-1 text-sm text-muted">내보낸 파일을 올려서 다른 폰으로 옮기거나 되살려요.</p>

      <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onPick">
      <UButton
        v-if="!picked" label="파일 고르기" icon="i-lucide-upload" color="neutral" variant="soft" size="xl" block class="mt-4"
        @click="fileInput?.click()"
      />

      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" class="mt-3" />

      <div v-if="picked" class="mt-4 space-y-3">
        <div class="rounded-xl bg-muted px-4 py-3">
          <p class="truncate font-semibold">{{ picked.fileName }}</p>
          <p v-if="picked.exportedAt" class="text-xs text-muted">{{ formatDate(Date.parse(picked.exportedAt)) }}에 내보낸 파일</p>
          <p class="mt-2 text-sm font-semibold tabular-nums">{{ summary(picked) }}</p>
          <p v-if="picked.skipped" class="mt-1 text-xs text-warning">깨진 항목 {{ picked.skipped }}개는 빼고 읽었어요.</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <UButton label="합치기" size="xl" block @click="mergeIn" />
          <UButton label="덮어쓰기" color="error" variant="soft" size="xl" block @click="overwriteOpen = true" />
        </div>
        <p class="text-xs text-muted">
          <b>합치기</b>: 지금 기록은 두고 없던 기어·기계·변환기어만 더해요. 같은 기어는 더 최근에 고친 쪽을 남겨요.<br>
          <b>덮어쓰기</b>: 지금 기록을 지우고 파일 내용으로 바꿔요.
        </p>
        <UButton label="취소" color="neutral" variant="link" class="px-0" @click="picked = null" />
      </div>
    </UCard>

    <UModal v-model:open="overwriteOpen" title="지금 기록을 덮어쓸까요?" :description="`지금 있는 ${currentSummary}이(가) 지워지고 파일 내용으로 바뀌어요.`">
      <template #footer>
        <div class="grid w-full grid-cols-2 gap-2">
          <UButton label="취소" color="neutral" variant="soft" size="xl" block @click="overwriteOpen = false" />
          <UButton label="덮어쓰기" color="error" size="xl" block @click="overwrite" />
        </div>
      </template>
    </UModal>
  </div>
</template>
