# 구현 현황 — 호호가족의 체스게임

> **이 문서의 역할**: 무엇을 어떻게 구현했는지 추적합니다. 기술 결정, 파일 경로, 완료 체크박스를 관리합니다.
> 기능의 범위와 우선순위는 `wonho-sample/docs/requirements.md`(기획서)에서 정의합니다.
>
> **업데이트 규칙**: 새 기능 구현 또는 요구사항 변경 시 코드 작업과 함께 즉시 업데이트한다.

---

## Phase 1: 표준 체스 ✅

- [x] 보드 렌더링 (8×8 그리드, 좌표 레이블)
- [x] 기물 표시 (→ Phase UI-1에서 Lichess SVG로 교체)
- [x] 드래그 앤 드롭 이동 (`pointermove` / `pointerup` document 레벨 핸들러)
- [x] 클릭 이동 (기물 클릭 → 목적지 클릭, `pointerDownSquareRef`로 더블 토글 방지)
- [x] 합법 이동 표시 (점·링 오버레이 — `Square.tsx`)
- [x] 특수 이동: 캐슬링, 앙파상, 프로모션 (`MoveValidator.ts`)
- [x] 체크 / 체크메이트 / 스테일메이트 판정
- [x] 무승부: 50수 규칙, 3회 반복 포지션 (`posHistoryRef` Map으로 직렬화 추적)
- [x] 잡은 기물 스코어 표시 (`PlayerPanel.tsx`)
  - [x] 잡은 기물 상세 팝업 (`CapturedModal.tsx`, ESC/오버레이 닫기)
- [x] 효과음 (Web Audio API — `src/utils/sounds.ts`)
  - 이동, 캡처, 캐슬링, 체크, 프로모션, 게임 종료
  - [x] 효과음 On/Off 토글 (`sounds.setMuted()`, `localStorage` 영속화)
- [x] 턴 식별 효과 (패널 펄싱 애니메이션, 체크 뱃지, 보드 테두리 글로우)
- [x] 튜토리얼 모드 (`TutorialScreen.tsx` — 12단계, 진행률 바, 주목 칸 강조)

---

## Phase 2: RuleSet 추상화 ✅

- [x] `RuleSet` 인터페이스 정의 (`src/rules/RuleSet.ts`)
  - 메서드: `name`, `description`, `createInitialBoard`, `createInitialContext`, `getLegalMoves`, `applyMove`, `getGameStatus`, `getAutoPromotion`
  - 선택 메서드: `getVisibleSquares?`, `applyDrop?`, `getDropTargets?`
- [x] `StandardRules` 구현체 (`src/rules/StandardRules.ts`)
- [x] `Board` 컴포넌트가 `ruleset` prop을 받아 모든 규칙 호출을 위임
- [x] `AVAILABLE_RULESETS` 배열 (`src/rules/index.ts`) — 규칙 추가 시 여기만 수정
- [x] 규칙 선택 카드 UI (`HomeScreen.tsx`)

---

## Phase 3: 변형 규칙 ✅

### 변형 규칙 구현체

| 이름 | 파일 | 상태 |
|------|------|------|
| Chess960 | `src/rules/Chess960Rules.ts` | ✅ |
| Crazyhouse | `src/rules/CrazyhouseRules.ts` | ✅ |
| Fog of War | `src/rules/FogOfWarRules.ts` | ✅ |
| Atomic Chess | `src/rules/AtomicRules.ts` | ✅ |
| 킹 2개 | `src/rules/TwoKingsRules.ts` | ✅ |
| Amazon (커스텀 기물) | `src/rules/AmazonRules.ts` | ✅ |

### 공통 인프라

- [x] `PieceType`에 `'A'` (Amazon) 추가 (`src/core/types.ts`)
- [x] `GameContext`에 `hand?` 필드 추가 (Crazyhouse 패 관리)
- [x] `MoveResult`에 `context?` 필드 추가 (규칙별 컨텍스트 override)
- [x] Amazon 이동 로직 (`MoveValidator.ts` — 퀸+나이트 복합)
- [x] `getUncheckedMoves`, `isAttackedBy`, `findKing` export (변형 규칙 내부 사용)
- [x] `Square`에 `isFogged` prop 및 fog 오버레이 스타일 (`Square.tsx`)
- [x] Crazyhouse 패 패널 및 드롭 모드 (`Board.tsx`)

---

## Phase 4: AI · 기보 · 되돌리기 · FEN ✅

### AI 대전

- [x] Minimax + Alpha-Beta Pruning (`src/ai/engine.ts`)
- [x] Piece-Square Table 기반 정적 평가 함수 (PAWN/KNIGHT/BISHOP/ROOK/QUEEN/KING PST)
- [x] 난이도별 설정
  - 초급: depth 1 + 50% 확률로 랜덤 수 선택
  - 중급: depth 3
  - 고급: depth 4
- [x] AI는 항상 흑 진영, 200ms 지연 후 자동 이동
- [x] AI 프로모션 자동 선택 (퀸)
- [x] 같은 점수 이동 셔플 (매번 다른 수)

### 대전 모드 선택

- [x] `HomeScreen`에 👥 2인 대전 / 🤖 AI 대전 선택 UI
- [x] AI 대전 선택 시 난이도 선택 UI 표시 (초급/중급/고급)
- [x] `App`에서 `aiMode`, `difficulty` 상태 관리 → `Board`로 전달

### 기보 (이동 기록)

- [x] 대수 표기법 생성 (`src/utils/notation.ts`)
  - 캐슬링 O-O / O-O-O, 캡처 x, 폰 파일, 기물 기호, 프로모션 =Q
- [x] `MoveHistory` 컴포넌트 (`src/ui/MoveHistory.tsx`) — 행 = 수 번호 | 백 | 흑
- [x] 최신 수로 자동 스크롤
- [x] 사이드 패널에 기보 표시

### 되돌리기 (Undo)

- [x] 이동 직전 `HistorySnapshot` 저장 (보드, 턴, 컨텍스트, 잡은 기물, posHistory)
- [x] 2인 대전: 1수 되돌리기
- [x] AI 대전: 2수 되돌리기 (내 수 + AI 응수)
- [x] 게임 종료 상태 복구

### FEN

- [x] `boardToFen` 구현 (`src/utils/fen.ts`) — 비표준 기물(Amazon 'A') 포함
- [x] `fenToBoard` 구현 (`src/utils/fen.ts`) — 파싱 실패 시 `null` 반환
- [x] 사이드 패널 FEN 표시 + 클립보드 복사 버튼
- [x] FEN 입력 textarea + 불러오기 버튼 (Enter 키 지원, 오류 메시지 표시)
- [x] FEN 로드 시 보드·턴·캐슬링·앙파상·하프무브클락·풀무브 전체 복원
- [x] `fullMoveBase` 상태로 로드된 FEN의 수 번호 유지 (이후 기보 연속)

---

## Phase 5: 게임 경험 향상

### 체스 시계 (타이머)

- [x] 시간 모드 타입 정의 (`TimeControl`: 블리츠3/블리츠5/래피드10/클래식30/무제한) (`src/core/timeControl.ts`)
- [x] `HomeScreen`에 시간 모드 선택 UI (무제한 기본값)
- [x] `App`에서 `timeControl` 상태 관리 → `Board`로 전달
- [x] `Board`에 플레이어별 타이머 상태 (`whiteTime`, `blackTime`) 및 `setInterval` 기반 카운트다운
- [x] `PlayerPanel`에 남은 시간 표시 (MM:SS 포맷, 10초 이하 빨간색 경고)
- [x] 시간 초과 시 게임 종료 처리 (`gameOver: 'timeout'`)
- [x] 되돌리기 시 소비된 시간도 함께 복원 (snapshot에 포함)
- [ ] 인크리먼트 옵션 (이동 후 N초 추가 — 설정 화면에서 선택)

### 기물 이동 애니메이션

- [x] 이동하는 기물의 절대 위치를 CSS `transform: translate()`로 계산 (`useLayoutEffect` + `getBoundingClientRect`)
- [x] 이동 duration: 150ms (빠르게 유지해 게임 흐름 방해 없도록)
- [x] 드래그 이동 시에는 애니메이션 스킵
- [x] `prefers-reduced-motion` 미디어 쿼리 대응 (접근성)

### 힌트 기능

- [x] `src/utils/hint.ts` — `getHint(board, turn, context, ruleset): { from, to } | null`
- [x] 사이드 패널에 "💡 힌트" 버튼 추가
- [x] 힌트 사용 횟수 상태 (`hintsRemaining`, 기본 3회/게임)
- [x] 추천 칸 하이라이트: `isHintFrom`, `isHintTo` prop → `Square`에 별도 스타일
- [x] 다음 입력(클릭·드래그) 시 힌트 하이라이트 자동 해제
- [x] AI 대전 중(`turn === AI_COLOR`) 및 게임 종료 후 버튼 비활성화

### 플레이어 이름 설정

- [x] `HomeScreen`에 플레이어 이름 입력 필드 2개 (백/흑, placeholder 포함)
- [x] AI 대전 시 흑 입력 필드 숨김, 흑 이름 자동 설정 (`"AI · 초급"` 등)
- [x] `App`에서 `playerNames: { white: string; black: string }` 상태 관리 → `Board`로 전달
- [x] `PlayerPanel`에 이름 표시 (이름 미입력 시 "백"/"흑" 기본값)
- [x] `GameOver` 화면에 승자 이름 표시

### 전적 기록

- [x] `src/utils/records.ts` — localStorage 기반 CRUD (`saveResult`, `getRecords`, `clearRecords`)
- [x] 저장 데이터: `{ white, black, result: 'white'|'black'|'draw', date, ruleset }[]`
- [x] 게임 종료 시 자동 저장 (플레이어 이름이 기본값이 아닌 경우)
- [x] `HomeScreen`에 전적 요약 표시 (최근 5경기)
- [x] 전적 초기화 버튼

### 기보 리플레이

- [x] `GameOver` 화면에 "다시보기" 버튼 추가
- [x] 리플레이 모드 상태 (`replayIndex: number | null`) — null이면 일반 모드
- [x] 리플레이 중 `HistorySnapshot`으로 해당 수의 보드 상태 렌더링 (실제 상태 변경 없음)
- [x] 컨트롤 UI: ⏮ 처음 / ◀ 이전 / ▶/⏸ 자동재생·일시정지 / ▶ 다음 / ⏭ 끝
- [x] 자동재생: 1초/수 간격 setTimeout, 재생 중 일시정지 버튼
- [x] 재생 중인 수를 `MoveHistory` 패널에서 하이라이트
- [x] 리플레이 종료(✕) 버튼으로 현재 게임 화면으로 복귀

---

## Phase 6: 온라인 대전 · Vercel 배포

### Firebase 인프라

- [x] Firebase Realtime Database 연동 (`src/firebase/config.ts` — VITE_FIREBASE_* 환경 변수)
- [x] 익명 플레이어 ID (`src/firebase/identity.ts` — localStorage `chess-player-uid`, 6자리 방 코드 생성기)
- [x] 방 CRUD (`src/firebase/room.ts` — `createRoom`, `joinRoom`, `listenRoom`, `pushMove`, `setRoomGameOver`)
- [x] Firebase Room 문서 타입 정의 (`src/core/onlineTypes.ts` — `RoomDoc`, `SerializedMove`, `OnlineGameProps`)

### 로비 UI

- [x] `OnlineScreen.tsx` — 3단계 상태 머신: setup → creating(대기) / joining(코드 입력)
  - 방 만들기: 방 코드 생성 → Firebase 기록 → 상대 입장 대기 (애니메이션 도트)
  - 방 참가: 6자리 코드 입력 → Firebase 조회 → 즉시 게임 진입
  - Crazyhouse 제외, 나머지 변형 규칙 선택 가능
- [x] `OnlineScreen.module.css` — 방 코드 대형 표시, 복사 버튼, waiting 애니메이션

### 게임 진입

- [x] `HomeScreen`에 "🌐 온라인 대전" 버튼 추가
- [x] `App.tsx`에 `online` / `online-game` 모드, `OnlineInfo` 상태 추가
- [x] `getRulesetByName()` 유틸 (`src/rules/index.ts`) — 방 코드 기반 RuleSet 복원

### Board 온라인 모드 (`src/ui/Board.tsx`)

- [x] `onlineGame?: OnlineGameProps` prop 추가
- [x] Firebase 구독 `useEffect`: 상대 이동 수신 → FEN 파싱 → board/turn/context/captures 업데이트 → 기보 추가 → 효과음
- [x] 게임 종료 `useEffect`: `setRoomGameOver` Firebase 기록 (한 번만)
- [x] 내 이동 후 `pushMove` 호출 (일반 이동 + 프로모션 경로 모두)
- [x] 프로모션: 온라인 모드에서 퀸 자동 선택
- [x] `handlePointerDown` / `handleSquareClick` — 내 색상 차례가 아닐 때 입력 차단
- [x] 되돌리기 비활성화, FEN 불러오기 박스 숨김 (온라인 중)
- [x] 상대 차례 대기 중 "상대 차례" 표시
- [x] `GameOver`에서 온라인 모드 시 새 게임 버튼 숨김 (`onRestart` 미전달)

### 초대 링크 · QR 코드

- [x] `qrcode.react` 패키지 추가
- [x] 공유 링크 생성: `{origin}/?join=방코드` 형태 (`window.location.origin` 기반)
- [x] `OnlineScreen.tsx` 대기 화면에 QR 코드 + 링크 복사 버튼 추가
- [x] `OnlineScreen.tsx` 마운트 시 URL `?join=` 파라미터 감지 → 참가 화면 자동 진입 + 코드 선입력

### 배포

- [x] `vercel.json` — SPA 라우팅 rewrites 설정
- [x] `.env.example` — Firebase 환경 변수 템플릿

---

## Phase 7: 모바일 · 태블릿 대응 ✅

### 반응형 보드 크기 (`--sq` 커스텀 프로퍼티)

- [x] `src/index.css` — `:root { --sq: 72px }` 기본값 정의
  - `@media (max-width: 1000px)`: `clamp(44px, (100vw - 32px) / 8, 72px)`
  - `@media (max-width: 480px)`: `clamp(36px, (100vw - 16px) / 8, 56px)`
- [x] `src/ui/Board.module.css` — `.board` grid `repeat(8, var(--sq))`
- [x] `src/ui/Square.module.css` — `.square` width/height `var(--sq)`
- [x] `src/ui/PlayerPanel.module.css` — `.panel` width `calc(8 * var(--sq))`
- [x] `src/ui/Board.module.css` — `.handPanel` width `calc(8 * var(--sq))`
- [x] `src/ui/Board.module.css` — `.ghost` width/height `var(--sq)`
- [x] `src/ui/Piece.module.css` — font-size `calc(var(--sq) * 0.64)` (비례 축소)
- [x] `src/ui/TutorialBoard.module.css` — grid `repeat(8, var(--sq))`

### 반응형 레이아웃 (`@media (max-width: 1000px)`)

- [x] `.outerLayout` — `flex-direction: column`, 패딩·갭 축소
- [x] `.sidePanel` — `width: calc(8 * var(--sq))`, 보드 아래로 이동
- [x] `.moveHistoryWrapper` — `max-height: 160px` (모바일에서 기보 높이 제한)
- [x] `.btnGroup` — 되돌리기·힌트 버튼 가로 배치, `min-height: 48px` 터치 타겟
- [x] FEN 박스 모바일 기본 접힘 — `.fenToggleBtn` 표시, `.fenContent` 토글

### 드래그 좌표 계산 동적화 (`src/ui/Board.tsx`)

- [x] `SQUARE_SIZE` 상수 제거 → `rect.width / 8`, `rect.height / 8` 동적 계산
- [x] `.board`에 `touch-action: none` (드래그 중 페이지 스크롤 방지)
- [x] `fenExpanded` 상태 추가 → FEN 섹션 모바일 토글 지원

### 홈 화면 · 온라인 로비 반응형

- [x] `HomeScreen.module.css` — 고정 `width: 260px` → `min(260px, calc(100vw - 32px))`
- [x] `OnlineScreen.module.css` — 고정 `width: 320px` → `min(320px, calc(100vw - 32px))`

---

## Phase UI-1: UI/UX 개선 — 기물 이미지 교체

- [x] Lichess cburnett 기물 세트 다운로드 (`public/pieces/cburnett/` — 12개 SVG, CC BY-SA 3.0)
  - `wK wQ wR wB wN wP` / `bK bQ bR bB bN bP`
- [x] `src/ui/Piece.tsx` — 유니코드 심볼 → `<img src="/pieces/cburnett/...">` 교체
  - `data-piece` span 유지 (Board.tsx 드래그 애니메이션 `style.transform` 적용 대상)
  - 크기: `calc(var(--sq) * 0.875)` (Square 칸 대비 87.5%)
  - Amazon 기물: 퀸 SVG + `filter: hue-rotate(180deg) saturate(1.5)` 색조 구분
- [x] `src/ui/PromotionPicker.tsx` — 자체 유니코드 심볼 → `<Piece>` 컴포넌트 재사용
  - `.pieceWrap { --sq: 60px }` 로컬 오버라이드로 크기 제어
  - `.name` 폰트 11px → 13px 개선

---

## Phase UI-2: UI/UX 개선 — 플레이어 패널 & 게임 종료 화면

### 플레이어 패널 개선

- [x] `src/index.css` — 포인트 컬러 CSS 변수 추가 (`--c-point: #4a90d9`, `--c-active-bg`, `--c-active-ring`)
- [x] `src/ui/PlayerPanel.module.css` — 활성 턴 포인트 컬러 테두리 (`border-left: 3px solid var(--c-point)`)
  - 펄싱 애니메이션 색상 파란 글로우(`rgba(74, 144, 217, ...)`)로 통일
  - `.timerWarning` (30~60초: 주황 #e67e22), `.timerLow` (30초 이하: 빨강 #e74c3c + 깜빡임)
- [x] `src/ui/PlayerPanel.tsx` — 잡은 기물 유니코드 → 18×18px SVG `<img>` 교체
  - `isWarningTime` (60s > t > 30s), `isLowTime` (t ≤ 30s) 상태 분기 추가

### 게임 종료 화면 전환

- [x] `src/ui/GameOver.tsx` — 모달 다이얼로그 → 전체 화면 결과 화면으로 전환
  - 승리: 승자 킹 SVG + 골든 제목 `${winnerLabel} 승리!` + 따뜻한 어두운 그라디언트 배경
  - 무승부: 양쪽 킹 SVG (좌우 반전 배치) + 중립 배경
  - 통계 카드: 총 수(`moveCount`) 표시
  - 버튼: 새 게임 (Primary) / 다시보기·홈으로 (Secondary)
  - `moveCount`, `onHome` prop 추가
- [x] `src/ui/Board.tsx` — `GameOver`를 `outerLayout` 밖으로 이동 (viewport 전체 덮음)
  - `moveCount={moveHistory.length}`, `onHome={onExit}` 전달

### 규칙 카드 아이콘

- [x] `src/ui/HomeScreen.tsx` — `RULESET_META` 맵 추가 (규칙명 → `{ icon, color }`)
  - 표준 ♟/#b58863, Chess960 🎲/#5c8fd6, Crazyhouse 🔄/#d4813a, Fog of War 🌁/#6fa8c0, Atomic 💥/#c0392b, 킹 2개 👑/#c9a227, 아마존 ⚡/#9b59b6
  - 선택 시 `borderLeftColor: meta.color` inline style로 규칙별 포인트 컬러 테두리
- [x] `src/ui/HomeScreen.module.css` — `.ruleCardIcon` 추가 (18px), `.ruleCard` left border 3px transparent 추가

### 사이드 패널 FEN 기본 접힘

- [x] `src/ui/Board.module.css` — `.fenContent { display: none }` + `.fenBoxOpen .fenContent { display: block }` 전역 적용
  - 기존: 데스크탑 항상 표시, 모바일만 토글 → 개선: 데스크탑/모바일 모두 기본 접힘
  - `.fenToggleBtn` 데스크탑에서도 항상 표시되도록 `display: inline-flex` 적용

### 폰트 사이즈 통일

- [x] `src/ui/*.css` 10개 모듈 일괄 적용 — `10px/11px → 12px` (캡션/보조 레이블), `13px → 14px` (보조 텍스트)
  - 적용 파일: Board, CapturedModal, GameOver, HomeScreen, MoveHistory, OnlineScreen, PlayerPanel, PromotionPicker, Square, TutorialPanel

### 홈 화면 헤더 기물 일러스트

- [x] `src/ui/HomeScreen.tsx` — 텍스트 ♔ 로고 → 기물 SVG 배너로 교체
  - bR/bN/bK vs wK/wN/wR 나이트 중심 스태거(−8px) 구도
  - 흰 기물은 `scaleX(-1)` 좌우 반전으로 마주 보는 배치
- [x] `src/ui/HomeScreen.module.css` — `.heroBanner`, `.heroPiece`, `.heroPieceFlip`, `.heroVs` 추가

### 버튼 시스템 radius 3단계 표준화

- [x] `src/ui/Board.module.css` — 불일치 radius 정리
  - Ghost/소형 6px: fenToggleBtn(4→6), fenCopyBtn(4→6), fenLoadBtn(5→6), replayExitBtn(5→6), resignYesBtn(5→6), resignNoBtn(5→6)
  - Secondary 8px: replayBtn(7→8), 중복 `background` 제거
- [x] `src/ui/HomeScreen.module.css` — clearBtn 5→6px, primaryBtn 호버 box-shadow 추가

### 색상 토큰 CSS 변수화 — danger 패밀리

- [x] `src/index.css` — `--c-danger` 패밀리 9개 변수 추가 (`:root`)
  - `--c-danger`, `--c-danger-hover`, `--c-danger-border`, `--c-danger-border-hover`
  - `--c-danger-bg`, `--c-danger-bg-strong`, `--c-danger-bg-confirm`, `--c-danger-bg-hover`, `--c-danger-btn-border`
- [x] `src/ui/Board.module.css` — 하드코딩 danger 색상 10곳 → CSS 변수 참조로 교체
