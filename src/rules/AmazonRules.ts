import type { RuleSet } from './RuleSet';
import { StandardRules } from './StandardRules';
import type { BoardState, Piece, PieceType } from '../core/types';

// Amazon (A) = Queen + Knight 이동 능력을 가진 커스텀 기물
function createAmazonBoard(): BoardState {
  const w = (t: PieceType): Piece => ({ type: t, color: 'white' });
  const b = (t: PieceType): Piece => ({ type: t, color: 'black' });
  return [
    [b('R'), b('N'), b('B'), b('A'), b('K'), b('B'), b('N'), b('R')],
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'black' as const })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array.from({ length: 8 }, () => ({ type: 'P' as PieceType, color: 'white' as const })),
    [w('R'), w('N'), w('B'), w('A'), w('K'), w('B'), w('N'), w('R')],
  ];
}

export const AmazonRules: RuleSet = {
  name: '아마존',
  description: '퀸+나이트 이동의 아마존 기물',

  createInitialBoard: createAmazonBoard,
  createInitialContext: StandardRules.createInitialContext,
  getLegalMoves: StandardRules.getLegalMoves,
  applyMove: StandardRules.applyMove,
  getGameStatus: StandardRules.getGameStatus,
  getAutoPromotion: () => null,
};
