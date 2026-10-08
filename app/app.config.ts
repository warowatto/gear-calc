// 토스 느낌: 파란 포인트 색, 회색 바탕 위 흰색 둥근 카드
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
    card: {
      slots: {
        root: 'rounded-2xl overflow-hidden',
        body: 'p-5 sm:p-5',
      },
      variants: {
        variant: {
          outline: {
            root: 'bg-default ring-0 divide-y divide-default',
          },
        },
      },
    },
    button: {
      slots: {
        base: 'rounded-xl',
      },
    },
  },
})
