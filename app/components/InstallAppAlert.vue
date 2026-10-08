<script setup lang="ts">
// 설치하지 않고 브라우저로 열었을 때만 보이는 설치 안내
const { installed, mode, iosBrowser, install } = useInstallApp()
</script>

<template>
  <UAlert
    v-if="!installed"
    color="primary" variant="subtle" icon="i-lucide-smartphone"
    title="홈 화면에 설치하고 앱처럼 쓰세요"
    :ui="{ title: 'font-bold', description: 'mt-1' }"
    class="rounded-2xl"
    :actions="mode === 'prompt' ? [{ label: '설치하기', icon: 'i-lucide-download', color: 'primary', variant: 'solid', size: 'lg', onClick: install }] : undefined"
  >
    <template #description>
      <p>주소창 없이 바로 열리고, 인터넷이 없어도 계산할 수 있어요.</p>
      <p v-if="mode === 'ios'" class="mt-2 font-semibold">
        <template v-if="iosBrowser === 'safari'">
          아래쪽 <UIcon name="i-lucide-share" class="inline-block size-4 align-text-bottom" /> 공유 버튼 → <b>홈 화면에 추가</b>를 누르세요.
        </template>
        <template v-else>
          주소창 옆 <UIcon name="i-lucide-share" class="inline-block size-4 align-text-bottom" /> 공유 버튼 → <b>홈 화면에 추가</b>를 누르세요.
        </template>
      </p>
      <p v-else-if="mode === 'manual'" class="mt-2 font-semibold">
        브라우저 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요.
      </p>
    </template>
  </UAlert>
</template>
