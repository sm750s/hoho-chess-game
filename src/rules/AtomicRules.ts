import type { RuleSet } from './RuleSet';
import { StandardRules } from './StandardRules';
import {
  getLegalMoves,
  applyMoveToBoard,
  findKing,
} from '../core/MoveValidator';
import type { BoardState, Color } from '../core/types';
import type { GameContext } from '../core/MoveValidator';

function hasKing(board: BoardState, color: Color): boolean {
  return board.some(row => row.some(sq => sq?.type === 'K' && sq.color === color));
}

export const AtomicRules: RuleSet = {
  name: 'Atomic',
  description: '기물을 잡으면 주변이 폭발',

  createInitialBoard: StandardRules.createInitialBoard,
  createInitialContext: StandardRules.createInitialContext,

  getLegalMoves(board: BoardState, row: number, col: number, context: GameContext) {
    const piece = board[row][col];
    const moves = getLegalMoves(board, row, col, context);
    // 킹은 폭발에 자멸하므로 캡처 불가
    if (piece?.type === 'K') {
      return moves.filter(([r, c]) => board[r][c] === null);
    }
    // 폭발 후 자신의 킹이 사라지는 수 제외
    return moves.filter(([tr, tc]) => {
      if (board[tr][tc] === null) return true; // 캡처 없음 → 폭발 없음
      const next = applyAtomicMove(board, [row, col], [tr, tc]);
      return hasKing(next, piece!.color);
    });
  },

  applyMove(board: BoardState, from: [number, number], to: [number, number], context: GameContext) {
    const result = applyMoveToBoard(board, from, to, context);
    if (!result.capturedPiece) return result;
    return { ...result, board: applyAtomicMove(board, from, to) };
  },

  getGameStatus(board: BoardState, turn: Color, context: GameContext) {
    // 킹이 폭발했으면 패배
    if (!hasKing(board, turn)) return 'checkmate';
    return StandardRules.getGameStatus(board, turn, context);
  },

  getAutoPromotion: () => null,
};

function applyAtomicMove(board: BoardState, from: [number, number], to: [number, number]): BoardState {
  const result = applyMoveToBoard(board, from, to, {
    castlingRights: { white: { kingSide: false, queenSide: false }, black: { kingSide: false, queenSide: false } },
    enPassantTarget: null,
  });
  const next = result.board.map(r => [...r]);
  const [tr, tc] = to;
  next[tr][tc] = null; // 캡처한 기물도 폭발
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = tr + dr, nc = tc + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = next[nr][nc];
        if (p && p.type !== 'P') next[nr][nc] = null;
      }
    }
  }
  return next;
}

// AtomicRules에서 findKing을 직접 사용하기 위한 re-export (unused var 방지)
void findKing;
