<script setup lang="ts">
// 인앱브라우저 안내: 기본 브라우저로 열기 / 링크 복사 / 그래도 여기서 쓰기
definePageMeta({ flow: true })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const target = typeof route.query.to === 'string' && route.query.to.startsWith('/') ? route.query.to : '/'
// 기본 브라우저에서 열 주소 (배포 경로 /gear-calc/ 포함)
const fullUrl = new URL(router.resolve(target).href, window.location.origin).href
const info = detectBrowser(navigator.userAgent)
const appName = info.inApp ? IN_APP_LABEL[info.inApp] : '앱'
const openUrl = externalOpenUrl(fullUrl, info)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(fullUrl)
  }
  catch {
    // 인앱브라우저는 clipboard API를 막기도 해서 옛 방식으로 한 번 더
    const el = document.createElement('textarea')
    el.value = fullUrl
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    el.remove()
  }
  toast.add({ title: `복사했어요. ${info.os === 'ios' ? 'Safari' : '크롬'} 주소창에 붙여넣어 열어 주세요.`, color: 'success' })
}

function stayHere() {
  try {
    sessionStorage.setItem(STAY_IN_APP_KEY, '1')
  }
  catch {}
  navigateTo(target, { replace: true })
}

// 아이폰에서 버튼으로 열 수 없는 앱: 메뉴 위치 안내
const iosGuide = computed(() => {
  if (info.inApp === 'instagram' || info.inApp === 'facebook') return '오른쪽 위 ⋯ 메뉴 → 외부 브라우저에서 열기'
  if (info.inApp === 'naver') return '아래쪽 ⋯ 메뉴 → 다른 브라우저로 열기'
  return '화면의 ⋯(더보기) 또는 공유 메뉴 → Safari로 열기'
})
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-default px-6 pt-[calc(env(safe-area-inset-top)+4rem)] pb-[max(24px,env(safe-area-inset-bottom))]">
    <div class="mx-auto w-full max-w-md flex-1">
      <span class="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UIcon name="i-lucide-globe" class="size-9" />
      </span>
      <h1 class="mt-6 text-[26px] leading-snug font-bold">
        {{ info.os === 'ios' ? 'Safari' : '기본 브라우저' }}에서<br>열어 주세요
      </h1>
      <p class="mt-3 text-muted">
        지금은 {{ appName }} 안의 브라우저로 열려 있어요. 여기서는 앱을 설치할 수 없고, 기록도 이 창에만 따로 저장돼요.
      </p>

      <ul class="mt-8 space-y-3">
        <li class="flex items-center gap-3">
          <UIcon name="i-lucide-smartphone" class="size-5 shrink-0 text-primary" />
          <span>홈 화면에 설치해서 앱처럼 쓸 수 있어요</span>
        </li>
        <li class="flex items-center gap-3">
          <UIcon name="i-lucide-wifi-off" class="size-5 shrink-0 text-primary" />
          <span>인터넷이 없어도 계산할 수 있어요</span>
        </li>
        <li class="flex items-center gap-3">
          <UIcon name="i-lucide-shield-check" class="size-5 shrink-0 text-primary" />
          <span>기어 기록이 한곳에 안전하게 쌓여요</span>
        </li>
      </ul>

      <!-- 아이폰에서 버튼으로 못 여는 앱은 메뉴 안내 -->
      <div v-if="!openUrl" class="mt-8 rounded-2xl bg-muted p-5">
        <p class="text-sm text-muted">이렇게 열어 주세요</p>
        <p class="mt-1 font-bold">{{ iosGuide }}</p>
        <p class="mt-2 text-sm text-muted">메뉴가 없으면 아래 링크 복사 후 Safari 주소창에 붙여넣으세요.</p>
      </div>
    </div>

    <div class="mx-auto w-full max-w-md space-y-2 pt-6">
      <UButton
        v-if="openUrl"
        :label="`${info.os === 'ios' ? 'Safari' : '기본 브라우저'}로 열기`" icon="i-lucide-external-link"
        :to="openUrl" external
        size="xl" block class="h-14 rounded-2xl text-lg font-bold"
      />
      <UButton
        label="링크 복사" icon="i-lucide-copy" :color="openUrl ? 'neutral' : 'primary'" :variant="openUrl ? 'soft' : 'solid'"
        size="xl" block class="h-14 rounded-2xl text-lg font-bold" @click="copyLink"
      />
      <UButton label="그래도 여기서 쓸게요" color="neutral" variant="link" block class="text-muted" @click="stayHere" />
    </div>
  </div>
</template>
