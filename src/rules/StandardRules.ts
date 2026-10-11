import type { RuleSet } from './RuleSet';
import { createInitialBoard } from '../core/Board';
import {
  getLegalMoves,
  applyMoveToBoard,
  getGameStatus,
} from '../core/MoveValidator';
import type { Color, PieceType } from '../core/types';

export const StandardRules: RuleSet = {
  name: '표준',
  description: '클래식 체스 규칙',

  createInitialBoard,

  createInitialContext() {
    return {
      castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true },
      },
      enPassantTarget: null,
    };
  },

  getLegalMoves(board, row, col, context) {
    return getLegalMoves(board, row, col, context);
  },

  applyMove(board, from, to, context) {
    return applyMoveToBoard(board, from, to, context);
  },

  getGameStatus(board, turn, context) {
    return getGameStatus(board, turn, context);
  },

  getAutoPromotion(_color: Color): PieceType | null {
    return null;
  },
};
