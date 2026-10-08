# 기어 계산기

걸치기 잇수·치수와 호빙머신 분할·차동 변환기어를 계산하고 기록하는 모바일용 웹앱 (Nuxt 4, CSR, PWA).

## 개발

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # 계산 로직 테스트
pnpm typecheck
```

## 배포 (GitHub Pages)

`main` 브랜치에 push 하면 `.github/workflows/deploy.yml` 이 테스트 → 정적 빌드 → GitHub Pages 배포를 한다.

처음 한 번만:

1. GitHub에 저장소를 만들고 이 프로젝트를 `main` 브랜치로 push
2. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꾸기
3. **Actions** 탭에서 `Deploy to GitHub Pages` 가 끝나면 `https://<아이디>.github.io/<저장소>/` 에서 열린다

- 저장소 이름이 `<아이디>.github.io` 면 루트(`/`)에, 그 밖에는 `/<저장소>/` 아래에 배포되도록 빌드 경로(`NUXT_APP_BASE_URL`)를 자동으로 맞춘다.
- 로컬에서 같은 형태로 빌드해 보려면: `NUXT_APP_BASE_URL=/gear-calc/ pnpm generate` → `.output/public`
- 커스텀 도메인을 쓰면 루트에서 열리므로 워크플로의 `Set base URL` 단계에서 `/` 로 고정한다.

## 데이터

기록과 설정은 각 기기의 브라우저(localStorage)에만 저장된다. 기기를 옮길 때는 **설정 → 백업 · 복원** 에서 파일로 내보내고 올린다.
