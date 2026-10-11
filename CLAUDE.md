# 호호가족의 체스게임 — Claude Context

## Project Overview

웹 기반 체스 게임 **"호호가족의 체스게임"**. 표준 체스 규칙을 기반으로 하되, 다양한 변형 규칙을 쉽게 교체할 수 있는 구조로 설계한다.

## Tech Stack

- **Framework**: React + TypeScript (Vite)
- **State Management**: Zustand
- **Rendering**: HTML/CSS Grid (Canvas/SVG 아님)
- **Chess Logic**: 자체 구현 (chess.js 사용 안 함 — 규칙 변형 유연성 확보를 위해)

## Architecture Principles

### 로직과 규칙의 분리 (핵심 원칙)

규칙 변형이 핵심 요구사항이므로, 게임 로직과 규칙을 반드시 분리한다.

```
src/
├── core/           # 보드 상태, 이동 검증, 게임 엔진 (규칙을 주입받음)
├── rules/          # 표준 규칙 및 변형 규칙 구현체
└── ui/             # 렌더링 컴포넌트
```

### RuleSet 인터페이스

모든 규칙 변형은 `RuleSet` 인터페이스를 구현해야 한다. 새 규칙 추가 시 기존 코어 로직을 수정하지 않는다.

```typescript
interface RuleSet {
  getLegalMoves(board: Board, square: Square): Move[];
  isCheckmate(board: Board, color: Color): boolean;
  onPawnPromote(board: Board, square: Square): Piece;
}
```

## Documentation Rule (필수)

요구사항 문서는 두 파일로 역할이 분리되어 있다. 용도에 맞는 파일을 업데이트해야 한다.

### 두 문서의 역할

| 파일 | 역할 | 업데이트 시점 |
|------|------|--------------|
| `docs/spec.md` | **기획서** — 무엇을 만들 것인가. 기능 범위, UX 요구사항, 우선순위. 체크박스·파일 경로 없음 | 기능 범위나 요구사항이 **변경**될 때 |
| `docs/requirements.md` | **구현 현황** — 어떻게 만들었는가. 기술 결정, 파일 경로, 완료 체크박스 | 기능이 **구현**될 때 |

### 업데이트 규칙

- **새 기능 구현** → `docs/requirements.md`의 해당 Phase에 항목 추가 및 `[x]` 완료 표시
- **기능 범위 변경** (새 Phase, 기획 변경) → `docs/spec.md`(기획서)도 함께 수정
- **두 문서에 동일 내용을 중복 작성하지 않는다** — 기획서엔 파일 경로/기술 세부사항 없음, 구현 현황엔 UX 의도 서술 없음
- 코드 작업과 문서 업데이트는 같은 작업 단위로 처리한다 (나중에 몰아서 하지 않는다)

### README.md 업데이트 규칙

`README.md`는 외부에 공개되는 프로젝트 소개 문서다. 아래 변경이 생기면 코드 작업과 함께 반드시 업데이트한다.

- **새 기능 추가** — "기능" 섹션에 항목 추가 (게임 모드, 변형 규칙, 부가 기능)
- **변형 규칙 추가/제거** — 규칙 표 업데이트
- **기술 스택 변경** — "기술 스택" 섹션 업데이트
- **환경 변수 추가/제거** — "환경 변수" 섹션 업데이트
- **프로젝트 구조 변경** (새 디렉토리 추가 등) — "프로젝트 구조" 섹션 업데이트
- 버그 수정·리팩토링·스타일 변경은 README 업데이트 불필요

## Development Guidelines

- 표준 규칙을 먼저 완전히 구현한 뒤 RuleSet 추상화 진행
- 체크 판단: "이동 후 킹이 공격받는지 검사"하는 방식으로 단순화
- 기물 이미지: 오픈소스 SVG 사용 (Lichess 기물 세트 등 CC 라이선스 확인)
- 1인용(vs AI) 또는 로컬 2인 대전 우선 — 이동 유효성 검사는 클라이언트만으로 충분
- Fog of War처럼 UI 렌더링 로직 자체가 바뀌는 규칙은 RuleSet 외 별도 RenderHook 고려

## Key Complexity Points

- 특수 이동 3가지: 캐슬링, 앙파상, 프로모션
- 체크메이트 vs 스테일메이트 구분
- 핀(Pin)된 기물의 이동 제한
- 변형 규칙마다 승리 조건이 달라질 수 있음

## Related Docs

- **기획서** (기능 범위 및 우선순위): `docs/spec.md`
- **구현 현황** (기술 결정 및 완료 체크리스트): `docs/requirements.md`
