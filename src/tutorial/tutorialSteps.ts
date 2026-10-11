import type { BoardState, Color, PieceType } from '../core/types';
import type { GameContext } from '../core/MoveValidator';
import { createInitialBoard } from '../core/Board';

export interface TutorialTask {
  instruction: string;
  piece: [number, number];
  validDests?: [number, number][];
}

export interface TutorialStep {
  id: string;
  lesson: string;
  title: string;
  description: string;
  board: BoardState;
  turn: Color;
  context: GameContext;
  attentionSquares?: [number, number][];
  task?: TutorialTask;
}

function makeBoard(pieces: Array<[Color, PieceType, number, number]>): BoardState {
  const board: BoardState = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (const [color, type, row, col] of pieces) {
    board[row][col] = { color, type };
  }
  return board;
}

const NO_CASTLE: GameContext = {
  castlingRights: {
    white: { kingSide: false, queenSide: false },
    black: { kingSide: false, queenSide: false },
  },
  enPassantTarget: null,
};

export const tutorialSteps: TutorialStep[] = [
  // ── 1. 보드 소개 ──────────────────────────────────────────────────
  {
    id: 'intro',
    lesson: '시작',
    title: '체스에 오신 것을 환영합니다!',
    description:
      '체스는 8×8 격자 보드 위에서 두 플레이어가 겨루는 전략 게임입니다.\n\n' +
      '흰색(White)이 먼저 이동하며, 상대방의 킹(♔)을 체크메이트 상태로 만들면 이깁니다.\n\n' +
      '각 기물의 이동 방법을 하나씩 배워볼게요!',
    board: createInitialBoard(),
    turn: 'white',
    context: NO_CASTLE,
  },

  // ── 2. 폰 — 전진 ─────────────────────────────────────────────────
  {
    id: 'pawn-move',
    lesson: '폰 (Pawn)',
    title: '폰 — 앞으로 전진!',
    description:
      '폰은 앞으로 한 칸 이동할 수 있습니다.\n처음 이동할 때만 두 칸도 이동할 수 있어요.\n\n' +
      '단, 적 기물을 잡을 때는 앞 대각선으로만 가능합니다.',
    board: makeBoard([
      ['white', 'P', 6, 4],
      ['white', 'K', 7, 4],
      ['black', 'K', 0, 4],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    task: {
      instruction: '폰을 클릭하여 앞으로 이동해 보세요',
      piece: [6, 4],
    },
  },

  // ── 3. 폰 — 잡기 ─────────────────────────────────────────────────
  {
    id: 'pawn-capture',
    lesson: '폰 (Pawn)',
    title: '폰 — 대각선으로 잡기',
    description:
      '폰은 앞 대각선에 있는 적 기물을 잡을 수 있습니다.\n이동 방향과 잡는 방향이 다른 유일한 기물이에요!\n\n' +
      '어느 쪽 폰이든 잡아보세요.',
    board: makeBoard([
      ['white', 'P', 4, 4],
      ['black', 'P', 3, 3],
      ['black', 'P', 3, 5],
      ['white', 'K', 7, 4],
      ['black', 'K', 0, 4],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    task: {
      instruction: '대각선으로 적 폰을 잡아보세요',
      piece: [4, 4],
      validDests: [[3, 3], [3, 5]],
    },
  },

  // ── 4. 룩 ─────────────────────────────────────────────────────────
  {
    id: 'rook',
    lesson: '룩 (Rook)',
    title: '룩 — 직선의 강자',
    description:
      '룩은 가로 또는 세로 방향으로 막힌 곳 없이 원하는 만큼 이동할 수 있습니다.\n\n' +
      '보드 끝까지 한 번에 이동할 수 있는 매우 강력한 기물입니다.',
    board: makeBoard([
      ['white', 'R', 4, 3],
      ['white', 'K', 7, 7],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    task: {
      instruction: '룩을 직선으로 이동해 보세요',
      piece: [4, 3],
    },
  },

  // ── 5. 나이트 ─────────────────────────────────────────────────────
  {
    id: 'knight',
    lesson: '나이트 (Knight)',
    title: '나이트 — 유일한 점프 기물',
    description:
      '나이트는 L자 형태(2칸 + 1칸)로 이동합니다.\n\n' +
      '다른 기물을 뛰어넘을 수 있는 체스의 유일한 기물입니다!\n' +
      '복잡하게 얽힌 상황에서 특히 유용해요.',
    board: makeBoard([
      ['white', 'N', 4, 3],
      ['white', 'K', 7, 7],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    attentionSquares: [[2, 2], [2, 4], [3, 1], [3, 5], [5, 1], [5, 5], [6, 2], [6, 4]],
    task: {
      instruction: '나이트를 L자로 이동해 보세요',
      piece: [4, 3],
    },
  },

  // ── 6. 비숍 ─────────────────────────────────────────────────────
  {
    id: 'bishop',
    lesson: '비숍 (Bishop)',
    title: '비숍 — 대각선의 달인',
    description:
      '비숍은 대각선 방향으로 원하는 만큼 이동할 수 있습니다.\n\n' +
      '비숍은 항상 처음 칸과 같은 색 칸에만 머뭅니다.\n한 팀에 흰 칸 비숍과 검은 칸 비숍이 하나씩 있어요.',
    board: makeBoard([
      ['white', 'B', 4, 3],
      ['white', 'K', 7, 7],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    task: {
      instruction: '비숍을 대각선으로 이동해 보세요',
      piece: [4, 3],
    },
  },

  // ── 7. 퀸 ─────────────────────────────────────────────────────────
  {
    id: 'queen',
    lesson: '퀸 (Queen)',
    title: '퀸 — 가장 강력한 기물',
    description:
      '퀸은 룩과 비숍을 합친 가장 강력한 기물입니다.\n가로, 세로, 대각선 모두 원하는 만큼 이동할 수 있어요.\n\n' +
      '퀸 하나가 보드를 지배할 수 있으니 소중히 다루세요!',
    board: makeBoard([
      ['white', 'Q', 4, 3],
      ['white', 'K', 7, 7],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    task: {
      instruction: '퀸을 원하는 방향으로 이동해 보세요',
      piece: [4, 3],
    },
  },

  // ── 8. 킹 ─────────────────────────────────────────────────────────
  {
    id: 'king',
    lesson: '킹 (King)',
    title: '킹 — 절대 잡히면 안 돼!',
    description:
      '킹은 어느 방향으로든 한 칸씩 이동할 수 있습니다.\n\n' +
      '킹을 잡으면 게임이 끝납니다. 킹을 항상 안전하게 보호하는 것이 체스의 핵심이에요!',
    board: makeBoard([
      ['white', 'K', 4, 4],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    task: {
      instruction: '킹을 한 칸 이동해 보세요',
      piece: [4, 4],
    },
  },

  // ── 9. 체크 ─────────────────────────────────────────────────────
  {
    id: 'check',
    lesson: '체크 (Check)',
    title: '체크 — 위험 신호!',
    description:
      '킹이 적에게 공격받는 상태를 "체크"라고 합니다.\n\n' +
      '체크 상태에서는 반드시 킹을 보호해야 합니다.\n' +
      '다른 이동은 할 수 없어요!\n\n' +
      '아래 흰색 킹이 검은 퀸에게 공격받고 있어요.',
    board: makeBoard([
      ['white', 'K', 7, 4],
      ['black', 'Q', 3, 4],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    attentionSquares: [[3, 4]],
    task: {
      instruction: '킹을 안전한 곳으로 이동하세요',
      piece: [7, 4],
    },
  },

  // ── 10. 체크메이트 (정보용) ─────────────────────────────────────
  {
    id: 'checkmate',
    lesson: '체크메이트',
    title: '체크메이트 — 게임 종료!',
    description:
      '킹이 어디로 가도 계속 공격받아 피할 수 없는 상태를 "체크메이트"라고 합니다.\n\n' +
      '이 상태가 되면 게임이 끝납니다.\n\n' +
      '아래 흰색 킹은 갈 곳이 없습니다. 킹 주위의 세 탈출로가 검은 기물들에 의해 모두 막혀 있어요.',
    board: makeBoard([
      ['white', 'K', 7, 7],
      ['black', 'Q', 5, 5],
      ['black', 'R', 7, 0],
      ['black', 'R', 6, 0],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    attentionSquares: [[7, 7], [5, 5], [7, 0], [6, 0]],
  },

  // ── 11. 캐슬링 ────────────────────────────────────────────────────
  {
    id: 'castling',
    lesson: '특수 이동',
    title: '캐슬링 — 킹과 룩이 함께',
    description:
      '캐슬링은 킹과 룩을 동시에 이동하는 특수 이동입니다.\n킹을 두 칸 이동하면 룩이 자동으로 건너편으로 이동해요.\n\n' +
      '조건: 킹과 룩이 처음 위치에 있고, 사이에 기물이 없어야 합니다.',
    board: makeBoard([
      ['white', 'K', 7, 4],
      ['white', 'R', 7, 7],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: {
      castlingRights: {
        white: { kingSide: true, queenSide: false },
        black: { kingSide: false, queenSide: false },
      },
      enPassantTarget: null,
    },
    attentionSquares: [[7, 5], [7, 6]],
    task: {
      instruction: '킹을 오른쪽으로 두 칸 이동해 캐슬링하세요',
      piece: [7, 4],
      validDests: [[7, 6]],
    },
  },

  // ── 12. 프로모션 ──────────────────────────────────────────────────
  {
    id: 'promotion',
    lesson: '특수 이동',
    title: '프로모션 — 폰의 변신',
    description:
      '폰이 상대방 끝줄에 도달하면 더 강력한 기물로 교체됩니다.\n퀸, 룩, 비숍, 나이트 중 원하는 것으로 바꿀 수 있어요.\n\n' +
      '보통은 가장 강한 퀸으로 교체하는 게 유리합니다!',
    board: makeBoard([
      ['white', 'P', 1, 4],
      ['white', 'K', 7, 4],
      ['black', 'K', 0, 0],
    ]),
    turn: 'white',
    context: NO_CASTLE,
    task: {
      instruction: '폰을 앞으로 이동시켜 프로모션해 보세요',
      piece: [1, 4],
      validDests: [[0, 4]],
    },
  },
];
