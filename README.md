# 호호가족의 체스게임 ♟️

웹 기반 체스 게임. 표준 체스는 물론 6가지 변형 규칙, AI 대전, 온라인 대전을 지원합니다.

## 기능

### 게임 모드
- **로컬 2인 대전** — 같은 화면에서 두 명이 번갈아 플레이
- **AI 대전** — 초급 / 중급 / 고급 난이도 (Minimax + Alpha-Beta Pruning)
- **온라인 대전** — Firebase Realtime Database 기반 실시간 대전 (QR 코드 / 초대 링크 / 방 코드 공유)

### 변형 규칙
| 규칙 | 설명 |
|------|------|
| 표준 | FIDE 표준 체스 |
| Chess960 | 피셔 랜덤 — 백 기물 초기 배치를 960가지 중 무작위로 설정 |
| Crazyhouse | 잡은 기물을 아군 기물로 보드에 드롭 가능 |
| Fog of War | 내 기물이 이동 가능한 칸만 보임 |
| Atomic Chess | 기물을 잡으면 주변 기물도 폭발해 제거 |
| 킹 2개 | 킹이 2개 — 둘 다 잃어야 패배 |
| Amazon | 퀸+나이트 능력을 가진 커스텀 기물 추가 |

### 부가 기능
- 체스 시계 (블리츠 3·5분 / 래피드 10분 / 클래식 30분 / 무제한)
- 기보 기록 및 리플레이
- 되돌리기 (2인: 1수, AI: 2수)
- 힌트 (게임당 3회)
- FEN 불러오기 / 내보내기
- 튜토리얼 (12단계)
- 전적 기록 (localStorage)
- 다크 / 라이트 테마
- 효과음 On/Off
- 모바일·태블릿 반응형

## 기술 스택

- **React 19 + TypeScript + Vite**
- **Zustand** — 상태 관리
- **Firebase Realtime Database** — 온라인 대전
- **HTML/CSS Grid** — 보드 렌더링 (Canvas/SVG 미사용)
- 체스 로직 자체 구현 (chess.js 미사용 — 변형 규칙 유연성 확보)

## 로컬 실행

```bash
npm install
cp .env.example .env.local  # Firebase 설정 값 입력
npm run dev
```

`.env.local`에 Firebase 프로젝트 설정값을 입력해야 온라인 대전이 활성화됩니다.  
미입력 시 로컬 대전·AI 대전은 정상 작동합니다.

## 환경 변수

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 프로젝트 구조

```
src/
├── ai/          # Minimax 엔진, 난이도 설정
├── core/        # 보드 상태, 이동 검증, 타입 정의
├── firebase/    # Firebase 연동 (config, room CRUD)
├── rules/       # RuleSet 인터페이스 및 각 변형 규칙 구현체
├── tutorial/    # 튜토리얼 단계 정의
├── ui/          # React 컴포넌트
└── utils/       # FEN, 기보 표기법, 힌트, 효과음, 전적
```
