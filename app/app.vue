<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const gears = useGears()

const tabs = [
  { label: '기어', to: '/', icon: 'i-lucide-cog', match: (p: string) => p === '/' || p.startsWith('/gears/') },
  { label: '설정', to: '/settings', icon: 'i-lucide-settings-2', match: (p: string) => p.startsWith('/settings') },
]
// 등록·수정 단계 화면은 자체 상단바/하단버튼을 쓰므로 공통 틀을 숨긴다
const isFlow = computed(() => !!route.meta.flow)
// GitHub Pages는 /settings/gears 를 /settings/gears/ 로 옮기므로 끝의 / 를 떼고 비교한다
const path = computed(() => route.path.replace(/(.)\/+$/, '$1'))
const isDetail = computed(() => path.value.startsWith('/gears/'))
// 탭 첫 화면이 아니면 뒤로가기 버튼
const subTitles: Record<string, string> = { '/settings/gears': '보유 변환기어', '/settings/backup': '백업 · 복원' }
const showBack = computed(() => isDetail.value || path.value in subTitles)
// 상세 화면은 주소의 기어 제원(M10 · 30T)을 제목으로, 나머지는 탭 이름
const title = computed(() => {
  if (isDetail.value) {
    const gear = gears.value.list.find(g => g.id === route.params.id)
    return gear ? specTitle(gear.spec) : ''
  }
  return subTitles[path.value] ?? tabs.find(t => t.match(path.value))?.label ?? '기어 계산기'
})

function back() {
  if (window.history.state?.back) router.back()
  else navigateTo(path.value.startsWith('/settings') ? '/settings' : '/')
}
</script>

<template>
  <UApp>
    <NuxtPage v-if="isFlow" />

    <template v-else>
      <header class="sticky top-0 z-10 bg-[#f2f4f6]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div class="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
          <UButton v-if="showBack" icon="i-lucide-chevron-left" color="neutral" variant="ghost" size="xl" aria-label="뒤로" @click="back" />
          <h1 class="min-w-0 flex-1 truncate px-2 text-xl font-bold tabular-nums">{{ title }}</h1>
          <!-- 페이지가 오른쪽 버튼(메뉴 등)을 Teleport로 넣는 자리 -->
          <div id="header-actions" class="flex shrink-0 items-center" />
        </div>
      </header>

      <main class="mx-auto max-w-3xl px-4 pt-2 pb-[calc(10rem+env(safe-area-inset-bottom))]">
        <NuxtPage />
      </main>

      <nav class="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl bg-default pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
        <div class="mx-auto flex max-w-3xl">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            class="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium"
            :class="tab.match(path) ? 'text-highlighted' : 'text-dimmed'"
          >
            <UIcon :name="tab.icon" class="size-6" />
            {{ tab.label }}
          </NuxtLink>
        </div>
      </nav>
    </template>
  </UApp>
</template>
