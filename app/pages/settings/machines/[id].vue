<script setup lang="ts">
// 기계 등록(/settings/machines/new)·수정. 저장을 눌러야 반영된다
const route = useRoute()
const router = useRouter()
const workshop = useWorkshopStore()
const gears = useGearsStore()

const isNew = route.params.id === 'new'
const original = isNew ? undefined : workshop.machineById(String(route.params.id))
const draft = reactive<Machine>(original ? { ...original } : newMachine())

const nameValid = computed(() => draft.name.trim().length > 0)
const indexValid = computed(() => isPositive(draft.indexConstant))
const diffValid = computed(() => draft.differentialConstant === null || Number.isNaN(draft.differentialConstant) || isPositive(draft.differentialConstant))
const clearanceValid = computed(() => !draft.useClearance || (isNumber(draft.clearance) && draft.clearance >= 0))
// 분할상수는 보통 1보다 크다. 작으면 기어비를 잘못 넣었을 가능성이 있어 알려준다 (저장은 막지 않음)
const indexLooksLikeRatio = computed(() => indexValid.value && draft.indexConstant < 1)
const canSave = computed(() => nameValid.value && indexValid.value && diffValid.value && clearanceValid.value)

function goBack() {
  if (window.history.state?.back) router.back()
  else navigateTo('/settings', { replace: true })
}

const toast = useToast()
function save() {
  if (!canSave.value) return
  const m: Machine = { ...draft, name: draft.name.trim() }
  workshop.saveMachine(m)
  toast.add({ title: isNew ? `'${m.name}'을(를) 등록했어요` : '저장했어요', color: 'success', duration: 2000 })
  goBack()
}

// ── 분할상수를 모를 때: 변환기어 표의 한 줄로 거꾸로 구한다 ──
// 분할상수 = (A/B × C/D) × 잇수 ÷ 호브 줄수
const helperOpen = ref(false)
const sample = reactive({ teeth: NaN, starts: 1, a: NaN, b: NaN, c: NaN, d: NaN })
const sampleConstant = computed(() => {
  const { teeth, starts, a, b, c, d } = sample
  if (![teeth, starts, a, b].every(isPositive)) return null
  const second = isPositive(c) && isPositive(d) ? c / d : 1
  return (a / b) * second * teeth / starts
})
function useSample() {
  if (sampleConstant.value === null) return
  draft.indexConstant = Number(sampleConstant.value.toFixed(6))
  helperOpen.value = false
}

// ── 삭제 ──
const deleteOpen = ref(false)
const usedBy = computed(() => gears.list.filter(g => g.hob.machineId === draft.id).length)
function remove() {
  workshop.removeMachine(draft.id)
  deleteOpen.value = false
  goBack()
}
</script>

<template>
  <div v-if="isNew || original" class="space-y-3 pb-24">
    <Teleport v-if="!isNew" defer to="#header-actions">
      <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" size="xl" aria-label="삭제" @click="deleteOpen = true" />
    </Teleport>

    <UCard>
      <p class="mb-2 text-sm font-semibold text-muted">기계 이름</p>
      <label class="block border-b-2 border-default pb-2 focus-within:border-primary">
        <input
          v-model="draft.name" type="text" autocomplete="off" placeholder="예) Pfauter P400"
          class="w-full bg-transparent text-2xl! font-bold outline-none placeholder:text-dimmed"
          :autofocus="isNew"
        >
      </label>
    </UCard>

    <UCard>
      <p class="mb-2 text-sm font-semibold text-muted">분할상수 <span class="text-error">*</span></p>
      <BigNumberInput v-model="draft.indexConstant" placeholder="예) 24" size="md" />
      <p v-if="indexLooksLikeRatio" class="mt-2 text-sm font-semibold text-warning">
        값이 1보다 작아요. 기어마다 바뀌는 기어비(예: 0.8)를 넣은 건 아닌지 확인해 주세요.
      </p>
      <ul class="mt-3 space-y-1 text-sm text-muted">
        <li>· <b>기계마다 정해진 값</b>이에요. 한 번 넣으면 어떤 기어를 깎든 그대로 써요.</li>
        <li>· 설명서의 분할 체인지기어 식이 <b>i = 24 / Z</b> 라면 <b>24</b>를 넣어요.</li>
        <li>· 깎을 기어마다 달라지는 <b>기어비</b>(예: 0.8)와는 다른 값이에요. 기어비는 앱이 계산해요.</li>
      </ul>
      <p class="mt-3 rounded-xl bg-muted px-4 py-2.5 text-xs text-muted tabular-nums">
        분할 기어비 = 분할상수 × 호브 줄수 ÷ 잇수
      </p>

      <button type="button" class="mt-4 flex w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-left text-sm font-semibold" @click="helperOpen = !helperOpen">
        모르겠어요 · 변환기어 표로 구하기
        <UIcon name="i-lucide-chevron-down" class="size-5 text-muted transition-transform" :class="helperOpen && 'rotate-180'" />
      </button>
      <div v-if="helperOpen" class="mt-3 space-y-4 rounded-xl border border-default p-4">
        <p class="text-xs text-muted">설명서의 변환기어 표나, 실제로 깎아서 맞았던 조합 한 줄을 넣어 주세요.</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="mb-1 text-xs font-semibold text-muted">잇수</p>
            <BigNumberInput v-model="sample.teeth" placeholder="40" suffix="T" size="md" />
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold text-muted">호브 줄수</p>
            <BigNumberInput v-model="sample.starts" placeholder="1" suffix="줄" size="md" />
          </div>
        </div>
        <div>
          <p class="mb-1 text-xs font-semibold text-muted">변환기어 (C·D는 1단이면 비워 두세요)</p>
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2">
            <BigNumberInput v-model="sample.a" placeholder="A" size="md" />
            <span class="row-span-2 text-xl text-muted">×</span>
            <BigNumberInput v-model="sample.c" placeholder="C" size="md" />
            <BigNumberInput v-model="sample.b" placeholder="B" size="md" />
            <BigNumberInput v-model="sample.d" placeholder="D" size="md" />
          </div>
        </div>
        <div class="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
          <span class="text-sm text-muted">분할상수</span>
          <span class="text-xl font-bold tabular-nums">{{ sampleConstant === null ? '—' : Number(sampleConstant.toFixed(6)) }}</span>
        </div>
        <UButton label="이 값 쓰기" block size="lg" :disabled="sampleConstant === null" @click="useSample" />
      </div>
    </UCard>

    <UCard>
      <p class="mb-2 text-sm font-semibold text-muted">차동상수 <span class="font-normal">(헬리컬 기어만)</span></p>
      <BigNumberInput v-model="draft.differentialConstant" placeholder="평기어만 깎으면 비워 두세요" size="md" />
      <ul class="mt-3 space-y-1 text-sm text-muted">
        <li>· 헬리컬 기어의 비틀림각을 만드는 차동 체인지기어를 구할 때만 써요.</li>
        <li>· 이것도 <b>기계마다 정해진 값</b>이에요. 설명서의 차동 체인지기어 식에서 확인하세요.</li>
      </ul>
      <p class="mt-3 rounded-xl bg-muted px-4 py-2.5 text-xs text-muted tabular-nums">
        차동 기어비 = 차동상수 × sin(비틀림각) ÷ (모듈 × 호브 줄수)
      </p>
    </UCard>

    <UCard>
      <p class="mb-4 text-sm font-semibold text-muted">조합 찾기 옵션</p>
      <div class="space-y-4">
        <USwitch v-model="draft.twoStage" size="lg" label="2단 조합 (A/B × C/D)" description="끄면 A/B 한 쌍만 찾아요" />
        <USwitch v-model="draft.useClearance" size="lg" label="간섭 조건 검사" description="A + B ≥ C + 여유, C + D ≥ B + 여유" />
        <div v-if="draft.useClearance">
          <p class="mb-1 text-xs font-semibold text-muted">여유 잇수</p>
          <BigNumberInput v-model="draft.clearance" placeholder="예) 15" suffix="T" size="md" />
        </div>
      </div>
    </UCard>

    <!-- 하단 저장 버튼 (탭바 위) -->
    <div class="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 px-4">
      <div class="mx-auto max-w-3xl">
        <UButton
          :label="isNew ? '등록하기' : '저장하기'" size="xl" block :disabled="!canSave"
          class="pointer-events-auto h-14 rounded-2xl text-lg font-bold shadow-lg"
          @click="save"
        />
      </div>
    </div>

    <UModal
      v-model:open="deleteOpen" :title="`'${original?.name}'을(를) 삭제할까요?`"
      :description="usedBy ? `이 기계로 기록한 기어 ${usedBy}개는 '기계 없음'으로 보여요.` : '삭제하면 되돌릴 수 없어요.'"
    >
      <template #footer>
        <div class="grid w-full grid-cols-2 gap-2">
          <UButton label="취소" color="neutral" variant="soft" size="xl" block @click="deleteOpen = false" />
          <UButton label="삭제" color="error" size="xl" block @click="remove" />
        </div>
      </template>
    </UModal>
  </div>

  <div v-else class="py-16 text-center">
    <p class="font-semibold">기계를 찾을 수 없어요.</p>
    <UButton to="/settings" label="설정으로" variant="soft" class="mt-4" />
  </div>
</template>
