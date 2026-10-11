import type { RuleSet } from './RuleSet';
import { StandardRules } from './StandardRules';
import { getUncheckedMoves, applyMoveToBoard } from '../core/MoveValidator';
import type { BoardState, Color, Piece, PieceType } from '../core/types';
import type { GameContext } from '../core/MoveValidator';

function createTwoKingsBoard(): BoardState {
  // 킹 2개, 퀸 없음 (d·e 파일에 킹 배치)
  const w = (t: PieceType): Piece => ({ type: t, color: 'white' });
  const b = (t: PieceType): Piece => ({ type: t, color: 'black' });
  return [
    [b('R'), b('N'), b('B'), b('K'), b('K'), b('B'), b('N'), b('R')],
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'black' as const })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'white' as const })),
    [w('R'), w('N'), w('B'), w('K'), w('K'), w('B'), w('N'), w('R')],
  ];
}

function countKings(board: BoardState, color: Color): number {
  return board.flat().filter(sq => sq?.type === 'K' && sq.color === color).length;
}

export const TwoKingsRules: RuleSet = {
  name: '킹 2개',
  description: '두 킹을 모두 잡아야 승리',

  createInitialBoard: createTwoKingsBoard,

  createInitialContext() {
    return {
      castlingRights: {
        white: { kingSide: false, queenSide: false },
        black: { kingSide: false, queenSide: false },
      },
      enPassantTarget: null,
    };
  },

  getLegalMoves(board: BoardState, row: number, col: number, context: GameContext) {
    const piece = board[row][col];
    if (!piece) return [];
    // 체크 필터링 없이 의사합법 이동 사용 (킹을 직접 잡는 방식)
    // 단, 이동 후 자신의 킹이 0개가 되는 수는 금지
    const pseudo = getUncheckedMoves(board, row, col, context.enPassantTarget);
    if (countKings(board, piece.color) > 1) return pseudo;
    // 킹이 1개 남은 경우: 그 킹이 위험해지는 수 방지
    return pseudo.filter(([tr, tc]) => {
      const next = applyMoveToBoard(board, [row, col], [tr, tc], context);
      return countKings(next.board, piece.color) > 0;
    });
  },

  applyMove: StandardRules.applyMove,

  getGameStatus(board: BoardState, turn: Color) {
    if (countKings(board, turn) === 0) return 'checkmate';
    return 'playing';
  },

  getAutoPromotion: () => null,
};
